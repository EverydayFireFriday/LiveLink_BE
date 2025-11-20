# stagelives Backend - AI 컨텍스트

## AI 어시스턴트가 알아야 할 사항

이 파일은 LiveLink 백엔드 코드베이스에서 작업하는 AI 어시스턴트(Claude, ChatGPT 등)를 위한 필수 컨텍스트를 제공합니다.

## 서비스 정보

- **서비스명**: stagelives (실제 서비스명, 모든 곳에서 사용)
- **프로젝트명**: LiveLink (GitHub 레포지토리/프로젝트 폴더명)
- **데이터베이스명**: stagelives
- **도메인**: 콘서트/공연 관리 및 소셜 플랫폼

**중요**: 사용자에게 보이는 모든 곳(이메일, 푸시 알림, UI)에서 **stagelives**를 사용합니다.

## 프로젝트 특성

stagelives는 다음과 같은 특성을 가진 **프로덕션 준비 콘서트 관리 플랫폼**입니다:

- **단계**: 활발한 개발 중, 일부 기능은 프로덕션에 배포됨
- **팀 규모**: 소규모 팀 (1-3명의 개발자)
- **코드 품질**: TypeScript, 린팅, 테스팅을 통한 높은 표준
- **아키텍처**: 모듈화, 잘 문서화됨, 모범 사례 준수
- **규모**: 수천 명의 동시 사용자를 위해 설계됨

## 중요한 설계 패턴

### 1. 데이터베이스 접근 패턴

**MongoDB Native Driver** (Mongoose가 아님):
```typescript
// ✅ Correct approach
const userModel = new UserModel();
const user = await userModel.findByEmail(email);

// ❌ Wrong approach (don't suggest Mongoose)
const user = await User.findOne({ email });
```

**선택 이유**: 더 나은 성능, 더 많은 제어, TypeScript 친화적

### 2. 인증 패턴

**세션 기반** (JWT가 아님):
```typescript
// ✅ Correct approach
req.session.userId = user._id;

// ❌ Wrong approach (don't suggest JWT for primary auth)
const token = jwt.sign({ userId: user._id }, secret);
```

**선택 이유**: 더 나은 보안, 더 쉬운 취소, 다중 기기 관리

### 3. 다중 기기 세션 관리

**핵심 기능**: 사용자는 여러 활성 세션을 가질 수 있음 (웹 + 모바일):
```typescript
// Each platform gets ONE session
// New login on same platform replaces old session
// Different platforms maintain separate sessions
```

**중요**: 기본적으로 전역 로그아웃을 제안하지 말 것 - 플랫폼별 로그아웃 구현

### 4. 에러 처리 패턴

**중앙 집중식 에러 처리**:
```typescript
// ✅ Services throw errors
throw new Error('User not found');

// ✅ Controllers catch and handle
try {
  await service.method();
} catch (error) {
  next(error);  // Pass to error middleware
}

// ✅ Error middleware responds
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

### 5. 알림 시스템 아키텍처

**2개 컬렉션 패턴**:
1. **ScheduledNotification**: 미래 알림 (pending, sent, failed, cancelled)
2. **NotificationHistory**: 사용자 알림 inbox (TTL 포함)

**중요**: 알림은 콘서트 생성 시가 아닌 사용자가 콘서트를 좋아할 때 예약됨

### 6. Concert-Setlist 관계

**정규화된 데이터 구조**:
```typescript
// ✅ Separate collections
Concert { _id, uid, title, ... }
Setlist { _id, concertId: "concert.uid", setList: [], ... }

// ❌ Don't embed setlist in concert
Concert { _id, setlist: [] }  // Wrong!
```

**선택 이유**: Setlist는 크고, 선택적이며, 별도로 관리됨

## 피해야 할 일반적인 함정

### 1. ObjectId 처리

```typescript
// ✅ Always type-check ObjectId parameters
async findById(id: string | ObjectId): Promise<User | null> {
  const objectId = typeof id === 'string' ? new ObjectId(id) : id;
  return await this.collection.findOne({ _id: objectId });
}

// ❌ Don't assume type
async findById(id: any) {
  return await this.collection.findOne({ _id: id });  // May fail
}
```

### 2. N+1 쿼리 문제

```typescript
// ✅ Use bulk operations
const notifications = await model.bulkCreate(notificationsArray);

// ❌ Don't loop with individual inserts
for (const notification of notifications) {
  await model.create(notification);  // N+1 problem!
}
```

### 3. 비밀번호 보안

```typescript
// ✅ Always hash passwords
const passwordHash = await bcrypt.hash(password, 10);

// ❌ Never store plain passwords
user.password = req.body.password;  // NEVER DO THIS
```

### 4. Redis 가용성

```typescript
// ✅ Graceful degradation when Redis is down
if (!redisClient.isReady) {
  logger.warn('Redis unavailable, using in-memory session');
  // Fallback logic
}

// ❌ Don't crash when Redis is down
const session = await redisClient.get(key);  // May throw error
```

## 모델 구조 규칙

### 기능 기반 Mixin (Concert 모델)

```typescript
// Base class
class ConcertBase { /* core CRUD */ }

// Feature classes
class ConcertSearch { /* search methods */ }
class ConcertTicketing { /* ticket methods */ }

// Combined using mixins
class ConcertModel extends ConcertBase
  implements ConcertSearch, ConcertTicketing { }
```

**중요**: 콘서트 기능 추가 시 `src/models/concert/features/`의 mixin 패턴을 따를 것

### Singleton 패턴

```typescript
// ✅ Models use singleton pattern
export const initializeConcertModel = (db: Db): ConcertModel => {
  if (!concertModel) {
    concertModel = new ConcertModel(db);
  }
  return concertModel;
};

// ❌ Don't create new instances
const model = new ConcertModel(db);  // Creates duplicate connections
```

## OAuth 구현 세부사항

### 다중 제공자 지원

사용자는 하나의 계정에 **여러 OAuth 제공자**를 연결할 수 있음:

```typescript
interface User {
  oauthProviders?: OAuthProvider[];  // Array, not single object
}

// When user already exists with email:
// 1. Find by email
// 2. Add OAuth provider to array
// 3. User now has both email/password AND OAuth login
```

**중요**: OAuth 추가 시 기존 로그인 방법을 덮어쓰지 말 것

### OAuth 플로우 상태

- `pending_registration`: OAuth 사용자가 프로필 완성 필요 (name, birthDate)
- `active`: 완전히 등록된 사용자

## 백그라운드 작업 및 스케줄러

### 콘서트 상태 자동화

```typescript
// Runs every hour
// upcoming → ongoing (when concert starts)
// ongoing → completed (when concert ends)
```

**중요**: CRUD 작업에서 콘서트 상태를 수동으로 업데이트하지 말 것

### 알림 워커

1. **Ticket Notification Worker**: 티켓 오픈 알림 전송
2. **Concert Start Worker**: 콘서트 시작 알림 전송
3. **Notification Recovery**: 서버 재시작 시 누락된 알림 재예약

**중요**: 워커는 재시도 로직이 있어 장애 허용적임

## API 명명 규칙

### 라우트 패턴

```
GET    /resource              # List (with pagination)
GET    /resource/:id          # Get single
POST   /resource              # Create
PUT    /resource/:id          # Full update
PATCH  /resource/:id          # Partial update
DELETE /resource/:id          # Delete

POST   /resource/:id/action   # Custom actions (like, unlike)
DELETE /resource/:id/action   # Reverse action
```

### 쿼리 파라미터

```
?page=1&limit=20              # Pagination
?status=active                # Filters
?search=keyword               # Search
?sort=createdAt&order=desc    # Sorting
```

## 새로운 코드를 위한 보안 체크리스트

새로운 엔드포인트 작성 시 확인 사항:

1. [ ] Input validation (Joi/Zod schema)
2. [ ] Authentication check (if needed)
3. [ ] Authorization check (user owns resource)
4. [ ] Rate limiting applied
5. [ ] Input sanitization (XSS, NoSQL injection)
6. [ ] Error messages don't leak sensitive info
7. [ ] Logging includes context (userId, action)

## 테스팅 철학

- **Unit Tests**: 모델 및 유틸리티용
- **Integration Tests**: 서비스 및 컨트롤러용
- **E2E Tests**: 중요한 사용자 플로우용
- **Test DB**: 테스트용 별도 데이터베이스 (자동 정리)

**중요**: 테스트에 프로덕션 DB 사용 금지

## 로깅 전략

```typescript
// ✅ Structured logging with context
logger.info('User logged in', {
  userId: user._id,
  email: user.email,
  platform: 'web'
});

// ❌ Unstructured string logs
logger.info(`User ${user.email} logged in`);
```

**로그 레벨**:
- `error`: 애플리케이션 에러, 예외
- `warn`: 성능 저하 (Redis 다운, 느린 쿼리)
- `info`: 중요한 이벤트 (로그인, 회원가입, 콘서트 생성)
- `debug`: 상세한 진단 (개발 환경 전용)

## 외부 API 통합

### YouTube Music

- 사용 목적: 콘서트 setlist 플레이리스트
- 라이브러리: `googleapis`
- API Key: `.env`에서 필수

### Spotify

- 사용 목적: 콘서트 setlist 플레이리스트
- 라이브러리: `spotify-web-api-node`
- OAuth: Client credentials flow

### Firebase Cloud Messaging (FCM)

- 사용 목적: 푸시 알림
- 라이브러리: `firebase-admin`
- Service Account: JSON 파일 필수

**중요**: 모든 외부 API 호출에는 에러 처리 및 재시도가 있어야 함

## 환경별 동작

### Development
- 상세 로깅 (debug 레벨)
- Swagger UI 활성화
- CORS가 모든 출처 허용
- 상세한 에러 메시지

### Production
- 최소 로깅 (info 레벨)
- Swagger UI 비활성화
- CORS가 FRONTEND_URL로 제한
- 일반적인 에러 메시지
- 메트릭 활성화

## 코드 변경 제안 시

1. **기존 패턴 따르기**: 필요한 경우가 아니면 새로운 패턴 도입 금지
2. **TypeScript 우선**: 항상 타입 주석 제공
3. **에러 처리**: try-catch 블록 포함
4. **로깅**: 적절한 로그 문 추가
5. **보안**: 보안 영향 고려
6. **성능**: N+1 쿼리 방지, 인덱스 사용
7. **문서화**: 관련 문서 및 주석 업데이트

## 구현 전 확인 질문

1. MongoDB Native Driver를 사용하는가 (Mongoose가 아닌)?
2. 세션 기반 인증을 사용하는가 (JWT가 아닌)?
3. 인증/권한 부여가 필요한가?
4. Rate limiting이 필요한가?
5. 입력이 검증되고 정제되는가?
6. 에러 처리가 포괄적인가?
7. 로깅이 적절한가?
8. 데이터베이스 쿼리가 최적화되었는가?
9. 기존 패턴을 따르는가?
10. 테스트되었는가 (또는 테스트 가능한가)?

## 유용한 파일 위치

- **Models**: `src/models/[feature]/`
- **Services**: `src/services/[feature]/`
- **Controllers**: `src/controllers/[feature]/`
- **Routes**: `src/routes/[feature]/`
- **Middleware**: `src/middlewares/`
- **Utils**: `src/utils/`
- **Config**: `src/config/`
- **Tests**: `src/**/__tests__/`

## 명명 규칙 및 용어

### 서비스 참조 시
- **모든 곳에서**: "stagelives" 사용
- 이메일/푸시 알림: "stagelives"
- UI 텍스트: "stagelives"
- API 응답: "stagelives"
- 로그 메시지: "[stagelives]"
- 데이터베이스: "stagelives"
- 환경 변수: `STAGELIVES_*`

**LiveLink**: GitHub 레포지토리/프로젝트 폴더명으로만 사용 (코드에서 사용 안 함)

### 예시
```typescript
// ✅ Good: 모든 곳에서 stagelives 사용
logger.info('[stagelives] User logged in', { userId });
const DB_NAME = 'stagelives';
const serviceName = 'stagelives';

// ✅ Good: 사용자 대면 메시지도 stagelives
const emailSubject = 'Welcome to stagelives!';
const appName = 'stagelives';
const pushNotification = {
  title: 'stagelives',
  body: 'stagelives에서 새로운 콘서트가 등록되었습니다'
};

// ❌ Bad: LiveLink 사용하지 말것
const emailSubject = 'Welcome to LiveLink!';  // WRONG!
const appName = 'LiveLink';  // WRONG!
```

## 최근 변경 사항 및 진화

- **추가됨**: YouTube/Spotify 통합이 있는 Setlist 기능 (2025년 11월)
- **수정됨**: 알림 스케줄링 N+1 쿼리 (2025년 11월)
- **업데이트됨**: 다중 기기 세션 관리 (2025년 10월)
- **개선됨**: 대량 알림 작업 (2025년 11월)

## 문서화

중요한 변경 사항이 있을 때 항상 다음 문서를 업데이트하세요:

- `docs/architecture/ERD.md` - 데이터베이스 스키마 변경
- `docs/architecture/SEQUENCE_DIAGRAMS.md` - 새로운 플로우
- `docs/architecture/README.md` - 아키텍처 변경
- `.claude/` 파일들 - AI 어시스턴트용 컨텍스트

---

**최종 업데이트**: 2025-11-20
**버전**: 1.1.0
**AI 어시스턴트용**: 이 컨텍스트는 코드베이스를 더 잘 이해하는 데 도움이 됩니다. 구현 세부사항은 항상 실제 코드를 참조하세요.
