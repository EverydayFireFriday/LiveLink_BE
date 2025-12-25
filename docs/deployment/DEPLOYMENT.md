# Deployment Guide

## 🚀 배포 환경 개요

LiveLink Backend는 다음 환경에서 배포할 수 있습니다:
- Docker Container
- Kubernetes (K8s)
- Traditional VM/Server (PM2)
- Cloud Platforms (AWS, GCP, Azure)

---

## 📦 1. Docker Deployment

### 1.1 Dockerfile

프로젝트 루트에 `Dockerfile` 생성:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# 프로덕션 이미지
FROM node:18-alpine

WORKDIR /app

# 빌드된 파일만 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# 비root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health/liveness', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/app.js"]
```

### 1.2 .dockerignore

```
node_modules
npm-debug.log
dist
.env
.env.local
.git
.gitignore
README.md
docs/
logs/
*.log
```

### 1.3 Docker Compose (로컬 테스트용)

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGO_URI: mongodb://mongo:27017/livelink
      REDIS_URL: redis://redis:6379
      SESSION_SECRET: ${SESSION_SECRET}
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASS: ${EMAIL_PASS}
      ADMIN_EMAILS: ${ADMIN_EMAILS}
    depends_on:
      - mongo
      - redis
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  mongo-data:
  redis-data:
```

### 1.4 Docker 빌드 및 실행

```bash
# 이미지 빌드
docker build -t livelink-backend:latest .

# 단일 컨테이너 실행
docker run -d \
  --name livelink-backend \
  -p 3000:3000 \
  -e MONGO_URI=mongodb://host.docker.internal:27017/livelink \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e SESSION_SECRET=your-secret-key \
  livelink-backend:latest

# Docker Compose로 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f app
```

---

## ☸️ 2. Kubernetes Deployment

### 2.1 ConfigMap (환경변수)

`k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: livelink-config
  namespace: production
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  MONGO_URI: "mongodb://mongodb-service:27017/livelink"
  REDIS_URL: "redis://redis-service:6379"
```

### 2.2 Secret (민감 정보)

```bash
# Secret 생성
kubectl create secret generic livelink-secrets \
  --from-literal=SESSION_SECRET=your-super-secret-key \
  --from-literal=EMAIL_USER=noreply@yourdomain.com \
  --from-literal=EMAIL_PASS=your-email-password \
  --from-literal=ADMIN_EMAILS=admin@yourdomain.com \
  -n production
```

### 2.3 Deployment

`k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: livelink-backend
  namespace: production
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
      - name: livelink-backend
        image: your-registry/livelink-backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: livelink-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: livelink-config
              key: PORT
        - name: MONGO_URI
          valueFrom:
            configMapKeyRef:
              name: livelink-config
              key: MONGO_URI
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: livelink-config
              key: REDIS_URL
        - name: SESSION_SECRET
          valueFrom:
            secretKeyRef:
              name: livelink-secrets
              key: SESSION_SECRET
        - name: EMAIL_USER
          valueFrom:
            secretKeyRef:
              name: livelink-secrets
              key: EMAIL_USER
        - name: EMAIL_PASS
          valueFrom:
            secretKeyRef:
              name: livelink-secrets
              key: EMAIL_PASS
        - name: ADMIN_EMAILS
          valueFrom:
            secretKeyRef:
              name: livelink-secrets
              key: ADMIN_EMAILS
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: livelink-backend-service
  namespace: production
spec:
  selector:
    app: livelink-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### 2.4 HorizontalPodAutoscaler (HPA)

`k8s/hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: livelink-backend-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: livelink-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 2.5 Ingress (HTTPS)

`k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: livelink-backend-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: livelink-tls-secret
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: livelink-backend-service
            port:
              number: 80
```

### 2.6 K8s 배포 명령어

```bash
# ConfigMap 생성
kubectl apply -f k8s/configmap.yaml

# Secret 생성 (위 2.2 참고)
kubectl create secret generic livelink-secrets ...

# Deployment 배포
kubectl apply -f k8s/deployment.yaml

# HPA 적용
kubectl apply -f k8s/hpa.yaml

# Ingress 적용
kubectl apply -f k8s/ingress.yaml

# 배포 확인
kubectl get pods -n production
kubectl get svc -n production
kubectl logs -f deployment/livelink-backend -n production
```

---

## 🖥️ 3. PM2 Deployment (Traditional Server)

### 3.1 PM2 설치

```bash
npm install -g pm2
```

### 3.2 ecosystem.config.js

```javascript
module.exports = {
  apps: [
    {
      name: 'livelink-backend',
      script: './dist/app.js',
      instances: 'max', // CPU 코어 수만큼 프로세스 생성
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],
};
```

### 3.3 PM2 실행

```bash
# 빌드
npm run build

# PM2로 실행
pm2 start ecosystem.config.js --env production

# 상태 확인
pm2 status
pm2 logs livelink-backend

# 모니터링
pm2 monit

# 재시작
pm2 restart livelink-backend

# 중지
pm2 stop livelink-backend

# 삭제
pm2 delete livelink-backend
```

### 3.4 PM2 자동 시작 설정

```bash
# Startup 스크립트 생성
pm2 startup

# 현재 PM2 프로세스 저장
pm2 save
```

---

## ☁️ 4. Cloud Platform Deployment

### 4.1 AWS Elastic Beanstalk

`.ebextensions/nodejs.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
```

배포 명령어:

```bash
# EB CLI 설치
pip install awsebcli

# 초기화
eb init

# 배포
eb create livelink-backend-env
eb deploy
```

### 4.2 Google Cloud Run

```bash
# 이미지 빌드 및 푸시
gcloud builds submit --tag gcr.io/PROJECT_ID/livelink-backend

# Cloud Run 배포
gcloud run deploy livelink-backend \
  --image gcr.io/PROJECT_ID/livelink-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,MONGO_URI=..."
```

### 4.3 Azure App Service

```bash
# Azure CLI 로그인
az login

# 리소스 그룹 생성
az group create --name livelink-rg --location eastus

# App Service 플랜 생성
az appservice plan create \
  --name livelink-plan \
  --resource-group livelink-rg \
  --sku B1 \
  --is-linux

# Web App 생성
az webapp create \
  --resource-group livelink-rg \
  --plan livelink-plan \
  --name livelink-backend \
  --runtime "NODE|18-lts"

# 환경변수 설정
az webapp config appsettings set \
  --resource-group livelink-rg \
  --name livelink-backend \
  --settings NODE_ENV=production MONGO_URI=...

# 배포
az webapp deployment source config-zip \
  --resource-group livelink-rg \
  --name livelink-backend \
  --src dist.zip
```

---

## 🔒 5. 프로덕션 체크리스트

### 5.1 보안

- [ ] 환경변수 파일 `.env`는 절대 커밋하지 않음
- [ ] `SESSION_SECRET`은 강력한 랜덤 키 사용 (32자 이상)
- [ ] MongoDB URI에 강력한 비밀번호 설정
- [ ] Redis 비밀번호 설정 및 TLS 활성화
- [ ] HTTPS/TLS 인증서 설정 (Let's Encrypt)
- [ ] CORS 설정 검토 (FRONTEND_URL 정확히 설정)
- [ ] Rate Limiting 활성화 확인
- [ ] Brute Force Protection 활성화 확인
- [ ] `NODE_ENV=production` 설정

### 5.2 성능

- [ ] MongoDB 인덱스 생성 확인
- [ ] Redis 캐싱 활성화
- [ ] Connection Pooling 설정
- [ ] Gzip Compression 활성화
- [ ] Static 파일 CDN 사용

### 5.3 모니터링

- [ ] Health Check 엔드포인트 확인 (`/health`, `/health/readiness`, `/health/liveness`)
- [ ] Prometheus 메트릭 수집 설정 (`/metrics`)
- [ ] 로그 수집 설정 (Winston + 외부 로그 서비스)
- [ ] 에러 트래킹 (Sentry 등)
- [ ] Uptime 모니터링 (UptimeRobot, Pingdom)

### 5.4 백업

- [ ] MongoDB 자동 백업 설정
- [ ] Redis 스냅샷 설정 (선택)
- [ ] 로그 파일 로테이션 설정

---

## 🔄 6. CI/CD Pipeline

### 6.1 GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Build
      run: npm run build

    - name: Build Docker image
      run: docker build -t livelink-backend:${{ github.sha }} .

    - name: Push to Docker Registry
      run: |
        echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
        docker tag livelink-backend:${{ github.sha }} your-registry/livelink-backend:latest
        docker push your-registry/livelink-backend:latest

    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/livelink-backend \
          livelink-backend=your-registry/livelink-backend:latest \
          -n production
```

---

## 🩺 7. 배포 후 확인

### 7.1 Health Check

```bash
# Liveness Probe
curl https://api.yourdomain.com/health/liveness

# Readiness Probe
curl https://api.yourdomain.com/health/readiness

# General Health
curl https://api.yourdomain.com/health
```

### 7.2 로그 확인

```bash
# Docker
docker logs -f livelink-backend

# K8s
kubectl logs -f deployment/livelink-backend -n production

# PM2
pm2 logs livelink-backend
```

### 7.3 성능 테스트

```bash
# Apache Bench
ab -n 1000 -c 100 https://api.yourdomain.com/health

# wrk
wrk -t4 -c100 -d30s https://api.yourdomain.com/concert
```

---

## 🆘 8. Rollback 전략

### 8.1 Docker

```bash
# 이전 이미지로 롤백
docker stop livelink-backend
docker rm livelink-backend
docker run -d --name livelink-backend livelink-backend:previous-tag
```

### 8.2 Kubernetes

```bash
# 이전 버전으로 롤백
kubectl rollout undo deployment/livelink-backend -n production

# 특정 리비전으로 롤백
kubectl rollout undo deployment/livelink-backend --to-revision=2 -n production

# 롤백 이력 확인
kubectl rollout history deployment/livelink-backend -n production
```

### 8.3 PM2

```bash
# 이전 버전 복원 후 재시작
git checkout <previous-commit>
npm run build
pm2 restart livelink-backend
```

---

**Last Updated:** 2025-10-10
**Version:** 1.0.0
