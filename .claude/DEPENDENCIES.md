# stagelives Backend - 의존성

**서비스명**: stagelives

## 핵심 의존성

### 런타임 환경
- **Node.js**: >=18.0.0
- **TypeScript**: 5.3.3
- **ts-node**: 10.9.2 (TypeScript execution)

### 웹 프레임워크
- **express**: 4.18.2 - Fast, unopinionated web framework
- **cors**: 2.8.5 - Cross-Origin Resource Sharing
- **helmet**: 7.2.0 - Security headers middleware
- **hpp**: 0.2.3 - HTTP Parameter Pollution protection

### 데이터베이스
- **mongodb**: 6.20.0 - 공식 MongoDB Native Driver
  - 선택 이유: 쿼리에 대한 직접 제어, Mongoose보다 우수한 성능
  - 기능: Connection pooling, aggregation pipelines, indexes

### 캐시 및 세션 관리
- **redis**: 4.6.5 - Redis 클라이언트 (레거시 모드)
- **ioredis**: 5.6.1 - 대체 Redis 클라이언트 (사용 가능하지만 주요 클라이언트는 아님)
- **express-session**: 1.18.1 - Express용 세션 미들웨어
- **connect-redis**: 6.1.3 - Redis 세션 저장소 어댑터
  - 선택 이유: 서버 재시작 시 세션 유지, 다중 인스턴스 지원

### 인증 및 권한 부여
- **passport**: 0.7.0 - Authentication middleware
- **passport-google-oauth20**: 2.0.0 - Google OAuth 2.0 strategy
- **passport-apple**: 2.0.2 - Apple Sign In strategy
- **bcrypt**: 5.1.1 - Password hashing
- **jsonwebtoken**: 9.0.2 - JWT token generation/verification

### 보안
- **express-rate-limit**: 7.5.1 - Rate limiting middleware
- **rate-limit-redis**: 4.2.2 - Redis store for rate limiting
- **express-mongo-sanitize**: 2.2.0 - NoSQL injection prevention
- **sanitize-html**: 2.17.0 - XSS protection for HTML content
- **express-validator**: 7.2.1 - Request validation

### 실시간 통신
- **socket.io**: 4.7.5 - WebSocket library for real-time events
- **socket.io-redis**: (future consideration for multi-instance scaling)

### GraphQL
- **apollo-server-express**: 3.13.0 - GraphQL server
- **graphql**: 16.11.0 - GraphQL implementation
- **@graphql-tools/schema**: 10.0.6 - Schema composition utilities

### 로깅 및 모니터링
- **winston**: 3.18.3 - Logging library
- **winston-daily-rotate-file**: 5.0.0 - Log rotation
- **morgan**: 1.10.0 - HTTP request logger
- **prom-client**: 15.1.2 - Prometheus metrics

### 푸시 알림
- **firebase-admin**: 13.0.2 - Firebase Cloud Messaging (FCM)

### API 문서화
- **swagger-jsdoc**: 6.2.8 - Generate Swagger from JSDoc comments
- **swagger-ui-express**: 5.0.1 - Serve Swagger UI

### 작업 스케줄링
- **node-cron**: 3.0.3 - Cron job 스케줄러
  - 사용 목적: 콘서트 상태 업데이트, 알림 워커

### 유효성 검사
- **joi**: 17.13.3 - Schema validation (alternative to express-validator)
- **zod**: 3.24.2 - TypeScript-first schema validation (available)

### 유틸리티
- **dotenv**: 16.4.7 - Environment variable management
- **axios**: 1.7.9 - HTTP client
- **uuid**: 11.0.6 - UUID generation

### 외부 API 통합
- **googleapis**: 144.0.0 - Google APIs (YouTube Music)
- **spotify-web-api-node**: 5.0.2 - Spotify Web API wrapper

## 개발 의존성

### TypeScript
- **@types/node**: 22.10.5
- **@types/express**: 5.0.0
- **@types/express-session**: 1.18.1
- **@types/passport**: 1.0.17
- **@types/passport-google-oauth20**: 2.0.17
- **@types/bcrypt**: 5.0.2
- **@types/cors**: 2.8.17
- **@types/morgan**: 1.9.9
- **@types/swagger-jsdoc**: 6.0.4
- **@types/swagger-ui-express**: 4.1.6

### 테스팅
- **jest**: 29.7.0 - Testing framework
- **ts-jest**: 29.2.5 - TypeScript preprocessor for Jest
- **@types/jest**: 29.5.14
- **supertest**: 7.0.0 - HTTP assertion library
- **@types/supertest**: 6.0.2

### 코드 품질
- **eslint**: 9.18.0 - Linting
- **@typescript-eslint/parser**: 8.19.1
- **@typescript-eslint/eslint-plugin**: 8.19.1
- **prettier**: 3.4.2 - Code formatting
- **husky**: 9.1.7 - Git hooks
- **lint-staged**: 15.3.0 - Run linters on staged files

### 개발 도구
- **nodemon**: 3.1.9 - Auto-restart on file changes
- **concurrently**: 9.1.2 - Run multiple commands concurrently

## 의존성 선택 이유

### MongoDB Native Driver를 Mongoose 대신 선택한 이유
1. **성능**: 오버헤드 감소, 쿼리에 대한 직접 제어
2. **유연성**: 런타임에 스키마 제약 없음
3. **TypeScript**: 사용자 정의 인터페이스로 더 나은 타입 추론
4. **집계**: 더 강력한 aggregation pipeline 지원

### JWT 대신 세션 기반 인증을 선택한 이유
1. **취소 가능성**: 세션을 즉시 무효화할 수 있음
2. **보안**: 토큰이 브라우저가 아닌 서버 측에 저장됨
3. **상태 유지**: 다중 기기 세션 관리에 적합
4. **단순함**: Refresh token 로테이션 로직 불필요

### 세션을 위해 Redis를 선택한 이유
1. **지속성**: 서버 재시작 후에도 세션 유지
2. **확장성**: 다중 인스턴스 배포를 위한 공유 세션 저장소
3. **성능**: 빠른 인메모리 조회
4. **TTL**: 오래된 세션 자동 만료

### Native WebSocket 대신 Socket.IO를 선택한 이유
1. **폴백**: long-polling으로 자동 폴백
2. **방 관리**: 내장된 방 관리 기능
3. **이벤트**: 쉬운 이벤트 기반 통신
4. **재연결**: 자동 재연결 처리

### console.log 대신 Winston을 선택한 이유
1. **구조화된 로깅**: 로그 집계를 위한 JSON 형식
2. **로그 레벨**: 다양한 상세 수준 (error, warn, info, debug)
3. **전송**: 여러 출력 (파일, 콘솔, 외부 서비스)
4. **로테이션**: 자동 로그 파일 로테이션

## 버전 관리

### 고정 버전 vs 범위 버전

**고정 버전** (안정성을 위한 정확한 버전):
- express: 4.18.2
- mongodb: 6.20.0
- redis: 4.6.5
- socket.io: 4.7.5

**캐럿 범위** (마이너/패치 업데이트 허용):
- ^typescript: 5.3.3
- ^winston: 3.18.3
- ^bcrypt: 5.1.1

### 의존성 업데이트

```bash
# Check for outdated packages
npm outdated

# Update within semver ranges
npm update

# Update major versions (with caution)
npm install <package>@latest

# Audit for vulnerabilities
npm audit
npm audit fix
```

## 중요한 의존성

다음 의존성은 핵심 기능에 필수적입니다:

1. **express** - 애플리케이션 프레임워크
2. **mongodb** - 데이터베이스 드라이버
3. **redis** - 세션 및 캐시 저장소
4. **passport** - 인증
5. **socket.io** - 실시간 통신
6. **firebase-admin** - 푸시 알림
7. **winston** - 로깅

이러한 패키지의 주요 변경 사항은 철저한 테스트가 필요합니다.

## 선택적 의존성

기능이 필요하지 않은 경우 제거할 수 있습니다:

- **apollo-server-express** - GraphQL이 필요한 경우에만
- **swagger-ui-express** - API 문서화를 위해서만
- **googleapis** - YouTube 통합을 위해서만
- **spotify-web-api-node** - Spotify 통합을 위해서만

## 알려진 문제 및 해결 방법

### Redis 레거시 모드
- **문제**: connect-redis 6.x는 레거시 모드의 redis가 필요
- **해결 방법**: `legacyMode: true`로 `redis.v4` 사용
- **향후 계획**: 안정화되면 connect-redis 7.x로 업그레이드

### Socket.IO Redis 어댑터
- **상태**: 아직 구현되지 않음
- **이유**: 현재 단일 인스턴스 배포
- **향후 계획**: 다중 인스턴스 확장을 위해 `socket.io-redis` 추가

## 의존성 보안

### 자동 스캔
```bash
# GitHub Dependabot: 활성화됨
# npm audit: 정기적으로 실행
npm audit

# Snyk: 선택적 서드파티 스캔
npx snyk test
```

### 업데이트 정책
- **보안 패치**: 즉시 적용
- **마이너 버전**: 월별 검토
- **메이저 버전**: 테스트와 함께 분기별 검토

## 라이선스 준수

모든 의존성은 허용적 라이선스 사용 (MIT, Apache 2.0, ISC):
- GPL 의존성 없음 (copyleft 제한 회피)
- 상업적 사용 허용
- 저작자 표시 필요 (NOTICES 파일 참조)

---

**최종 업데이트**: 2025-11-20
**버전**: 1.1.0
