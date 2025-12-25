# stagelives Backend - AI Assistant Guide

**Last Updated**: 2024-12-26

## 서비스 정보

- **서비스명**: stagelives (모든 사용자 대면에서 사용)
- **프로젝트명**: LiveLink (GitHub 레포지토리명만)
- **데이터베이스**: stagelives
- **도메인**: 콘서트/공연 관리 및 소셜 플랫폼

**중요**: 이메일, 푸시 알림, UI 등 사용자가 보는 모든 곳에서 **stagelives** 사용

## 프로젝트 개요

Node.js, Express, TypeScript, MongoDB 기반 콘서트 관리 플랫폼:

- 콘서트 검색 및 관리
- 소셜 기능 (좋아요, 북마크, 댓글)
- 실시간 채팅 (Socket.IO)
- 푸시 알림 (FCM)
- OAuth 인증 (Google, Apple)

## 기술 스택

- **Runtime**: Node.js >=18.0.0
- **Framework**: Express.js + TypeScript
- **Database**: MongoDB (Native Driver, Mongoose 사용 안 함)
- **Cache**: Redis (세션, rate limiting)
- **Auth**: Session-based (JWT 아님)
- **Realtime**: Socket.IO

## 프로젝트 구조

```
src/
├── config/         # OAuth, Redis, Swagger 설정
├── models/         # 데이터 모델 (MongoDB Native Driver)
├── services/       # 비즈니스 로직
├── controllers/    # 요청 핸들러
├── routes/         # API 라우트
├── middlewares/    # 인증, 보안, 에러 처리
├── utils/          # 로거, 캐시, DB 헬퍼
├── socket/         # Socket.IO 서버
└── app.ts          # 메인 진입점
```

## 핵심 데이터베이스

- `stagelives`: Users, Sessions, Notifications
- `concerts`: Concert 정보
- `articles`: 게시글, 댓글, 좋아요, 북마크
- `chat`: 채팅방, 메시지
- `setlists`: 콘서트 세트리스트 (YouTube/Spotify)

## AI 어시스턴트를 위한 중요 규칙

### 1. MongoDB Native Driver 사용 (Mongoose 아님)

```typescript
// ✅ Correct
const userModel = new UserModel();
const user = await userModel.findByEmail(email);

// ❌ Wrong - Don't suggest Mongoose
const user = await User.findOne({ email });
```

### 2. 세션 기반 인증 (JWT 아님)

```typescript
// ✅ Correct
req.session.userId = user._id;

// ❌ Wrong - Don't suggest JWT for primary auth
const token = jwt.sign({ userId: user._id }, secret);
```

### 3. 다중 기기 세션 관리

- 사용자는 플랫폼별로 하나의 세션 유지 (웹 1개, 앱 1개)
- 같은 플랫폼에서 새 로그인 시 기존 세션 교체
- 다른 플랫폼의 세션은 유지

### 4. 에러 처리 패턴

```typescript
// Services throw errors
throw new Error('User not found');

// Controllers catch and pass to middleware
try {
  await service.method();
} catch (error) {
  next(error);
}
```

### 5. 알림 시스템

- **ScheduledNotification**: 예약된 알림 큐
- **NotificationHistory**: 사용자 알림 받은편지함 (TTL)
- 콘서트 좋아요 시 알림 예약 (콘서트 생성 시 아님)

### 6. Concert-Setlist 관계

```typescript
// ✅ Separate collections
Concert { _id, uid, title, ... }
Setlist { concertId: "concert.uid", setList: [] }

// ❌ Don't embed
Concert { setlist: [] }  // Wrong!
```

## 피해야 할 함정

### ObjectId 처리

```typescript
// ✅ Always type-check
const objectId = typeof id === 'string' ? new ObjectId(id) : id;

// ❌ Don't assume type
return await collection.findOne({ _id: id });  // May fail
```

### N+1 쿼리

```typescript
// ✅ Use bulk operations
await model.bulkCreate(items);

// ❌ Don't loop
for (const item of items) {
  await model.create(item);  // N+1!
}
```

### 비밀번호 보안

```typescript
// ✅ Always hash
const hash = await bcrypt.hash(password, 10);

// ❌ Never store plain
user.password = req.body.password;  // NEVER!
```

## 코드 작성 체크리스트

새로운 엔드포인트 작성 시:

- [ ] Input validation (Joi/Zod)
- [ ] Authentication check
- [ ] Authorization check
- [ ] Rate limiting
- [ ] XSS/NoSQL injection 방지
- [ ] 에러 메시지 보안 (민감 정보 노출 안 함)
- [ ] Structured logging

## 명명 규칙

### 서비스 참조

- **모든 곳**: "stagelives" 사용
- 이메일/푸시: "stagelives"
- UI: "stagelives"
- 로그: "[stagelives]"
- 환경변수: `STAGELIVES_*`

```typescript
// ✅ Good
logger.info('[stagelives] User logged in', { userId });
const emailSubject = 'Welcome to stagelives!';

// ❌ Bad
const emailSubject = 'Welcome to LiveLink!';  // WRONG!
```

### 코드 명명

- **파일명**: camelCase (`userService.ts`)
- **클래스명**: PascalCase (`UserModel`)
- **함수명**: camelCase (`findUserById`)
- **상수명**: UPPER_SNAKE_CASE (`MAX_LOGIN_ATTEMPTS`)
- **인터페이스**: PascalCase with 'I' prefix (`IUser`)

## 로깅 전략

```typescript
// ✅ Structured logging
logger.info('User logged in', {
  userId: user._id,
  email: user.email,
  platform: 'web'
});

// ❌ String logs
logger.info(`User ${user.email} logged in`);
```

**로그 레벨**:
- `error`: 애플리케이션 에러
- `warn`: 성능 저하 (Redis down, slow query)
- `info`: 중요 이벤트 (로그인, 회원가입)
- `debug`: 상세 진단 (개발 전용)

## 환경별 동작

### Development
- Debug 레벨 로깅
- Swagger UI 활성화
- CORS 모든 출처 허용
- 상세 에러 메시지

### Production
- Info 레벨 로깅
- Swagger UI 비활성화
- CORS FRONTEND_URL만 허용
- 일반 에러 메시지
- Prometheus 메트릭 활성화

## 추가 문서

- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)**: 코딩 표준, 일반 작업, 아키텍처
- **[docs/architecture/ERD.md](../docs/architecture/ERD.md)**: DB 스키마
- **[docs/architecture/SEQUENCE_DIAGRAMS.md](../docs/architecture/SEQUENCE_DIAGRAMS.md)**: 비즈니스 플로우

## 구현 전 확인 질문

1. MongoDB Native Driver 사용? (Mongoose 아님)
2. 세션 기반 인증? (JWT 아님)
3. 인증/권한 부여 필요?
4. Rate limiting 필요?
5. Input validation/sanitization?
6. 에러 처리 포괄적?
7. 로깅 적절?
8. DB 쿼리 최적화?
9. 기존 패턴 준수?
10. 테스트 가능?

---

**버전**: 2.0.0
