# Docker 빠른 시작 가이드

LiveLink Backend를 Docker로 5분 안에 실행하는 방법입니다.

## 🚀 빠른 시작 (3단계)

### 1단계: 환경 변수 설정

```bash
# .env.example을 복사하여 .env.production 생성
cp .env.example .env.production

# 필수 환경 변수 수정 (에디터로 열기)
vim .env.production
```

**최소한 다음 값들을 변경하세요:**

```bash
# MongoDB 비밀번호
MONGO_ROOT_PASSWORD=강력한-비밀번호

# Redis 비밀번호
REDIS_PASSWORD=강력한-비밀번호

# JWT 시크릿 (32자 이상)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# MongoDB URI (위에서 설정한 비밀번호 사용)
MONGODB_URI=mongodb://admin:강력한-비밀번호@mongo:27017/livelink?authSource=admin
REDIS_URL=redis://:강력한-비밀번호@redis:6379
```

### 2단계: Docker Compose 실행

```bash
# 모든 서비스 시작 (백그라운드)
docker-compose up -d

# 로그 확인
docker-compose logs -f app
```

### 3단계: 확인

```bash
# 헬스체크
curl http://localhost:3000/health/liveness

# 응답 예시:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

축하합니다! 🎉 LiveLink Backend가 실행 중입니다.

---

## 📋 서비스 접속 정보

| 서비스 | URL | 설명 |
|--------|-----|------|
| **Backend API** | http://localhost:3000 | 메인 API 서버 |
| **MongoDB** | mongodb://localhost:27017 | 데이터베이스 |
| **Redis** | redis://localhost:6379 | 캐시 서버 |
| **Prometheus** | http://localhost:9090 | 메트릭 수집 |
| **Grafana** | http://localhost:3001 | 모니터링 대시보드 |

### Grafana 로그인

- **URL**: http://localhost:3001
- **ID**: admin
- **비밀번호**: `.env.production`의 `GRAFANA_ADMIN_PASSWORD`

---

## 🔧 기본 명령어

### 서비스 관리

```bash
# 서비스 시작
docker-compose up -d

# 서비스 중지
docker-compose stop

# 서비스 재시작
docker-compose restart app

# 서비스 완전 삭제 (데이터 유지)
docker-compose down

# 서비스 완전 삭제 (데이터 포함)
docker-compose down -v
```

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스만
docker-compose logs -f app
docker-compose logs -f mongo
docker-compose logs -f redis

# 최근 100줄만
docker-compose logs --tail=100 app
```

### 컨테이너 상태 확인

```bash
# 실행 중인 컨테이너
docker-compose ps

# 리소스 사용량
docker-compose stats

# 특정 컨테이너 상세 정보
docker inspect livelink-backend
```

---

## 🛠️ 문제 해결

### 문제 1: 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose logs app

# 일반적인 원인:
# - 환경 변수 누락
# - 포트 충돌 (3000, 27017, 6379)
# - MongoDB/Redis 연결 실패
```

**해결 방법:**

```bash
# 포트 사용 확인
lsof -i :3000
lsof -i :27017
lsof -i :6379

# 기존 프로세스 종료 후 재시작
docker-compose down
docker-compose up -d
```

### 문제 2: MongoDB 연결 실패

```bash
# MongoDB 헬스체크
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"

# MongoDB 로그 확인
docker-compose logs mongo
```

**해결 방법:**

```bash
# MongoDB 비밀번호 확인
# .env.production의 MONGO_ROOT_PASSWORD와 MONGODB_URI가 일치하는지 확인

# 컨테이너 재시작
docker-compose restart mongo app
```

### 문제 3: Redis 연결 실패

```bash
# Redis 연결 테스트
docker-compose exec redis redis-cli -a "your-password" ping

# Redis 로그 확인
docker-compose logs redis
```

**해결 방법:**

```bash
# Redis 비밀번호 확인
# .env.production의 REDIS_PASSWORD와 REDIS_URL이 일치하는지 확인

# 컨테이너 재시작
docker-compose restart redis app
```

---

## 🔄 업데이트 방법

### 최신 이미지로 업데이트

```bash
# 이미지 다운로드
docker-compose pull

# 컨테이너 재생성 (다운타임 발생)
docker-compose up -d --force-recreate

# 또는 무중단 업데이트
docker-compose up -d --no-deps --build app
```

### 로컬 빌드로 업데이트

```bash
# Dockerfile 수정 후
docker-compose build app

# 빌드 및 재시작
docker-compose up -d --build app
```

---

## 🧹 정리 및 유지보수

### 디스크 공간 정리

```bash
# 사용하지 않는 이미지 삭제
docker image prune -a

# 사용하지 않는 볼륨 삭제 (주의!)
docker volume prune

# 모든 미사용 리소스 삭제
docker system prune -a --volumes
```

### 로그 크기 제한

`docker-compose.yml`에 추가:

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 📊 모니터링

### Prometheus 메트릭 확인

```bash
# Prometheus UI 접속
open http://localhost:9090

# 쿼리 예시:
# - process_cpu_seconds_total
# - nodejs_heap_size_total_bytes
# - http_request_duration_seconds
```

### Grafana 대시보드

```bash
# Grafana 접속
open http://localhost:3001

# 기본 대시보드:
# - Node.js Application Metrics
# - MongoDB Metrics
# - Redis Metrics
```

---

## 🔒 보안 권장사항

### 1. 시크릿 변경

```bash
# 강력한 랜덤 문자열 생성
openssl rand -base64 32

# .env.production에 적용
JWT_SECRET=<생성된-문자열>
JWT_REFRESH_SECRET=<생성된-문자열>
MONGO_ROOT_PASSWORD=<생성된-문자열>
REDIS_PASSWORD=<생성된-문자열>
```

### 2. 포트 바인딩 제한

프로덕션에서는 필요한 포트만 외부에 노출:

```yaml
# docker-compose.yml
services:
  app:
    ports:
      - "3000:3000"  # API만 외부 노출

  mongo:
    ports:
      - "127.0.0.1:27017:27017"  # 로컬만 접근 가능

  redis:
    ports:
      - "127.0.0.1:6379:6379"  # 로컬만 접근 가능
```

### 3. 파일 권한 확인

```bash
# .env 파일 권한 제한
chmod 600 .env.production

# 소유자만 읽기/쓰기 가능하도록 설정
```

---

## 🚀 프로덕션 배포

프로덕션 환경 배포를 위해서는 다음 문서를 참고하세요:

- [Docker 상세 가이드](./DOCKER_GUIDE.md)
- [프로덕션 배포 가이드](./DEPLOYMENT_GUIDE.md)
- [CI/CD 설정](./CICD_SETUP.md)

---

## 📞 도움말

### 자주 묻는 질문

**Q: docker-compose.yml을 수정해야 하나요?**
A: 대부분 `.env.production` 파일만 수정하면 됩니다. docker-compose.yml은 그대로 사용하세요.

**Q: 데이터를 백업하려면?**
A: MongoDB와 Redis 볼륨을 백업하세요:
```bash
docker run --rm -v livelink_be_mongo-data:/data -v $(pwd):/backup alpine tar czf /backup/mongo-backup.tar.gz /data
```

**Q: 개발 환경에서 사용할 수 있나요?**
A: 네, `.env.production` 대신 `.env.development`를 만들어 사용하세요.

**Q: 모니터링 없이 가볍게 실행하려면?**
A: 필요한 서비스만 시작:
```bash
docker-compose up -d app mongo redis
```

### 추가 도움말

- GitHub Issues: [문제 보고](https://github.com/your-org/livelink/issues)
- 팀 문의: support@livelink.com
- Slack: #livelink-support
