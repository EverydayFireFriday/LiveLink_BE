# 프로덕션 배포 체크리스트 & 명령어

이 문서는 프로덕션 환경에 stagelives API 서버를 배포하기 위한 체크리스트와 명령어를 제공합니다.

## 1. 배포 전 체크리스트

### 🔐 보안 설정

- [ ] **.env.production 파일 생성 및 설정**
  - `SESSION_SECRET`: 최소 32자 이상의 랜덤 문자열 (`openssl rand -base64 32` 사용)
  - `MONGO_URI`: 프로덕션 MongoDB 연결 문자열 (인증 포함)
  - `REDIS_URL`: 프로덕션 Redis 연결 문자열 (비밀번호 포함)
  - `EMAIL_USER`, `EMAIL_PASS`: 이메일 발송용 자격 증명
  - `ADMIN_EMAILS`: 관리자 이메일 목록 (쉼표로 구분)
  - `FRONTEND_URL`: 프론트엔드 URL (CORS 설정용)
  - OAuth 설정: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, Apple Sign-In 키
  - Firebase FCM 설정 (푸시 알림용)

- [ ] **Rate Limiting 설정 확인**
  - `BRUTE_FORCE_MAX_ATTEMPTS`: 5 (권장)
  - `BRUTE_FORCE_BLOCK_DURATION`: 1800 (30분)
  - `API_LIMIT_STRICT_MAX`: 10-20 (로그인/회원가입)
  - `API_LIMIT_DEFAULT_MAX`: 100 (일반 API)

- [ ] **세션 설정**
  - `SESSION_MAX_AGE_APP`: 2592000000 (앱: 30일)
  - `SESSION_MAX_AGE_WEB`: 86400000 (웹: 1일)
  - `COOKIE_SAMESITE`: "none" (크로스 도메인) 또는 "lax" (동일 도메인)
  - `COOKIE_DOMAIN`: 실제 도메인 설정

### 🌐 인프라 설정

- [ ] **Nginx 구성**
  - `server_name`을 실제 도메인으로 업데이트
  - SSL/TLS 인증서 설정 (Let's Encrypt Certbot 권장)
  - Rate Limiting 및 보안 헤더 설정
  - WebSocket 지원 (Socket.IO용)
  - Reverse Proxy 설정

- [ ] **방화벽 규칙**
  - 80번 포트 (HTTP - 리다이렉트용)
  - 443번 포트 (HTTPS)
  - MongoDB/Redis 포트는 내부 네트워크만 허용

- [ ] **MongoDB 설정**
  - 인증 활성화
  - IP 화이트리스트 설정
  - 백업 전략 수립
  - 인덱스 최적화 확인

- [ ] **Redis 설정**
  - 비밀번호 설정
  - 메모리 제한 설정
  - 영속성 설정 (AOF/RDB)

### 📊 모니터링 설정

- [ ] **Prometheus & Grafana**
  - 대시보드 접근 권한 설정
  - 알람 규칙 설정
  - 데이터 보존 정책 설정

- [ ] **로깅**
  - `LOG_LEVEL=info` 또는 `warn` 설정
  - 로그 로테이션 설정 (winston-daily-rotate-file)
  - 에러 알림 설정

### 🧪 배포 전 테스트

- [ ] **빌드 테스트**
  ```bash
  npm run build
  ```

- [ ] **테스트 실행**
  ```bash
  npm test
  npm run test:coverage
  ```

- [ ] **Lint 검사**
  ```bash
  npm run lint
  ```

- [ ] **환경 변수 검증**
  ```bash
  npm run env:validate:prod
  ```

## 2. Docker Compose를 이용한 빌드 및 배포

이 명령어들은 프로덕션 서버에서 실행해야 합니다.

### 이미지 빌드
다단계 `Dockerfile`을 기반으로 애플리케이션 이미지를 빌드합니다.

```bash
docker-compose -f docker-compose.yml build
```

### 서비스 시작
모든 서비스(app, mongo, redis)를 분리 모드(detached mode)로 시작합니다.

```bash
docker-compose -f docker-compose.yml up -d
```

## 3. 배포 후 확인

### 컨테이너 상태 확인
모든 컨테이너가 정상적으로 실행 중인지 확인합니다.

```bash
docker-compose -f docker-compose.yml ps
```

`app` 서비스의 상태가 `Up`이고, 건강 상태가 `(healthy)`로 표시되는지 확인합니다 (초기 시작 시간 소요 후).

### 로그 확인
시작 또는 작동 중에 오류가 없는지 애플리케이션 로그를 확인합니다.

```bash
# app 서비스의 로그 확인
docker-compose -f docker-compose.yml logs -f app

# 모든 서비스의 로그 확인
docker-compose -f docker-compose.yml logs -f
```

### 헬스체크 엔드포인트 테스트
애플리케이션이 응답하는지 확인하기 위해 liveness probe를 수동으로 테스트합니다.

```bash
curl http://localhost:3000/health/liveness
```

## 4. 애플리케이션 중지

컨테이너를 중지하고 제거하려면:

```bash
docker-compose -f docker-compose.yml down
```

컨테이너를 제거하지 않고 중지하려면:

```bash
docker-compose -f docker-compose.yml stop
```

---

## 5. 배포 후 체크리스트

### ✅ 동작 확인

- [ ] **Health Check**
  ```bash
  curl https://your-domain.com/health/liveness
  curl https://your-domain.com/health/readiness
  ```

- [ ] **API 문서 접속**
  - Swagger UI: `https://your-domain.com/api-docs`

- [ ] **모니터링 대시보드 확인**
  - Grafana: `https://your-domain.com:3001`
  - Prometheus: `https://your-domain.com:9090`

- [ ] **로그 확인**
  ```bash
  docker-compose logs -f app
  ```

### 🔒 보안 검증

- [ ] **SSL/TLS 인증서 검증**
  ```bash
  curl -vI https://your-domain.com
  ```

- [ ] **보안 헤더 확인**
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security
  - X-XSS-Protection

- [ ] **Rate Limiting 테스트**
  - 로그인 시도 제한 테스트
  - API 요청 제한 테스트

- [ ] **인증 테스트**
  - 회원가입/로그인 플로우
  - OAuth 로그인 (Google, Apple)
  - 세션 만료 확인

### 📊 성능 확인

- [ ] **응답 시간 측정**
  ```bash
  ab -n 100 -c 10 https://your-domain.com/health/liveness
  ```

- [ ] **데이터베이스 연결 확인**
  - MongoDB 연결 상태
  - Redis 연결 상태
  - 커넥션 풀 설정 확인

- [ ] **메모리 & CPU 사용량 확인**
  ```bash
  docker stats
  ```

### 🚨 알람 설정

- [ ] **에러 알람**
  - 500 에러 발생 시
  - 데이터베이스 연결 실패 시
  - 메모리 사용량 80% 초과 시

- [ ] **성능 알람**
  - API 응답 시간 > 1초
  - 에러율 > 5%

---

## 6. 롤백 절차

문제 발생 시 이전 버전으로 롤백:

```bash
# 이전 버전 이미지로 롤백
docker-compose down
docker-compose pull <previous-version>
docker-compose up -d

# 또는 Git 태그로 롤백
git checkout <previous-tag>
docker-compose build
docker-compose up -d
```

---

## 7. 정기 유지보수

### 일일 점검
- [ ] 로그 확인 (에러 로그 모니터링)
- [ ] 모니터링 대시보드 확인

### 주간 점검
- [ ] 디스크 사용량 확인
- [ ] 데이터베이스 백업 확인
- [ ] 보안 업데이트 확인

### 월간 점검
- [ ] 의존성 패키지 업데이트 검토
- [ ] 보안 취약점 스캔
- [ ] 성능 최적화 검토

---

## 8. 긴급 연락처

- **DevOps 담당자**: [연락처]
- **백엔드 담당자**: [연락처]
- **인프라 제공업체 지원**: [연락처]

---

## 참고 문서

- [환경 변수 가이드](./ENVIRONMENT_VARIABLES.md)
- [API 레퍼런스](./API_REFERENCE.md)
- [모니터링 가이드](./MONITORING_GUIDE.md)
- [아키텍처 문서](./architecture/README.md)

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0