# stagelives API Server

<p align="center">
  <strong>공연 정보, 커뮤니티, 그리고 실시간 소통을 하나로.</strong><br/>
  TypeScript, Express.js, MongoDB 기반의 확장 가능하고 안전한 백엔드 API 서버입니다.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20_LTS-green.svg" alt="Node.js version">
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/Framework-Express.js-lightgrey.svg" alt="Express.js">
  <img src="https://img.shields.io/badge/Database-MongoDB-green.svg" alt="MongoDB">
  <img src="https://img.shields.io/badge/Cache-Redis-red.svg" alt="Redis">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
</p>

---

## 📋 목차

- [주요 기능](#-주요-기능)
- [기술 스택](#️-기술-스택)
- [빠른 시작](#-빠른-시작)
- [개발 환경 설정](#-개발-환경-설정)
- [프로젝트 구조](#-프로젝트-구조)
- [API 문서](#-api-문서)
- [보안](#️-보안)
- [테스트](#-테스트)
- [배포](#-배포)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## ✨ 주요 기능

### 🔐 사용자 인증
- 세션 기반 안전한 인증 시스템
- 소셜 로그인 (Google OAuth, Apple Sign-In)
- 플랫폼별 세션 관리 (웹 1개 + 앱 1개)
- 브루트포스 공격 방지

### ✍️ 커뮤니티
- 게시글 작성 및 관리 (CRUD)
- 좋아요, 북마크, 댓글 시스템
- 카테고리 및 태그 기반 검색

### 🎤 공연 정보
- 공연 검색 및 필터링
- 좋아요 및 알림 기능
- 세트리스트 (YouTube/Spotify 통합)
- 자동 상태 업데이트

### 💬 실시간 채팅
- Socket.IO 기반 실시간 통신
- 1:1 및 그룹 채팅
- 메시지 수정/삭제

### 🔔 푸시 알림
- Firebase Cloud Messaging (FCM)
- 티켓 오픈 알림
- 공연 시작 알림
- 디바이스별 알림 관리

### 🛡️ 보안
- Rate limiting (API 요청 속도 제한)
- XSS, CSRF 방지
- NoSQL Injection 방지
- 입력 검증 및 새니타이징

---

## 🛠️ 기술 스택

### Core
- **Node.js** 20 LTS - JavaScript 런타임
- **TypeScript** 5.x - 타입 안전성
- **Express.js** - 웹 프레임워크

### Database & Cache
- **MongoDB** - Native Driver (Mongoose 사용 안 함)
- **Redis** - 세션 및 캐시 스토어

### Real-time
- **Socket.IO** - 실시간 양방향 통신

### Authentication
- **Passport.js** - OAuth 인증
- **express-session** - 세션 관리
- **bcrypt** - 비밀번호 해싱

### DevOps
- **Docker** - 컨테이너화
- **Winston** - 구조화된 로깅
- **Prometheus** - 메트릭 수집

---

## 🚀 빠른 시작

### 사전 요구사항

- Node.js >= 20.0.0
- npm >= 9.0.0
- Docker & Docker Compose (권장)

### Docker Compose로 실행 (권장) 🐳

```bash
# 1. 저장소 클론
git clone https://github.com/YourOrg/LiveLink_BE.git
cd LiveLink_BE

# 2. 환경 변수 설정
cp .env.example .env.production
# .env.production 파일을 열어서 필수 값들을 수정하세요
# (MONGO_ROOT_PASSWORD, REDIS_PASSWORD, JWT_SECRET 등)

# 3. 전체 스택 실행 (Backend + MongoDB + Redis + Monitoring)
docker-compose up -d

# 4. 로그 확인
docker-compose logs -f app

# 5. 헬스체크
curl http://localhost:3000/health/liveness
```

**서비스 접속:**
- Backend API: http://localhost:3000
- Grafana (모니터링): http://localhost:3001
- Prometheus: http://localhost:9090

📘 **상세 가이드**: [Docker Quick Start](./docs/deployment/DOCKER_QUICKSTART.md) | [Docker Guide](./docs/deployment/DOCKER_GUIDE.md)

### 로컬 개발 환경

```bash
# 1. 의존성 설치
npm install

# 2. MongoDB & Redis 실행 (Docker)
docker-compose up -d mongo redis

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일 수정

# 4. 개발 서버 실행
npm run dev
```

---

## 🔧 개발 환경 설정

### 필수 환경 변수

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/stagelives

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Session
SESSION_SECRET=your-secret-key-minimum-32-characters

# OAuth (선택)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...

# Firebase (선택)
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase.json
```

### 주요 스크립트

```bash
npm run dev          # 개발 서버 (hot reload)
npm start            # 프로덕션 서버
npm run build        # TypeScript 빌드
npm test             # 테스트 실행
npm run lint         # ESLint 검사
npm run format       # Prettier 포맷팅
```

---

## 📂 프로젝트 구조

```
src/
├── config/          # 환경 설정 (OAuth, Redis, Swagger)
├── models/          # 데이터 모델 (MongoDB Native Driver)
├── services/        # 비즈니스 로직
├── controllers/     # 요청 핸들러
├── routes/          # API 라우트
├── middlewares/     # Express 미들웨어
├── socket/          # Socket.IO 핸들러
├── utils/           # 유틸리티 (로거, 캐시)
└── app.ts           # 애플리케이션 진입점
```

---

## 📖 API 문서

### Swagger UI

개발 환경에서 자동 생성된 API 문서를 확인할 수 있습니다:

**URL**: `http://localhost:3000/api-docs`

### 주요 엔드포인트

#### 인증
```
POST   /api/v1/auth/signup         # 회원가입
POST   /api/v1/auth/login          # 로그인
POST   /api/v1/auth/logout         # 로그아웃
GET    /api/v1/auth/session        # 세션 확인
DELETE /api/v1/auth/account        # 계정 삭제
```

#### 게시글
```
GET    /api/v1/posts               # 게시글 목록
POST   /api/v1/posts               # 게시글 작성
GET    /api/v1/posts/:id           # 게시글 조회
PATCH  /api/v1/posts/:id           # 게시글 수정
DELETE /api/v1/posts/:id           # 게시글 삭제
POST   /api/v1/posts/:id/like      # 좋아요
POST   /api/v1/posts/:id/bookmark  # 북마크
```

#### 공연
```
GET    /api/v1/concerts            # 공연 목록
GET    /api/v1/concerts/:id        # 공연 상세
POST   /api/v1/concerts/:id/like   # 공연 좋아요
GET    /api/v1/concerts/search     # 공연 검색
```

### 응답 형식

**성공 응답**:
```json
{
  "success": true,
  "data": { ... },
  "message": "요청이 성공적으로 처리되었습니다"
}
```

**에러 응답**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 유효하지 않습니다",
    "details": [ ... ]
  }
}
```

---

## 🛡️ 보안

### 보안 기능

1. **인증 & 세션**
   - 세션 기반 인증 (Redis 저장)
   - 플랫폼별 세션 제한 (웹 1개, 앱 1개)
   - 안전한 쿠키 설정 (httpOnly, secure, sameSite)

2. **공격 방지**
   - Rate limiting (API 속도 제한)
   - XSS 방지 (helmet, sanitize-html)
   - CSRF 방지 (SameSite 쿠키)
   - NoSQL Injection 방지 (express-mongo-sanitize)
   - 브루트포스 방지 (로그인 시도 제한)

3. **데이터 보호**
   - bcrypt 비밀번호 해싱 (saltRounds: 10)
   - 환경 변수로 민감 정보 관리
   - MongoDB/Redis 인증 활성화

### 보안 체크리스트

프로덕션 배포 전:

- [ ] 강력한 비밀번호 설정 (32자 이상)
- [ ] HTTPS/TLS 인증서 설정
- [ ] MongoDB/Redis 인증 활성화
- [ ] 방화벽 규칙 설정
- [ ] 환경 변수 검증
- [ ] 로그 모니터링 설정

---

## 🧪 테스트

```bash
# 전체 테스트
npm test

# 감시 모드
npm run test:watch

# 커버리지
npm run test:coverage
```

### 테스트 구조

```
tests/
├── unit/            # 단위 테스트
│   ├── models/
│   ├── services/
│   └── utils/
└── integration/     # 통합 테스트
    ├── auth.test.ts
    ├── posts.test.ts
    └── concerts.test.ts
```

---

## 🚢 배포

### Docker를 사용한 배포

```bash
# 1. 프로덕션 환경 변수 설정
cp .env.example .env.production

# 2. Docker 이미지 빌드
docker build -t stagelives-api:latest .

# 3. 컨테이너 실행
docker-compose -f docker-compose.prod.yml up -d
```

### PM2를 사용한 배포

```bash
# 1. 프로젝트 빌드
npm run build

# 2. PM2로 실행
pm2 start dist/app.js --name stagelives-api

# 3. 부팅 시 자동 시작
pm2 startup
pm2 save
```

### Health Check

```bash
# Liveness probe
curl http://localhost:3000/health/liveness

# Readiness probe
curl http://localhost:3000/health/readiness

# 응답 예시
{
  "status": "healthy",
  "timestamp": "2024-12-26T00:00:00.000Z",
  "uptime": 3600,
  "services": {
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

---

## 🤝 기여하기

프로젝트에 기여해주셔서 감사합니다!

### 기여 절차

1. Fork 저장소
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'feat :: Add AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

### 커밋 컨벤션

```
feat :: 새로운 기능 추가
fix :: 버그 수정
docs :: 문서 수정
style :: 코드 포맷팅
refactor :: 코드 리팩토링
test :: 테스트 추가/수정
chore :: 빌드 설정, 의존성 업데이트
```

### 코딩 컨벤션

- **코드 스타일**: ESLint + Prettier 준수
- **타입 안전성**: TypeScript strict 모드
- **테스트**: 새 기능에 테스트 코드 포함
- **문서**: API 변경 시 Swagger 문서 업데이트

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

---

## 📚 추가 문서

### AI 개발 가이드
- [.claude/README.md](./.claude/README.md) - AI 어시스턴트용 프로젝트 가이드
- [.claude/DEVELOPMENT_GUIDE.md](./.claude/DEVELOPMENT_GUIDE.md) - 개발 가이드 및 코딩 표준

### 아키텍처
- [docs/architecture/ERD.md](./docs/architecture/ERD.md) - 데이터베이스 스키마
- [docs/architecture/SEQUENCE_DIAGRAMS.md](./docs/architecture/SEQUENCE_DIAGRAMS.md) - 비즈니스 플로우

### 운영
- [docs/operations/MONITORING_GUIDE.md](./docs/operations/MONITORING_GUIDE.md) - 모니터링 설정
- [docs/deployment/DEPLOYMENT_GUIDE.md](./docs/deployment/DEPLOYMENT_GUIDE.md) - 배포 가이드

---

## 🔧 트러블슈팅

### 자주 발생하는 문제

**MongoDB 연결 실패**:
```bash
# MongoDB 실행 확인
docker ps | grep mongo

# 환경 변수 확인
echo $MONGO_URI
```

**Redis 연결 실패**:
```bash
# Redis 실행 확인
docker ps | grep redis

# Redis 연결 테스트
redis-cli -h localhost -p 6379 ping
```

**포트 충돌**:
```bash
# 포트 사용 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

### 로그 확인

```bash
# 개발 환경
npm run dev

# Docker 환경
docker-compose logs -f app

# PM2 환경
pm2 logs stagelives-api
```

---

## 👥 팀

**EverydayFireFriday Team**

질문이나 제안이 있으시면 [이슈](https://github.com/YourOrg/LiveLink_BE/issues)를 통해 연락주세요.

---

<p align="center">
  <strong>Last Updated</strong>: 2024-12-26<br/>
  Made with ❤️ by EverydayFireFriday Team
</p>
