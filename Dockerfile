#------------------- Builder Stage -------------------#
#------------------- 빌더 단계 -------------------#
# Using a specific version of Node.js for reproducibility
# 재현성을 위해 특정 버전의 Node.js 사용
FROM node:18-alpine AS builder

# Set the working directory
# 작업 디렉토리 설정
WORKDIR /usr/src/app

# Copy package files
# 패키지 파일 복사
COPY package*.json ./

# Install all dependencies (including devDependencies) for building
# 빌드를 위해 모든 종속성 (개발 종속성 포함) 설치
RUN npm ci

# Copy the rest of the application source code
# 나머지 애플리케이션 소스 코드 복사
COPY . .

# Build the TypeScript source code
# TypeScript 소스 코드 빌드
RUN npm run build

# Prune development dependencies to keep only production dependencies for the final image
# 최종 이미지를 위해 개발 종속성을 제거하고 프로덕션 종속성만 유지
RUN npm prune --production

#------------------- Production Stage -------------------#
#------------------- 프로덕션 단계 -------------------#
# Use a slim, secure base image for the final stage
# 최종 단계를 위해 슬림하고 안전한 베이스 이미지 사용
FROM node:18-alpine

# Set NODE_ENV to production
# NODE_ENV를 production으로 설정
ENV NODE_ENV=production

# Set the working directory
# 작업 디렉토리 설정
WORKDIR /usr/src/app

# Install curl for health checks
# 헬스 체크를 위해 curl 설치
RUN apk add --no-cache curl

# Create a non-root user and group for security
# -S: create a system user
# -G: add user to a group
# 보안을 위해 non-root 사용자와 그룹 생성
# -S: 시스템 사용자 생성
# -G: 사용자를 그룹에 추가
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependencies and built application from the builder stage
# 빌더 단계에서 종속성과 빌드된 애플리케이션 복사
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/public ./public
COPY package.json .

# Create and set permissions for the logs directory where the application expects to write
# The appuser needs to be able to write logs
RUN mkdir -p dist/logs && chown -R appuser:appgroup dist/logs

# Switch to the non-root user
# non-root 사용자로 전환
USER appuser

# Expose the port the app runs on
# 앱이 실행되는 포트 노출
EXPOSE 3000

# The command to run the application
# 애플리케이션을 실행하는 명령어
CMD ["node", "dist/app.js"]
