# 프로덕션 배포 체크리스트 & 명령어

이 문서는 프로덕션 환경에 애플리케이션을 배포하기 위한 빠른 체크리스트와 명령어를 제공합니다.

## 1. 배포 전 체크리스트

- [ ] **.env.production:** 모든 필수 시크릿과 구성을 포함하여 `.env.production` 파일을 생성하고 내용을 채웁니다.
  - `SESSION_SECRET`: 길고, 무작위이며, 고유한 문자열이어야 합니다.
  - `EMAIL_USER`, `EMAIL_PASS`: 애플리케이션 전용 이메일 자격 증명을 설정합니다.
  - `ADMIN_EMAILS`: 관리자 접근 권한이 있는 이메일 주소 목록을 지정합니다.
  - `FRONTEND_URL`: 프로덕션 프론트엔드의 정확한 URL을 설정합니다.

- [ ] **Nginx 구성:** 제공된 `nginx.conf`를 템플릿으로 사용하는 경우, 다음을 확인하세요:
  - `server_name`을 실제 도메인으로 업데이트합니다.
  - SSL 인증서 경로(`ssl_certificate`, `ssl_certificate_key`)가 정확한지 확인합니다. Let's Encrypt 인증서 관리를 위해 Certbot 사용을 강력히 권장합니다.

- [ ] **방화벽:** 서버에서 80번(HTTP) 포트와 443번(HTTPS) 포트가 열려 있는지 확인합니다.

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