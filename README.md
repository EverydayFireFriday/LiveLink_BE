# LiveLink API 서버

<p align="center">
  <strong>공연 정보, 커뮤니티, 그리고 실시간 소통을 하나로.</strong><br/>
  TypeScript, Express.js, MongoDB 기반의 확장 가능한 백엔드 API 서버입니다.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js version">
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

## ✨ 주요 기능

LiveLink는 다양한 서비스를 제공하여 사용자와 관리자 모두에게 풍부한 경험을 제공합니다.

- **🔐 사용자 인증**: 세션 기반의 안전한 사용자 인증 및 프로필 관리. 소셜 로그인(Google, Apple) 지원.
- **✍️ 게시글 관리**: 사용자들이 자유롭게 글을 작성하고 공유하는 커뮤니티 기능. (좋아요, 북마크, 댓글 포함)
- **🎤 공연 정보**: 공연 정보 조회, 검색 및 좋아요 기능. (관리자 전용 CRUD 포함)
- **💬 실시간 채팅**: Socket.IO를 사용한 사용자 간 실시간 채팅 기능.
- **🛡️ 보안**: `helmet`, `hpp`, `express-rate-limit` 등을 적용하여 일반적인 웹 취약점으로부터 서버를 보호합니다.
- **📄 API 문서**: Swagger(OpenAPI 3.0)를 통해 자동으로 생성되는 대화형 API 문서를 제공합니다.

## 🏛️ 시스템 아키텍처

LiveLink 서버는 안정성과 확장성을 고려하여 설계되었습니다.

- **Express.js**: 핵심 API 라우팅 및 비즈니스 로직을 처리합니다.
- **MongoDB**: 사용자 정보, 게시글, 공연 데이터 등 주요 데이터를 저장하는 메인 데이터베이스입니다.
- **Redis**: 빠른 속도가 요구되는 사용자 세션 정보와 자주 사용되는 데이터를 캐싱하여 시스템 성능을 향상시킵니다.
- **Socket.IO**: 웹소켓을 통해 서버와 클라이언트 간의 실시간 양방향 통신을 구현합니다.
- **Docker**: 개발 및 프로덕션 환경을 컨테이너화하여 일관성 있고 예측 가능한 배포를 보장합니다.

## 🚀 시작하기

### 사전 준비물

- Node.js `>=18.0.0`
- npm `>=8.0.0`
- Docker & Docker Compose

### 설치 및 실행

1.  **저장소 클론**
    ```bash
    git clone https://github.com/EverydayFireFriday/LiveLink_BE.git
    cd LiveLink_BE
    ```

2.  **종속성 설치**
    ```bash
    npm install
    ```

3.  **환경 변수 설정**
    `.env.example` 파일을 복사하여 `.env` 파일을 생성하고, 로컬 환경에 맞게 변수를 수정합니다.
    ```bash
    cp .env.example .env
    ```
    ```env
    # 서버 설정
    PORT=3000
    NODE_ENV=development

    # 데이터베이스 및 Redis 설정
    MONGODB_URI=mongodb://localhost:27017/livelink
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_PASSWORD=

    # 세션 및 이메일 설정
    SESSION_SECRET=a-very-strong-secret-key
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_app_password
    ```

4.  **개발 서버 실행**
    ```bash
    npm run dev
    ```

5.  **API 문서 확인**
    서버 실행 후, `http://localhost:3000/api-docs` 에서 Swagger 문서를 확인할 수 있습니다.

### Docker로 실행하기 (권장)

Docker를 사용하면 MongoDB, Redis를 포함한 모든 서비스를 한 번에 실행할 수 있습니다.

1.  **`.env.production` 파일 생성**
    프로덕션 배포를 위해 `.env.production` 파일을 생성하고 내용을 채웁니다.

2.  **Docker Compose 실행**
    ```bash
    # 이미지를 빌드하고 모든 서비스를 백그라운드에서 시작합니다.
    docker-compose up --build -d
    ```

## 📂 프로젝트 구조

```
LiveLink_BE/
├── src/                  # 소스 코드
│   ├── app.ts            # 애플리케이션 진입점
│   ├── config/           # 환경변수, Passport, Swagger 등 설정
│   ├── controllers/      # 요청/응답 처리를 위한 컨트롤러
│   ├── middlewares/      # 인증, 보안 등 Express 미들웨어
│   ├── models/           # MongoDB 데이터 모델 (스키마)
│   ├── routes/           # API 엔드포인트 라우팅
│   ├── services/         # 비즈니스 로직
│   ├── socket/           # Socket.IO 관련 로직
│   ├── types/            # 프로젝트 전역 타입 정의
│   └── utils/            # 로거, 유효성 검사 등 유틸리티 함수
│
├── config/               # 인프라 설정 파일
│   ├── prometheus.yml    # Prometheus 설정
│   ├── nginx.conf        # Nginx 설정
│   └── ecosystem.config.js # PM2 설정
│
├── scripts/              # 배포 및 유틸리티 스크립트
│   ├── deploy.sh         # 배포 스크립트
│   └── docker-build.sh   # Docker 빌드 스크립트
│
├── docs/                 # 프로젝트 문서
│   ├── API_RESPONSE_STANDARDIZATION.md
│   ├── MONITORING_GUIDE.md
│   └── DEPLOY_CHECKLIST.md
│
├── .github/              # GitHub Actions CI/CD
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
│
├── grafana/              # Grafana 대시보드 설정
│   └── provisioning/
│
├── public/               # 정적 파일 (Swagger 에셋)
│
├── docker-compose.yml    # Docker Compose 설정
├── Dockerfile            # Docker 이미지 빌드 설정
└── package.json          # 프로젝트 의존성 및 스크립트
```

## ⚙️ 주요 스크립트

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (핫 리로드) |
| `npm start` | 프로덕션 서버 실행 (빌드 후) |
| `npm run build` | 프로덕션용으로 프로젝트 빌드 |
| `npm test` | Jest 테스트 실행 |
| `npm run lint` | ESLint로 코드 품질 검사 |
| `npm run format` | Prettier로 코드 포맷팅 |

## 📚 문서

프로젝트의 상세 문서는 [`docs/`](./docs) 폴더에서 확인할 수 있습니다:

- **[API 응답 표준화](./docs/API_RESPONSE_STANDARDIZATION.md)** - API 응답 형식 가이드
- **[모니터링 가이드](./docs/MONITORING_GUIDE.md)** - Prometheus & Grafana 설정 및 사용법
- **[배포 체크리스트](./docs/DEPLOY_CHECKLIST.md)** - 프로덕션 배포 가이드
```