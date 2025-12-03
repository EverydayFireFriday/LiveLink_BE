# stagelives Backend - 프로젝트 개요

## 프로젝트 설명

**서비스명**: stagelives

stagelives는 Node.js, Express, TypeScript, MongoDB로 구축된 종합 콘서트 관리 및 소셜 플랫폼 백엔드입니다. 사용자가 콘서트를 검색하고, 콘텐츠와 상호작용하며, 실시간으로 채팅하고, 맞춤형 알림을 받을 수 있는 플랫폼입니다.

**중요**:
- **서비스명**: stagelives (모든 사용자 대면 메시지, UI, 이메일 등)
- **프로젝트명**: LiveLink (GitHub 레포지토리 이름)
- **데이터베이스명**: stagelives

## 프로젝트 목표

1. **콘서트 검색**: 다가오는 콘서트를 위한 강력한 검색 및 필터링 시스템 제공
2. **소셜 상호작용**: 콘서트 및 게시글 좋아요, 북마크, 댓글 기능 지원
3. **실시간 커뮤니케이션**: 사용자 간 실시간 채팅 지원
4. **맞춤형 알림**: 티켓 오픈 및 공연 시작 알림 적시 제공
5. **멀티 플랫폼 지원**: 웹과 모바일 앱을 위한 별도 세션 관리
6. **보안**: Rate limiting, Brute force 보호, OAuth 인증 등 포괄적인 보안 조치

## 기술 스택

### 핵심 기술
- **Runtime**: Node.js >=18.0.0
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript 5.3.3
- **Databases**: MongoDB 6.20.0 (Native Driver)
- **Cache/Session**: Redis 4.6.5

### 주요 라이브러리
- **인증**: Passport.js (Google OAuth, Apple OAuth)
- **실시간**: Socket.IO 4.7.5
- **보안**: Helmet, express-rate-limit, express-mongo-sanitize, sanitize-html
- **GraphQL**: Apollo Server Express 3.13.0
- **모니터링**: Winston (로깅), prom-client (Prometheus 메트릭)
- **푸시 알림**: Firebase Admin SDK

## 프로젝트 구조

```
LiveLink_BE/
├── src/
│   ├── config/          # 설정 파일 (OAuth, Redis, Swagger, Database)
│   ├── models/          # 데이터 모델 (User, Concert, Article, Chat, Notification, Setlist)
│   ├── routes/          # API 라우트 정의
│   ├── controllers/     # 요청 핸들러
│   ├── services/        # 비즈니스 로직 계층
│   ├── middlewares/     # Express 미들웨어 (인증, 보안, 에러 처리)
│   ├── utils/           # 유틸리티 함수 (로거, 캐시, 데이터베이스 헬퍼)
│   ├── socket/          # Socket.IO 서버 설정
│   ├── report/          # GraphQL 리포트 서비스
│   └── app.ts           # 메인 애플리케이션 진입점
├── docs/
│   ├── architecture/    # 아키텍처 문서
│   └── api/            # API 문서
└── .claude/            # AI 어시스턴트 컨텍스트 파일
```

## 핵심 기능

### 1. 인증 시스템
- 이메일/비밀번호 회원가입 및 로그인
- 소셜 로그인 (Google, Apple)
- 세션 기반 인증
- 비밀번호 찾기/재설정

### 2. 콘서트 관리
- 콘서트 CRUD 작업
- 고급 검색 및 필터 (아티스트, 카테고리, 날짜, 지역)
- 콘서트 상태 자동화 (upcoming → ongoing → completed)
- 좋아요/좋아요 취소 기능
- 티켓 오픈 알림
- 공연 시작 알림
- YouTube Music 및 Spotify 재생목록 세트리스트 통합

### 3. 게시판/커뮤니티 기능
- 게시글 CRUD (카테고리별)
- 댓글 및 대댓글
- 좋아요 및 북마크 기능
- 태그 시스템
- 전문 검색

### 4. 실시간 채팅
- Socket.IO 기반 메시징
- 공개/비공개 채팅방 생성 및 참여
- 메시지 수정/삭제
- 실시간 알림

### 5. 알림 시스템
- 예약 알림 (티켓 오픈, 공연 시작)
- FCM 푸시 알림
- 사용자별 맞춤 알림 설정
- TTL이 있는 알림 이력
- 대량 알림 작업 (N+1 최적화)

### 6. 보안 기능
- Rate limiting (기본, 엄격, 완화 3단계)
- 로그인 시도 Brute force 보호
- XSS 보호 (sanitize-html)
- NoSQL 인젝션 방지 (express-mongo-sanitize)
- CORS, Helmet, HPP
- 세션 보안 (HttpOnly, SameSite, Secure 쿠키)

## 데이터베이스

### Primary Database: `stagelives`
- **Users**: 사용자 계정, OAuth 제공자, 알림 설정
- **User Sessions**: 다중 디바이스 세션 추적
- **Scheduled Notifications**: 대기/전송된 알림 큐
- **Notification History**: TTL이 있는 사용자 알림 이력

### Concert Database: `concerts`
- **Concerts**: 콘서트 정보, 상태, 티켓 링크

### Article Database: `articles`
- **Articles**: 사용자 생성 콘텐츠
- **Categories**: 게시글 카테고리
- **Comments**: 게시글 댓글 및 대댓글
- **Tags**: 게시글 태그
- **Likes/Bookmarks**: 사용자 상호작용

### Chat Database: `chat`
- **Chat Rooms**: 채팅방 메타데이터
- **Messages**: 채팅 메시지

### Setlist Database: `setlists`
- **Setlists**: YouTube 및 Spotify 재생목록 URL이 포함된 콘서트 세트리스트

## 환경 설정

### 필수 환경 변수
- `MONGO_URI`: MongoDB 연결 문자열
- `REDIS_HOST`, `REDIS_PORT`: Redis 연결
- `SESSION_SECRET`: Express 세션 비밀 키
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth 자격 증명
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`: Apple OAuth 자격 증명
- `FIREBASE_SERVICE_ACCOUNT_PATH`: FCM 자격 증명
- `JWT_SECRET`: JWT 서명 비밀 키
- `FRONTEND_URL`: CORS를 위한 프론트엔드 애플리케이션 URL

### 배포
- 컨테이너화된 배포 설계 (Docker/Kubernetes)
- Readiness 및 Liveness 프로브를 위한 Health check 엔드포인트
- Graceful shutdown 처리
- `/metrics`에서 Prometheus 메트릭 노출

## 개발 워크플로우

1. **코드 구성**: 명확한 관심사 분리가 있는 기능 기반 구조
2. **에러 처리**: 중앙 집중식 에러 처리 미들웨어
3. **로깅**: Winston을 사용한 구조화된 로깅 (일별 로테이션 파일)
4. **테스팅**: 전용 테스트 모델 및 서비스
5. **API 문서**: `/api-docs`의 Swagger UI
6. **GraphQL**: `/graphql`의 Apollo Server

## 주요 설계 결정

1. **MongoDB Native Driver**: 성능과 유연성을 위해 Mongoose 대신 선택
2. **세션 기반 인증**: 더 나은 보안 제어를 위해 JWT 대신 선호
3. **세션용 Redis**: 재시작 간 세션 지속성 보장
4. **Graceful Degradation**: Redis 장애 시에도 시스템 계속 작동
5. **다중 디바이스 세션**: 플랫폼별 세션 관리 (웹 vs 앱)
6. **모듈식 Concert 모델**: 더 나은 코드 구성을 위한 기능 믹스인
7. **별도 Setlist 컬렉션**: 콘서트 세트리스트를 위한 정규화된 데이터 구조
8. **대량 작업**: 알림을 위한 N+1 쿼리 최적화

## API 규칙

- RESTful API 설계
- 일관된 오류 응답 형식
- 페이지네이션 지원 (page, limit 파라미터)
- 쿼리 파라미터를 통한 쿼리 필터
- 상태 코드: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 429 (Too Many Requests), 500 (Internal Server Error)

## 모니터링 및 관찰 가능성

- **로깅**: 일별 로테이션 파일이 있는 Winston
- **메트릭**: Prometheus 메트릭 (HTTP 요청, DB 연결, 오류)
- **Health Checks**: `/health`, `/health/liveness`, `/health/readiness`
- **연결 모니터링**: MongoDB 및 Redis 연결 풀 모니터링

## 팀 협업

- `docs/` 폴더의 명확한 문서
- 아키텍처 다이어그램 (ERD, 시퀀스 다이어그램)
- Swagger API 문서
- 복잡한 비즈니스 로직을 위한 코드 주석
- 타입 안정성을 위한 TypeScript

---

**마지막 업데이트**: 2025-11-20
**버전**: 1.1.0
