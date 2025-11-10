# stagelives API 서버

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
  <img src="https://img.shields.io/badge/Test-Jest-yellow.svg" alt="Jest">
  <br/>
  <a href="https://github.com/EverydayFireFriday/LiveLink_BE/actions/workflows/ci.yml">
    <img src="https://github.com/EverydayFireFriday/LiveLink_BE/actions/workflows/ci.yml/badge.svg" alt="CI Status">
  </a>
  <a href="https://github.com/EverydayFireFriday/LiveLink_BE/actions/workflows/cd.yml">
    <img src="https://github.com/EverydayFireFriday/LiveLink_BE/actions/workflows/cd.yml/badge.svg" alt="CD Status">
  </a>
</p>

---

## 📋 목차

- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시스템 아키텍처](#️-시스템-아키텍처)
- [시작하기](#-시작하기)
  - [사전 준비물](#사전-준비물)
  - [로컬 개발 환경](#로컬-개발-환경)
  - [Docker 환경 (권장)](#docker-환경-권장)
- [프로젝트 구조](#-프로젝트-구조)
- [주요 스크립트](#️-주요-스크립트)
- [환경 변수](#-환경-변수)
- [보안](#-보안)
- [모니터링](#-모니터링)
- [배포](#-배포)
- [API 문서](#-api-문서)
- [테스트](#-테스트)
- [트러블슈팅](#-트러블슈팅)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## ✨ 주요 기능

stagelives는 다양한 서비스를 제공하여 사용자와 관리자 모두에게 풍부한 경험을 제공합니다.

- **🔐 사용자 인증**
  - 세션 기반의 안전한 사용자 인증 및 프로필 관리
  - 소셜 로그인 지원 (Google OAuth 2.0, Apple Sign-In)
  - 플랫폼별 세션 관리 (웹 1개 + 앱 1개 동시 유지)
  - ✅ 같은 플랫폼 재로그인 시 이전 세션 자동 종료 + 신규 로그인 기기에 알림
  - 브루트포스 공격 방지

- **✍️ 게시글 관리**
  - 사용자들이 자유롭게 글을 작성하고 공유하는 커뮤니티 기능
  - 좋아요, 북마크, 댓글 시스템
  - 이미지 업로드 및 미디어 관리

- **🎤 공연 정보**
  - 공연 정보 조회, 검색 및 필터링
  - 공연 좋아요 및 즐겨찾기 기능
  - 관리자 전용 공연 정보 CRUD
  - 자동 상태 업데이트 스케줄러

- **💬 실시간 채팅**
  - Socket.IO를 사용한 실시간 양방향 통신
  - 1:1 및 그룹 채팅 지원
  - Redis Adapter를 통한 수평 확장 가능

- **🔔 푸시 알림**
  - Firebase Cloud Messaging (FCM) 통합
  - 실시간 이벤트 알림
  - 디바이스별 알림 관리

- **🛡️ 보안**
  - `helmet`으로 보안 헤더 설정
  - `hpp`로 HTTP 파라미터 오염 방지
  - `express-rate-limit`으로 API 요청 속도 제한
  - XSS, CSRF, Clickjacking 방지
  - 입력 데이터 검증 및 새니타이징

- **📊 모니터링**
  - Prometheus 메트릭 수집
  - Grafana 대시보드 (시스템, 데이터베이스, API 메트릭)
  - 실시간 성능 모니터링 및 알람

- **📄 API 문서**
  - Swagger/OpenAPI 3.0 자동 생성 문서
  - 대화형 API 테스트 환경

---

## 🛠️ 기술 스택

### 코어 프레임워크
- **Node.js 20 LTS** - 안정적인 런타임 환경
- **TypeScript 5.x** - 타입 안전성과 개발 생산성
- **Express.js** - 빠르고 유연한 웹 프레임워크

### 데이터베이스 & 캐싱
- **MongoDB 8.0** - NoSQL 문서 기반 데이터베이스
- **Redis 7** - 인메모리 데이터 스토어 (세션, 캐싱)

### 실시간 통신
- **Socket.IO** - WebSocket 기반 실시간 통신
- **@socket.io/redis-adapter** - 다중 서버 환경 지원

### 인증 & 보안
- **Passport.js** - 인증 미들웨어
- **express-session** - 세션 관리
- **helmet** - 보안 헤더 설정
- **bcrypt** - 비밀번호 해싱
- **express-rate-limit** - API 속도 제한

### 모니터링
- **Prometheus** - 메트릭 수집
- **Grafana** - 메트릭 시각화
- **Winston** - 구조화된 로깅

### DevOps
- **Docker & Docker Compose** - 컨테이너화
- **GitHub Actions** - CI/CD 자동화
- **Nginx** - 리버스 프록시 및 로드 밸런싱

### 테스트
- **Jest** - 단위/통합 테스트
- **Supertest** - API 엔드포인트 테스트

---

## 🏛️ 시스템 아키텍처

```
┌─────────────┐
│   Client    │
│ (Web/App)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Nginx    │ ◄── Reverse Proxy, SSL/TLS, Rate Limiting
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│   Express.js Application    │
│  ┌────────────────────────┐ │
│  │  Routes & Controllers  │ │
│  └──────────┬─────────────┘ │
│             │               │
│  ┌──────────▼─────────────┐ │
│  │   Business Services    │ │
│  └──────────┬─────────────┘ │
│             │               │
│  ┌──────────▼─────────────┐ │
│  │     Data Models        │ │
│  └────────────────────────┘ │
└──────┬──────────────┬───────┘
       │              │
   ┌───▼───┐      ┌──▼───┐
   │MongoDB│      │Redis │
   │  DB   │      │Cache │
   └───────┘      └──────┘

┌──────────────────────────┐
│    Monitoring Stack      │
│  ┌──────────────────┐    │
│  │   Prometheus     │    │
│  └────────┬─────────┘    │
│           │              │
│  ┌────────▼─────────┐    │
│  │     Grafana      │    │
│  └──────────────────┘    │
└──────────────────────────┘
```

### 주요 컴포넌트

- **Express.js**: 핵심 API 라우팅 및 비즈니스 로직 처리
- **MongoDB**: 사용자 정보, 게시글, 공연 데이터 등 메인 데이터 저장
- **Redis**: 세션 정보, 캐시 데이터 저장으로 성능 향상
- **Socket.IO**: 실시간 채팅 및 양방향 통신
- **Nginx**: 리버스 프록시, 로드 밸런싱, SSL/TLS 종료
- **Prometheus & Grafana**: 실시간 모니터링 및 메트릭 시각화

---

## 🚀 시작하기

### 사전 준비물

- **Node.js** `>=20.0.0` (LTS 권장)
- **npm** `>=9.0.0`
- **Docker** & **Docker Compose** (v2.0+)
- **MongoDB** (로컬 실행 시)
- **Redis** (로컬 실행 시)

### 로컬 개발 환경

#### 1. 저장소 클론
```bash
git clone https://github.com/EverydayFireFriday/LiveLink_BE.git
cd LiveLink_BE
```

#### 2. 종속성 설치
```bash
npm install
```

#### 3. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성하고, 로컬 환경에 맞게 변수를 수정합니다.

```bash
cp .env.example .env
```

**중요한 환경 변수:**
```env
# 서버 설정
NODE_ENV=development
PORT=3000

# 데이터베이스
MONGO_URI=mongodb://localhost:27017/stagelives
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=changeme

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=changeme

# 보안
SESSION_SECRET=$(openssl rand -base64 32)

# 이메일 (Gmail 앱 비밀번호 사용 권장)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

#### 4. MongoDB & Redis 실행
Docker를 사용하여 로컬에서 실행:
```bash
# MongoDB
docker run -d \
  --name stagelives-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=changeme \
  mongo:8.0

# Redis
docker run -d \
  --name stagelives-redis \
  -p 6379:6379 \
  redis:7-alpine redis-server --requirepass changeme
```

#### 5. 개발 서버 실행
```bash
npm run dev
```

서버가 성공적으로 실행되면 `http://localhost:3000` 에서 접근할 수 있습니다.

#### 6. API 문서 확인
브라우저에서 `http://localhost:3000/api-docs` 에 접속하여 Swagger 문서를 확인할 수 있습니다.

---

### Docker 환경 (권장)

Docker Compose를 사용하면 모든 의존성을 포함한 전체 스택을 한 번에 실행할 수 있습니다.

#### 1. 환경 변수 파일 생성

프로덕션 배포를 위해 `.env.production` 파일을 생성합니다:

```bash
cp .env.example .env.production
```

**⚠️ 중요**: 운영 환경에서는 반드시 강력한 비밀번호를 설정하세요!

```env
# MongoDB 인증
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=강력한_비밀번호_사용_필수

# Redis 인증
REDIS_PASSWORD=강력한_비밀번호_사용_필수

# 세션 비밀키 (32자 이상)
SESSION_SECRET=$(openssl rand -base64 32)

# Grafana 관리자 계정
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=강력한_비밀번호_사용_필수

# MongoDB URI (인증 포함)
MONGO_URI=mongodb://admin:강력한_비밀번호@mongo:27017/stagelives?authSource=admin

# Redis URL (인증 포함)
REDIS_URL=redis://:강력한_비밀번호@redis:6379
```

#### 2. Docker Compose 실행

**전체 스택 실행** (앱 + MongoDB + Redis + 모니터링):
```bash
docker-compose up -d
```

**특정 서비스만 실행**:
```bash
# 데이터베이스만
docker-compose up -d mongo redis

# 모니터링만
docker-compose up -d prometheus grafana
```

#### 3. 로그 확인
```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f app
docker-compose logs -f mongo
```

#### 4. 서비스 중지
```bash
# 컨테이너 중지 (데이터 보존)
docker-compose stop

# 컨테이너 삭제 (데이터 보존)
docker-compose down

# 컨테이너 및 볼륨 삭제 (⚠️ 데이터 손실)
docker-compose down -v
```

#### 5. 접속 정보

| 서비스 | URL | 비고 |
|--------|-----|------|
| API 서버 | http://localhost:3000 | 메인 애플리케이션 |
| Swagger 문서 | http://localhost:3000/api-docs | API 문서 |
| Grafana | http://localhost:3001 | 모니터링 대시보드 |
| Prometheus | http://localhost:9090 | 메트릭 수집 |

---

## 📂 프로젝트 구조

```
LiveLink_BE/
├── src/                      # 소스 코드
│   ├── app.ts                # 애플리케이션 진입점
│   ├── config/               # 환경변수, Passport, Swagger 등 설정
│   │   ├── env.config.ts     # 환경 변수 관리
│   │   ├── swagger.config.ts # Swagger 설정
│   │   └── passport.config.ts# Passport 전략 설정
│   ├── controllers/          # 요청/응답 처리 컨트롤러
│   │   ├── auth.controller.ts
│   │   ├── post.controller.ts
│   │   └── concert.controller.ts
│   ├── middlewares/          # Express 미들웨어
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/               # MongoDB 스키마 정의
│   │   ├── User.model.ts
│   │   ├── Post.model.ts
│   │   └── Concert.model.ts
│   ├── routes/               # API 엔드포인트 라우팅
│   │   ├── auth.routes.ts
│   │   ├── post.routes.ts
│   │   └── concert.routes.ts
│   ├── services/             # 비즈니스 로직
│   │   ├── auth.service.ts
│   │   ├── post.service.ts
│   │   └── email.service.ts
│   ├── socket/               # Socket.IO 로직
│   │   ├── socket.handler.ts
│   │   └── chat.handler.ts
│   ├── types/                # TypeScript 타입 정의
│   │   └── express.d.ts
│   └── utils/                # 유틸리티 함수
│       ├── logger.ts         # Winston 로거
│       ├── validator.ts      # 입력 검증
│       └── response/         # 표준화된 응답 포맷
│
├── config/                   # 인프라 설정 파일
│   ├── prometheus.yml        # Prometheus 메트릭 수집 설정
│   ├── nginx.conf            # Nginx 리버스 프록시 설정
│   └── ecosystem.config.js   # PM2 프로세스 관리 설정
│
├── scripts/                  # 배포 및 유틸리티 스크립트
│   ├── deploy.sh             # 배포 자동화 스크립트
│   └── docker-build.sh       # Docker 이미지 빌드 스크립트
│
├── docs/                     # 프로젝트 문서
│   ├── API_RESPONSE_STANDARDIZATION.md
│   ├── MONITORING_GUIDE.md
│   ├── DEPLOY_CHECKLIST.md
│   └── architecture/         # 아키텍처 문서
│
├── .github/                  # GitHub Actions CI/CD
│   └── workflows/
│       ├── ci.yml            # 지속적 통합 워크플로우
│       └── cd.yml            # 지속적 배포 워크플로우
│
├── grafana/                  # Grafana 설정
│   └── provisioning/
│       ├── datasources/      # 데이터소스 자동 프로비저닝
│       └── dashboards/       # 대시보드 자동 프로비저닝
│
├── public/                   # 정적 파일
│   └── images/               # 이미지 업로드 디렉토리
│
├── tests/                    # 테스트 파일
│   ├── unit/                 # 단위 테스트
│   └── integration/          # 통합 테스트
│
├── docker-compose.yml        # Docker Compose 설정
├── Dockerfile                # Docker 이미지 빌드 설정
├── .dockerignore             # Docker 빌드 제외 파일
├── .env.example              # 환경 변수 예시 파일
├── .env.production           # 프로덕션 환경 변수
├── package.json              # 프로젝트 메타데이터 및 의존성
├── tsconfig.json             # TypeScript 컴파일러 설정
└── jest.config.ts            # Jest 테스트 설정
```

---

## ⚙️ 주요 스크립트

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | 개발 서버 실행 (nodemon으로 핫 리로드) |
| `npm start` | 프로덕션 서버 실행 (빌드된 파일 실행) |
| `npm run build` | TypeScript 컴파일 (dist/ 폴더에 생성) |
| `npm test` | Jest 테스트 실행 |
| `npm run test:watch` | 테스트 감시 모드 |
| `npm run test:coverage` | 테스트 커버리지 리포트 생성 |
| `npm run lint` | ESLint로 코드 품질 검사 |
| `npm run lint:fix` | ESLint 자동 수정 |
| `npm run format` | Prettier로 코드 포맷팅 |
| `npm run format:check` | 포맷팅 검사만 수행 |

---

## 🔒 환경 변수

### 필수 환경 변수

#### 애플리케이션
```env
NODE_ENV=production              # 실행 환경 (development, production, test)
PORT=3000                        # 서버 포트
LOG_LEVEL=info                   # 로그 레벨 (error, warn, info, debug)
```

#### 데이터베이스
```env
# MongoDB
MONGO_URI=mongodb://username:password@host:27017/stagelives?authSource=admin
MONGO_ROOT_USERNAME=admin        # Docker Compose용
MONGO_ROOT_PASSWORD=secure_pass  # Docker Compose용

# Redis
REDIS_URL=redis://:password@host:6379
REDIS_PASSWORD=secure_pass       # Docker Compose용
```

#### 보안
```env
SESSION_SECRET=minimum-32-characters-random-string
SESSION_MAX_AGE_APP=2592000000      # 30일 (앱 플랫폼)
SESSION_MAX_AGE_WEB=86400000        # 1일 (웹 플랫폼)
# 세션 정책: 플랫폼별 1개씩 유지 (총 최대 2개)
BRUTE_FORCE_MAX_ATTEMPTS=10         # 로그인 시도 제한
BRUTE_FORCE_BLOCK_DURATION=1800     # 차단 시간(초)
```

#### OAuth (선택)
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Apple Sign-In
APPLE_CLIENT_ID=com.yourdomain.app
APPLE_TEAM_ID=TEAM_ID
APPLE_KEY_ID=KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

#### 이메일
```env
EMAIL_SERVICE=gmail
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=app-specific-password
```

#### Firebase (푸시 알림)
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

#### 모니터링
```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=secure_password
```

#### API Rate Limiting
```env
API_LIMIT_DEFAULT_WINDOW_MS=60000  # 1분
API_LIMIT_DEFAULT_MAX=100          # 1분당 100회
API_LIMIT_STRICT_MAX=20            # 엄격한 제한 (인증 등)
```

### 환경 변수 생성 도구

**강력한 세션 시크릿 생성**:
```bash
openssl rand -base64 32
```

**UUID 생성**:
```bash
uuidgen
```

---

## 🛡️ 보안

### 보안 기능

#### 1. **인증 & 세션 관리**
- 세션 기반 인증 (Redis 저장)
- 플랫폼별 세션 만료 시간 (APP: 30일, WEB: 1일)
- 플랫폼별 1개씩 세션 제한 (총 최대 2개)
- ✅ 같은 플랫폼 재로그인 시 이전 기기 자동 로그아웃 + 신규 로그인 기기에 알림
- 안전한 쿠키 설정 (httpOnly, secure, sameSite)

#### 2. **공격 방지**
- **브루트포스 방지**: 로그인 시도 제한
- **XSS 방지**: `helmet`과 입력 새니타이징
- **CSRF 방지**: SameSite 쿠키 정책
- **SQL/NoSQL Injection 방지**: 입력 검증 및 파라미터화
- **Rate Limiting**: API 요청 속도 제한
- **HPP 방지**: HTTP Parameter Pollution 방지

#### 3. **데이터 보호**
- 비밀번호 bcrypt 해싱 (saltRounds: 10)
- 민감 정보 환경 변수 관리
- MongoDB/Redis 인증 활성화
- TLS/SSL 암호화 (프로덕션)

#### 4. **Nginx 보안 설정**
```nginx
# 보안 헤더
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000

# Rate Limiting
limit_req_zone (DDoS 방지)
```

#### 5. **Docker 보안**
- Non-root 사용자로 컨테이너 실행
- 읽기 전용 파일시스템 (가능한 경우)
- 리소스 제한 설정
- 네트워크 격리
- 최소 권한 원칙

### 보안 체크리스트

프로덕션 배포 전 확인사항:

- [ ] 모든 환경 변수에 강력한 비밀번호 설정
- [ ] MongoDB/Redis 인증 활성화
- [ ] HTTPS/TLS 인증서 설정
- [ ] 방화벽 규칙 설정 (필요한 포트만 개방)
- [ ] 정기적인 보안 패치 및 업데이트
- [ ] 로그 모니터링 및 알람 설정
- [ ] 백업 전략 수립 및 테스트
- [ ] 취약점 스캔 실행 (`docker scan`)

---

## 📊 모니터링

stagelives는 Prometheus와 Grafana를 사용하여 시스템을 실시간으로 모니터링합니다.

### 메트릭 수집

**Prometheus 엔드포인트**: `http://localhost:9090`

수집되는 주요 메트릭:
- HTTP 요청 수 및 응답 시간
- MongoDB 연결 상태 및 쿼리 성능
- Redis 메모리 사용량 및 히트율
- Node.js 프로세스 메모리 및 CPU 사용량
- 활성 WebSocket 연결 수

### Grafana 대시보드

**Grafana 접속**: `http://localhost:3001`

기본 제공 대시보드:
1. **시스템 오버뷰**: 전체 시스템 상태 한눈에 보기
2. **API 메트릭**: 엔드포인트별 요청 수, 응답 시간, 에러율
3. **데이터베이스**: MongoDB 쿼리 성능 및 연결 풀
4. **캐시**: Redis 히트율 및 메모리 사용량

### 알람 설정

중요 메트릭에 대한 알람 설정 예시:
- API 응답 시간 > 1초
- 에러율 > 5%
- 메모리 사용량 > 80%
- 디스크 사용량 > 90%

상세 가이드: [모니터링 가이드](./docs/MONITORING_GUIDE.md)

---

## 🚢 배포

### CI/CD 파이프라인

GitHub Actions를 통한 자동화된 CI/CD:

**CI (Continuous Integration)**:
- 코드 린팅 (ESLint)
- 타입 체크 (TypeScript)
- 테스트 실행 (Jest)
- 보안 스캔

**CD (Continuous Deployment)**:
- Docker 이미지 빌드
- GitHub Container Registry에 푸시
- 프로덕션 서버 자동 배포

### 수동 배포

#### Docker를 사용한 배포

```bash
# 1. 이미지 빌드
docker build -t stagelives-api:latest .

# 2. 이미지 태그
docker tag stagelives-api:latest ghcr.io/your-org/stagelives-api:latest

# 3. 레지스트리에 푸시
docker push ghcr.io/your-org/stagelives-api:latest

# 4. 서버에서 실행
docker-compose pull
docker-compose up -d
```

#### PM2를 사용한 배포

```bash
# 1. 프로젝트 빌드
npm run build

# 2. PM2로 실행
pm2 start ecosystem.config.js --env production

# 3. 부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

### 배포 체크리스트

상세 가이드: [배포 체크리스트](./docs/DEPLOY_CHECKLIST.md)

---

## 📖 API 문서

### Swagger UI

API 문서는 Swagger를 통해 자동으로 생성되며, 대화형 테스트 환경을 제공합니다.

**접속 URL**: `http://localhost:3000/api-docs`

### 주요 엔드포인트

#### 인증 (Authentication)
```
POST   /api/v1/auth/signup          # 회원가입
POST   /api/v1/auth/login           # 로그인
POST   /api/v1/auth/logout          # 로그아웃
GET    /api/v1/auth/session         # 로그인 상태 확인
GET    /api/v1/auth/sessions        # 활성 세션 목록 조회
DELETE /api/v1/auth/sessions/all    # 모든 세션 로그아웃 (현재 제외)
DELETE /api/v1/auth/sessions/:id    # 특정 세션 강제 종료
DELETE /api/v1/auth/account         # 계정 삭제
```

**로그인 응답 예시 (이전 세션 종료 알림 포함)**:
```json
{
  "message": "로그인 성공",
  "user": { ... },
  "sessionId": "abc123",
  "warning": {
    "previousSessionTerminated": true,
    "message": "이전에 로그인된 웹 세션이 로그아웃되었습니다.",
    "terminatedDevice": "Chrome on Windows 10"
  }
}
```

**소셜 로그인 리디렉트 예시**:
```
# 이전 세션이 종료된 경우
https://yourapp.com?sessionWarning=true&message=이전에+로그인된+웹+세션이+로그아웃되었습니다&terminatedDevice=Chrome+on+Windows+10

# 이전 세션이 없는 경우
https://yourapp.com
```

#### 게시글 (Posts)
```
GET    /api/v1/posts                # 게시글 목록
POST   /api/v1/posts                # 게시글 작성
GET    /api/v1/posts/:id            # 게시글 조회
PATCH  /api/v1/posts/:id            # 게시글 수정
DELETE /api/v1/posts/:id            # 게시글 삭제
POST   /api/v1/posts/:id/like       # 좋아요
POST   /api/v1/posts/:id/bookmark   # 북마크
```

#### 공연 (Concerts)
```
GET    /api/v1/concerts             # 공연 목록
GET    /api/v1/concerts/:id         # 공연 상세
POST   /api/v1/concerts/:id/like    # 공연 좋아요
GET    /api/v1/concerts/search      # 공연 검색
```

#### 관리자 (Admin)
```
POST   /api/v1/admin/concerts       # 공연 등록
PATCH  /api/v1/admin/concerts/:id   # 공연 수정
DELETE /api/v1/admin/concerts/:id   # 공연 삭제
```

### 응답 형식

모든 API 응답은 표준화된 형식을 따릅니다:

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

상세 가이드: [API 응답 표준화](./docs/API_RESPONSE_STANDARDIZATION.md)

---

## 🧪 테스트

### 테스트 실행

```bash
# 전체 테스트 실행
npm test

# 감시 모드
npm run test:watch

# 커버리지 리포트
npm run test:coverage
```

### 테스트 구조

```
tests/
├── unit/                    # 단위 테스트
│   ├── services/
│   ├── controllers/
│   └── utils/
└── integration/             # 통합 테스트
    ├── auth.test.ts
    ├── posts.test.ts
    └── concerts.test.ts
```

### 테스트 예시

```typescript
describe('POST /api/v1/auth/signup', () => {
  it('should create a new user successfully', async () => {
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        nickname: 'testuser'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('userId');
  });
});
```

---

## 🔧 트러블슈팅

### 자주 발생하는 문제

#### 1. MongoDB 연결 실패
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**해결방법**:
- MongoDB가 실행 중인지 확인: `docker ps | grep mongo`
- 환경 변수 확인: `MONGO_URI`가 올바른지 확인
- 인증 정보 확인: username/password가 일치하는지 확인

#### 2. Redis 연결 실패
```
Error: Redis connection failed
```

**해결방법**:
- Redis가 실행 중인지 확인: `docker ps | grep redis`
- 비밀번호 확인: `REDIS_PASSWORD` 일치 여부
- 연결 URL 확인: `redis://:password@host:port` 형식

#### 3. 포트 이미 사용 중
```
Error: listen EADDRINUSE: address already in use :::3000
```

**해결방법**:
```bash
# 포트 사용 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

#### 4. Docker 컨테이너 시작 실패
```
Error: container failed to start
```

**해결방법**:
```bash
# 로그 확인
docker-compose logs app

# 컨테이너 재시작
docker-compose restart app

# 완전히 재생성
docker-compose down
docker-compose up -d
```

#### 5. 메모리 부족
```
JavaScript heap out of memory
```

**해결방법**:
```bash
# Node.js 메모리 제한 증가
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### 로그 확인

```bash
# 애플리케이션 로그 (개발 환경)
npm run dev

# Docker 로그
docker-compose logs -f app

# PM2 로그
pm2 logs stagelives-api

# Nginx 로그
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

---

## 🤝 기여하기

프로젝트에 기여해주셔서 감사합니다!

### 기여 절차

1. **Fork** 저장소
2. **Feature 브랜치** 생성 (`git checkout -b feature/AmazingFeature`)
3. **변경사항 커밋** (`git commit -m 'Add some AmazingFeature'`)
4. **브랜치에 Push** (`git push origin feature/AmazingFeature`)
5. **Pull Request** 생성

### 코딩 컨벤션

- **코드 스타일**: ESLint + Prettier 설정 준수
- **커밋 메시지**: [Conventional Commits](https://www.conventionalcommits.org/) 형식 사용
  ```
  feat: 새로운 기능 추가
  fix: 버그 수정
  docs: 문서 수정
  style: 코드 포맷팅
  refactor: 코드 리팩토링
  test: 테스트 추가/수정
  chore: 빌드 설정 등
  ```
- **테스트**: 새로운 기능에는 테스트 코드 포함
- **문서화**: API 변경 시 Swagger 문서 업데이트

### 버그 리포트

버그를 발견하셨나요? [이슈](https://github.com/EverydayFireFriday/LiveLink_BE/issues)를 등록해주세요.

포함할 정보:
- 버그 설명
- 재현 단계
- 예상 동작
- 실제 동작
- 환경 정보 (OS, Node.js 버전 등)

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

---

## 👥 팀

**EverydayFireFriday Team**

프로젝트에 대한 질문이나 제안이 있으시면 이슈를 통해 연락주세요.

---

## 📚 추가 문서

- [API 응답 표준화 가이드](./docs/API_RESPONSE_STANDARDIZATION.md)
- [모니터링 설정 가이드](./docs/MONITORING_GUIDE.md)
- [배포 체크리스트](./docs/DEPLOY_CHECKLIST.md)
- [아키텍처 문서](./docs/architecture/README.md)

---

<p align="center">
  Made with ❤️ by EverydayFireFriday Team
</p>
