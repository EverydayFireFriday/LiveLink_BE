# 유지보수 모드 및 Swagger 로고 설정 가이드

## 📋 목차

1. [Swagger 로고 설정](#swagger-로고-설정)
2. [유지보수 모드 사용법](#유지보수-모드-사용법)
3. [환경 변수 설정](#환경-변수-설정)
4. [배포 시나리오](#배포-시나리오)

---

## 🎨 Swagger 로고 설정

### 1. 로고 이미지 준비

Swagger API 문서 상단에 로고를 표시하려면 다음 위치에 이미지를 배치하세요:

```
public/
  └── images/
      ├── logo.png          # 일반 모드용 로고
      └── logo-dark.png     # 다크모드용 로고 (선택사항)
```

**권장 이미지 사양:**
- 파일 형식: PNG, SVG (투명 배경 권장)
- 권장 크기: 150x50px (가로x세로)
- 최대 용량: 500KB 이하

### 2. 로고 적용 확인

1. 서버 재시작:
   ```bash
   npm run dev
   # 또는
   npm start
   ```

2. Swagger 페이지 접속:
   ```
   http://localhost:3000/api-docs
   ```

3. 상단에 로고가 표시되는지 확인

### 3. 로고 커스터마이징

로고 크기나 위치를 변경하려면 `src/config/swagger/styles/index.ts` 파일을 수정하세요:

```typescript
.swagger-ui .topbar-wrapper::before {
  width: 150px;        // 로고 너비 조정
  height: 50px;        // 로고 높이 조정
  margin-right: 20px;  // 오른쪽 여백 조정
}
```

---

## 🔧 유지보수 모드 사용법

유지보수 모드가 활성화되면:
- ✅ 헬스체크 엔드포인트(`/health/*`, `/metrics`)는 정상 작동
- ✅ 관리자 IP 화이트리스트는 정상 접근 가능
- 🚫 일반 사용자는 점검 페이지로 리다이렉트
- 🚫 API 요청은 503 Service Unavailable 응답

### 방법 1: 환경 변수 사용 (권장)

#### 활성화
```bash
# .env 파일 수정
MAINTENANCE_MODE=true

# 서버 재시작
pm2 restart app
# 또는
npm run dev
```

#### 비활성화
```bash
# .env 파일 수정
MAINTENANCE_MODE=false

# 서버 재시작
pm2 restart app
```

### 방법 2: 파일 기반 (더 간단)

#### 활성화
```bash
# 프로젝트 루트에서 실행
touch maintenance.lock

# 서버 재시작 필요 없음 (자동 감지)
```

#### 비활성화
```bash
# maintenance.lock 파일 삭제
rm maintenance.lock

# 서버 재시작 필요 없음 (자동 감지)
```

### 방법 3: PM2 환경 변수 (무중단)

```bash
# 활성화
pm2 restart app --update-env --env MAINTENANCE_MODE=true

# 비활성화
pm2 restart app --update-env --env MAINTENANCE_MODE=false
```

---

## ⚙️ 환경 변수 설정

`.env` 파일에 다음 설정을 추가하세요:

```bash
# ==============================================
# 🔧 MAINTENANCE MODE (유지보수 모드)
# ==============================================

# 유지보수 모드 활성화 (true/false)
MAINTENANCE_MODE=false

# 유지보수 모드 중에도 접근 가능한 관리자 IP 주소 (쉼표로 구분)
# 예: 127.0.0.1,::1,192.168.1.100,203.0.113.5
MAINTENANCE_ALLOWED_IPS=127.0.0.1,::1
```

### 관리자 IP 화이트리스트 설정

특정 IP에서만 점검 중에도 서비스에 접근하도록 허용:

```bash
# 로컬호스트만 허용
MAINTENANCE_ALLOWED_IPS=127.0.0.1,::1

# 회사 네트워크 허용
MAINTENANCE_ALLOWED_IPS=127.0.0.1,::1,192.168.1.0/24

# 특정 관리자 IP 허용
MAINTENANCE_ALLOWED_IPS=127.0.0.1,::1,203.0.113.5,198.51.100.10
```

---

## 🚀 배포 시나리오

### 시나리오 1: 긴급 점검 (즉시 차단)

```bash
# 1. 유지보수 모드 활성화
touch maintenance.lock

# 2. 점검 작업 수행
npm run migrate
npm run build

# 3. 서버 재시작
pm2 restart app

# 4. 유지보수 모드 비활성화
rm maintenance.lock
```

### 시나리오 2: 계획된 배포

```bash
#!/bin/bash
# deploy-with-maintenance.sh

echo "🔧 Enabling maintenance mode..."
export MAINTENANCE_MODE=true
pm2 restart app

echo "⏳ Waiting 10 seconds for active requests to complete..."
sleep 10

echo "📦 Pulling latest code..."
git pull origin main

echo "📥 Installing dependencies..."
npm install

echo "🏗️ Building application..."
npm run build

echo "🗄️ Running database migrations..."
npm run migrate

echo "🚀 Restarting application..."
pm2 restart app

echo "⏳ Waiting for application to stabilize..."
sleep 5

echo "✅ Disabling maintenance mode..."
export MAINTENANCE_MODE=false
pm2 restart app

echo "🎉 Deployment completed successfully!"
```

### 시나리오 3: 무중단 배포 (PM2 Cluster)

```bash
# ecosystem.config.js에 설정
module.exports = {
  apps: [{
    name: 'stagelives-api',
    script: './dist/app.js',
    instances: 4,
    exec_mode: 'cluster',
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,
    env: {
      NODE_ENV: 'production',
      MAINTENANCE_MODE: 'false'
    }
  }]
}

# 배포 스크립트
pm2 reload ecosystem.config.js --update-env
```

---

## 🎨 점검 페이지 커스터마이징

점검 페이지를 수정하려면 `public/maintenance.html` 파일을 편집하세요.

### 예상 완료 시간 설정

JavaScript로 동적으로 완료 시간을 설정할 수 있습니다:

```html
<script>
  // 특정 시간 설정
  window.MAINTENANCE_END_TIME = '2025-10-20T18:00:00+09:00';
</script>
```

### 스타일 변경

CSS를 수정하여 디자인을 변경할 수 있습니다:

```css
body {
  /* 배경 그라디언트 변경 */
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}
```

---

## 📊 모니터링

### 헬스체크 엔드포인트

유지보수 모드에서도 다음 엔드포인트는 정상 작동합니다:

- `GET /health` - 일반 헬스체크
- `GET /health/liveness` - K8s Liveness Probe
- `GET /health/readiness` - K8s Readiness Probe
- `GET /metrics` - Prometheus 메트릭

### 로그 확인

유지보수 모드 활동은 로그에 기록됩니다:

```bash
# 실시간 로그 확인
pm2 logs app

# 특정 로그 파일 확인
tail -f logs/app.log | grep "Maintenance mode"
```

로그 예시:
```
[INFO] Maintenance mode: Blocked request from 192.168.1.100 { path: '/api/users', method: 'GET' }
[INFO] Maintenance mode: Allowed IP 127.0.0.1 accessed { path: '/api/admin', method: 'POST' }
```

---

## 🔍 트러블슈팅

### 문제 1: 점검 페이지가 표시되지 않음

**원인:** 정적 파일 서빙 경로 오류

**해결:**
```bash
# public 폴더 확인
ls -la public/maintenance.html

# 서버 재시작
pm2 restart app
```

### 문제 2: 관리자 IP가 차단됨

**원인:** IP 주소 형식 오류 또는 프록시 설정

**해결:**
```bash
# 1. 실제 클라이언트 IP 확인
curl http://api.your-domain.com/health

# 2. .env에 올바른 IP 추가
MAINTENANCE_ALLOWED_IPS=127.0.0.1,::1,YOUR_ACTUAL_IP

# 3. app.ts의 trust proxy 설정 확인
app.set('trust proxy', 1);
```

### 문제 3: maintenance.lock 파일이 작동하지 않음

**원인:** 파일 권한 또는 경로 문제

**해결:**
```bash
# 1. 올바른 위치에 파일 생성
cd /path/to/project/root
touch maintenance.lock

# 2. 파일 권한 확인
ls -la maintenance.lock

# 3. 서버 재시작 (필요시)
pm2 restart app
```

---

## 📚 참고 자료

- [Swagger UI Customization](https://swagger.io/docs/open-source-tools/swagger-ui/customization/)
- [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [PM2 Process Management](https://pm2.keymetrics.io/docs/usage/process-management/)

---

## ❓ 문의

기술 지원이 필요하시면:
- 이메일: dev@stagelives.com
- 이슈 트래커: GitHub Issues
- 문서: [프로젝트 Wiki](./README.md)
