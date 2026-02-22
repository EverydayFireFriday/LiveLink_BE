#------------------- Builder Stage -------------------#
#------------------- 빌더 단계 -------------------#
# Using a LTS version of Node.js for stability and security
# 안정성과 보안을 위해 Node.js LTS 버전 사용
FROM node:25-alpine AS builder

# Set the working directory
# 작업 디렉토리 설정
WORKDIR /usr/src/app

# Copy package files
# 패키지 파일 복사
COPY package*.json ./

# Install all dependencies (including devDependencies) for building
# 빌드를 위해 모든 종속성 (개발 종속성 포함) 설치
# --no-audit --no-fund: 빌드 시간 단축을 위해 감사 및 펀딩 정보 스킵
RUN npm ci --no-audit --no-fund

# Copy only necessary files for build
# 빌드에 필요한 파일만 복사 (레이어 캐싱 최적화)
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

# Build the TypeScript source code
# TypeScript 소스 코드 빌드
# --max-old-space-size 설정으로 메모리 최적화
RUN npm run build

# Prune development dependencies to keep only production dependencies for the final image
# 최종 이미지를 위해 개발 종속성을 제거하고 프로덕션 종속성만 유지
RUN npm prune --production

#------------------- Production Stage -------------------#
#------------------- 프로덕션 단계 -------------------#
# Use a slim, secure base image for the final stage
# 최종 단계를 위해 슬림하고 안전한 베이스 이미지 사용
FROM node:25-alpine

# Set NODE_ENV to production
# NODE_ENV를 production으로 설정
ENV NODE_ENV=production \
    # Disable npm update check for faster startup
    # 빠른 시작을 위해 npm 업데이트 확인 비활성화
    NO_UPDATE_NOTIFIER=true \
    # Suppress npm funding messages
    # npm 펀딩 메시지 숨김
    NPM_CONFIG_FUND=false

# Set the working directory
# 작업 디렉토리 설정
WORKDIR /usr/src/app

# Install system dependencies and create non-root user in a single layer
# 시스템 종속성 설치 및 non-root 사용자 생성을 단일 레이어로 처리
# - curl: 헬스 체크용
# - dumb-init: 시그널 처리 개선 (graceful shutdown)
# - appgroup/appuser: 보안을 위한 non-root 사용자
RUN apk add --no-cache curl dumb-init && \
    addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Copy dependencies and built application from the builder stage
# 빌더 단계에서 종속성과 빌드된 애플리케이션 복사
# --chown으로 복사와 동시에 소유권 설정 (성능 향상)
COPY --from=builder --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /usr/src/app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /usr/src/app/public ./public
COPY --chown=appuser:appgroup package.json .

# Create logs directory with proper permissions
# 로그 디렉토리 생성 및 권한 설정
RUN mkdir -p dist/logs && chown -R appuser:appgroup dist/logs

# Switch to the non-root user
# non-root 사용자로 전환
USER appuser

# Expose the port the app runs on
# 앱이 실행되는 포트 노출
EXPOSE 3000

# Add healthcheck for container monitoring
# 컨테이너 모니터링을 위한 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health/liveness || exit 1

# Add labels for better container management
# 컨테이너 관리 개선을 위한 레이블 추가
LABEL maintainer="LiveLink Team" \
      version="1.0" \
      description="LiveLink Backend API Server"

# The command to run the application
# 애플리케이션을 실행하는 명령어
# dumb-init: PID 1 문제 해결 및 시그널 처리 개선 (graceful shutdown)
CMD ["dumb-init", "node", "dist/app.js"]
