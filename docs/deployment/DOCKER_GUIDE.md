# Docker 배포 가이드

LiveLink Backend를 Docker를 사용하여 배포하는 방법을 설명합니다.

## 목차

- [사전 요구사항](#사전-요구사항)
- [Docker 이미지 빌드](#docker-이미지-빌드)
- [Docker 컨테이너 실행](#docker-컨테이너-실행)
- [Docker Compose 사용](#docker-compose-사용)
- [프로덕션 배포](#프로덕션-배포)
- [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### 필수 소프트웨어

- **Docker**: 20.10 이상
- **Docker Compose**: 2.0 이상 (선택사항)

### 설치 확인

```bash
docker --version
# Docker version 20.10.x 이상

docker-compose --version
# Docker Compose version 2.x.x 이상
```

---

## Docker 이미지 빌드

### 1. 기본 빌드

```bash
# 프로젝트 루트 디렉토리에서 실행
docker build -t livelink-backend:latest .
```

### 2. 태그와 함께 빌드

```bash
# 버전 태그 지정
docker build -t livelink-backend:1.0.0 .

# 여러 태그 지정
docker build \
  -t livelink-backend:latest \
  -t livelink-backend:1.0.0 \
  .
```

### 3. 빌드 인수 사용

```bash
# 특정 Node 버전 지정
docker build \
  --build-arg NODE_VERSION=25-alpine \
  -t livelink-backend:latest \
  .
```

### 4. 빌드 캐시 없이 빌드

```bash
# 완전히 새로운 빌드 (문제 해결 시 유용)
docker build --no-cache -t livelink-backend:latest .
```

---

## Docker 컨테이너 실행

### 1. 기본 실행

```bash
docker run -d \
  --name livelink-backend \
  -p 3000:3000 \
  livelink-backend:latest
```

### 2. 환경 변수 설정

#### 방법 1: 직접 지정

```bash
docker run -d \
  --name livelink-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e MONGODB_URI="mongodb://mongodb:27017/livelink" \
  -e REDIS_URL="redis://redis:6379" \
  -e JWT_SECRET="your-secret-key" \
  livelink-backend:latest
```

#### 방법 2: .env 파일 사용

```bash
# .env.production 파일 생성
docker run -d \
  --name livelink-backend \
  -p 3000:3000 \
  --env-file .env.production \
  livelink-backend:latest
```

### 3. 볼륨 마운트

```bash
# 로그 디렉토리 마운트
docker run -d \
  --name livelink-backend \
  -p 3000:3000 \
  -v $(pwd)/logs:/usr/src/app/dist/logs \
  --env-file .env.production \
  livelink-backend:latest
```

### 4. 네트워크 설정

```bash
# 커스텀 네트워크 생성
docker network create livelink-network

# 네트워크에 컨테이너 연결
docker run -d \
  --name livelink-backend \
  --network livelink-network \
  -p 3000:3000 \
  --env-file .env.production \
  livelink-backend:latest
```

---

## Docker Compose 사용

### 1. docker-compose.yml 생성

프로젝트 루트에 `docker-compose.yml` 파일을 생성합니다:

```yaml
version: '3.8'

services:
  # MongoDB
  mongodb:
    image: mongo:7.0
    container_name: livelink-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_PASSWORD}
      MONGO_INITDB_DATABASE: livelink
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    networks:
      - livelink-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/livelink --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: livelink-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - livelink-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    image: livelink-backend:latest
    container_name: livelink-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      MONGODB_URI: mongodb://admin:${MONGODB_PASSWORD}@mongodb:27017/livelink?authSource=admin
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      AWS_REGION: ${AWS_REGION}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      S3_BUCKET_NAME: ${S3_BUCKET_NAME}
      FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID}
    volumes:
      - ./logs:/usr/src/app/dist/logs
      - ./public:/usr/src/app/public:ro
    networks:
      - livelink-network
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/liveness"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  livelink-network:
    driver: bridge

volumes:
  mongodb_data:
    driver: local
  mongodb_config:
    driver: local
  redis_data:
    driver: local
```

### 2. .env 파일 생성

```bash
# .env.example을 복사하여 프로덕션 환경 변수 파일 생성
cp .env.example .env.production
```

`.env.production` 파일에 환경 변수를 설정합니다:

```bash
# MongoDB
MONGODB_PASSWORD=your-mongodb-password

# Redis
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-jwt-secret-key-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-here

# AWS
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-bucket-name

# Firebase
FIREBASE_PROJECT_ID=your-project-id
```

### 3. Docker Compose 명령어

```bash
# 서비스 시작 (백그라운드)
docker-compose up -d

# 서비스 시작 (로그 확인)
docker-compose up

# 특정 서비스만 시작
docker-compose up -d backend

# 빌드와 함께 시작
docker-compose up -d --build

# 로그 확인
docker-compose logs -f backend

# 서비스 중지
docker-compose stop

# 서비스 중지 및 컨테이너 삭제
docker-compose down

# 볼륨까지 삭제
docker-compose down -v

# 서비스 재시작
docker-compose restart backend

# 실행 중인 컨테이너 확인
docker-compose ps

# 리소스 사용량 확인
docker-compose stats
```

---

## 프로덕션 배포

### 1. 멀티 스테이지 빌드 활용

현재 Dockerfile은 이미 멀티 스테이지 빌드를 사용하여 최적화되어 있습니다:

- **Builder Stage**: 의존성 설치 및 TypeScript 빌드
- **Production Stage**: 프로덕션 런타임만 포함

### 2. 프로덕션 환경 변수 설정

`.env.production` 파일 예시:

```bash
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://user:pass@mongodb:27017/livelink?authSource=admin
REDIS_URL=redis://:password@redis:6379

# Security
JWT_SECRET=<strong-secret-key>
JWT_REFRESH_SECRET=<strong-refresh-secret-key>

# AWS
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET_NAME=<your-bucket>

# FCM
FIREBASE_PROJECT_ID=<your-project-id>

# Logging
LOG_LEVEL=info

# Performance
MAX_REQUEST_SIZE=10mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Docker Registry에 이미지 푸시

```bash
# Docker Hub
docker login
docker tag livelink-backend:latest username/livelink-backend:latest
docker push username/livelink-backend:latest

# AWS ECR
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com

docker tag livelink-backend:latest \
  <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/livelink-backend:latest

docker push <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/livelink-backend:latest
```

### 4. Kubernetes 배포 (선택사항)

`k8s/deployment.yaml` 예시:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: livelink-backend
  labels:
    app: livelink-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: livelink-backend
  template:
    metadata:
      labels:
        app: livelink-backend
    spec:
      containers:
      - name: backend
        image: livelink-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        envFrom:
        - secretRef:
            name: livelink-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: livelink-backend
spec:
  selector:
    app: livelink-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## 유용한 Docker 명령어

### 컨테이너 관리

```bash
# 실행 중인 컨테이너 확인
docker ps

# 모든 컨테이너 확인 (중지된 것 포함)
docker ps -a

# 컨테이너 중지
docker stop livelink-backend

# 컨테이너 시작
docker start livelink-backend

# 컨테이너 재시작
docker restart livelink-backend

# 컨테이너 삭제
docker rm livelink-backend

# 컨테이너 로그 확인
docker logs -f livelink-backend

# 컨테이너 내부 접속
docker exec -it livelink-backend sh

# 컨테이너 리소스 사용량
docker stats livelink-backend
```

### 이미지 관리

```bash
# 이미지 목록
docker images

# 이미지 삭제
docker rmi livelink-backend:latest

# 사용하지 않는 이미지 정리
docker image prune

# 모든 사용하지 않는 리소스 정리
docker system prune -a
```

### 네트워크 관리

```bash
# 네트워크 목록
docker network ls

# 네트워크 상세 정보
docker network inspect livelink-network

# 네트워크 생성
docker network create livelink-network

# 네트워크 삭제
docker network rm livelink-network
```

### 볼륨 관리

```bash
# 볼륨 목록
docker volume ls

# 볼륨 상세 정보
docker volume inspect mongodb_data

# 볼륨 생성
docker volume create logs_data

# 볼륨 삭제
docker volume rm logs_data

# 사용하지 않는 볼륨 정리
docker volume prune
```

---

## 트러블슈팅

### 1. 컨테이너가 시작되지 않음

```bash
# 컨테이너 로그 확인
docker logs livelink-backend

# 상세 정보 확인
docker inspect livelink-backend

# 이벤트 확인
docker events
```

### 2. 환경 변수 문제

```bash
# 컨테이너 내부 환경 변수 확인
docker exec livelink-backend env

# 특정 환경 변수 확인
docker exec livelink-backend printenv MONGODB_URI
```

### 3. 네트워크 연결 문제

```bash
# 컨테이너 네트워크 정보 확인
docker inspect livelink-backend | grep -A 20 NetworkSettings

# MongoDB 연결 테스트
docker exec livelink-backend sh -c "curl -v mongodb:27017"

# Redis 연결 테스트
docker exec livelink-backend sh -c "nc -zv redis 6379"
```

### 4. 포트 바인딩 문제

```bash
# 포트 사용 확인
lsof -i :3000

# 다른 포트로 실행
docker run -d -p 3001:3000 livelink-backend:latest
```

### 5. 빌드 실패

```bash
# 빌드 로그 상세 확인
docker build --progress=plain -t livelink-backend:latest .

# 캐시 없이 빌드
docker build --no-cache -t livelink-backend:latest .

# 특정 단계까지만 빌드
docker build --target builder -t livelink-backend:builder .
```

### 6. 메모리/CPU 제한

```bash
# 메모리 제한과 함께 실행
docker run -d \
  --name livelink-backend \
  --memory="1g" \
  --cpus="1.0" \
  -p 3000:3000 \
  livelink-backend:latest
```

### 7. 헬스체크 실패

```bash
# 헬스체크 상태 확인
docker inspect livelink-backend | grep -A 10 Health

# 수동으로 헬스체크 엔드포인트 테스트
docker exec livelink-backend curl -f http://localhost:3000/health/liveness
```

---

## 성능 최적화 팁

### 1. 이미지 크기 최적화

현재 Dockerfile은 이미 다음과 같이 최적화되어 있습니다:

- ✅ 멀티 스테이지 빌드 사용
- ✅ Alpine Linux 베이스 이미지
- ✅ 프로덕션 의존성만 포함
- ✅ .dockerignore로 불필요한 파일 제외

### 2. 빌드 캐싱 활용

```bash
# BuildKit 활성화 (더 나은 캐싱)
export DOCKER_BUILDKIT=1
docker build -t livelink-backend:latest .
```

### 3. 레이어 캐싱 최적화

Dockerfile은 이미 의존성 설치와 소스 복사를 분리하여 레이어 캐싱을 최적화했습니다:

```dockerfile
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
```

### 4. 리소스 제한 설정

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 보안 권장사항

### 1. Non-root 사용자

✅ 현재 Dockerfile은 이미 non-root 사용자(`appuser`)를 사용합니다.

### 2. 시크릿 관리

```bash
# Docker Secrets 사용 (Swarm 모드)
echo "your-secret-value" | docker secret create jwt_secret -

# Kubernetes Secrets 사용
kubectl create secret generic livelink-secrets \
  --from-literal=JWT_SECRET=your-secret-key \
  --from-literal=MONGODB_PASSWORD=your-db-password
```

### 3. 이미지 스캔

```bash
# Docker Hub 보안 스캔
docker scan livelink-backend:latest

# Trivy 사용
trivy image livelink-backend:latest
```

### 4. 읽기 전용 루트 파일시스템

```yaml
services:
  backend:
    read_only: true
    tmpfs:
      - /tmp
      - /usr/src/app/dist/logs
```

---

## 참고 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Node.js Docker 베스트 프랙티스](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [프로젝트 배포 가이드](./DEPLOYMENT_GUIDE.md)
- [CI/CD 설정 가이드](./CICD_SETUP.md)

---

## 문의 및 지원

문제가 발생하거나 추가 도움이 필요한 경우:

- GitHub Issues: [프로젝트 저장소 이슈](https://github.com/your-org/livelink/issues)
- 팀 채널: Slack #livelink-support
- 이메일: support@livelink.com
