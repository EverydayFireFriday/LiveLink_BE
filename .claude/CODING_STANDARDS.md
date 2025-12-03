# stagelives Backend - 코딩 표준

**서비스명**: stagelives

## TypeScript 가이드라인

### 타입 안전성

```typescript
// ✅ Good: Explicit types for function parameters and return values
async function findUserById(id: string | ObjectId): Promise<User | null> {
  const objectId = typeof id === 'string' ? new ObjectId(id) : id;
  return await this.userCollection.findOne({ _id: objectId });
}

// ❌ Bad: No type annotations
async function findUserById(id) {
  return await this.userCollection.findOne({ _id: id });
}
```

### 인터페이스

```typescript
// ✅ Good: Prefix interfaces with 'I' for consistency
export interface IUser {
  _id?: ObjectId;
  username: string;
  email: string;
  status: UserStatus;
}

// ✅ Good: Use enums for fixed sets of values
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}
```

### Async/Await

```typescript
// ✅ Good: Use async/await instead of promises
async function createUser(userData: UserData): Promise<User> {
  try {
    const result = await this.userCollection.insertOne(userData);
    return { ...userData, _id: result.insertedId };
  } catch (error) {
    logger.error('Failed to create user:', error);
    throw new Error('User creation failed');
  }
}

// ❌ Bad: Promise chaining
function createUser(userData: UserData) {
  return this.userCollection.insertOne(userData)
    .then(result => ({ ...userData, _id: result.insertedId }))
    .catch(error => {
      logger.error('Failed to create user:', error);
      throw new Error('User creation failed');
    });
}
```

## 코드 구조

### 파일 구조

```
feature/
├── featureModel.ts        # Data model
├── featureService.ts      # Business logic
├── featureController.ts   # Request handlers
├── featureRoutes.ts       # Route definitions
├── featureValidation.ts   # Input validation schemas
└── index.ts              # Barrel exports
```

### 명명 규칙

- **파일명**: camelCase (예: `userService.ts`, `concertModel.ts`)
- **클래스명**: PascalCase (예: `UserModel`, `ConcertService`)
- **함수명**: camelCase (예: `findUserById`, `createConcert`)
- **상수명**: UPPER_SNAKE_CASE (예: `MAX_LOGIN_ATTEMPTS`, `SESSION_TTL`)
- **인터페이스명**: 'I' 접두사가 있는 PascalCase (예: `IUser`, `IConcert`)
- **Enum명**: PascalCase (예: `UserStatus`, `ConcertStatus`)

### Import 구문

```typescript
// ✅ Good: Organized imports
// Node.js built-in modules
import { Request, Response } from 'express';

// Third-party libraries
import { ObjectId } from 'mongodb';
import logger from 'winston';

// Internal modules (absolute paths)
import { UserModel } from '../../models/auth/user';
import { validateEmail } from '../../utils/validation';

// Type imports
import type { User, UserStatus } from '../../types/user';

// ❌ Bad: Mixed and disorganized
import logger from 'winston';
import { UserModel } from '../../models/auth/user';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
```

## 에러 처리

### 중앙 집중식 에러 처리

```typescript
// ✅ Good: Throw descriptive errors
async function findByEmail(email: string): Promise<User | null> {
  try {
    return await this.userCollection.findOne({ email });
  } catch (error) {
    logger.error('Database query failed:', { email, error });
    throw new Error('Failed to retrieve user');
  }
}

// Controller
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### 에러 응답 형식

```typescript
// ✅ Good: Consistent error response structure
res.status(400).json({
  error: 'ValidationError',
  message: 'Invalid email format',
  details: {
    field: 'email',
    value: req.body.email
  }
});

// ❌ Bad: Inconsistent error responses
res.status(400).send('Bad email');
```

## 데이터베이스 작업

### MongoDB 모범 사례

```typescript
// ✅ Good: Use indexes efficiently
async findByUserId(userId: ObjectId): Promise<Notification[]> {
  return this.collection
    .find({ userId, status: 'pending' })  // Compound index: {userId: 1, status: 1}
    .sort({ scheduledAt: 1 })              // Index: {scheduledAt: 1}
    .limit(100)
    .toArray();
}

// ✅ Good: Avoid N+1 queries with bulk operations
async bulkCreate(notifications: Notification[]): Promise<Notification[]> {
  const result = await this.collection.insertMany(notifications);
  return notifications.map((n, i) => ({ ...n, _id: result.insertedIds[i] }));
}

// ❌ Bad: N+1 query problem
for (const notification of notifications) {
  await this.collection.insertOne(notification);  // Each insert is a separate DB call
}
```

### ObjectId 처리

```typescript
// ✅ Good: Type-safe ObjectId conversion
async findById(id: string | ObjectId): Promise<User | null> {
  const objectId = typeof id === 'string' ? new ObjectId(id) : id;
  return await this.userCollection.findOne({ _id: objectId });
}

// ❌ Bad: No type checking
async findById(id: any): Promise<User | null> {
  return await this.userCollection.findOne({ _id: new ObjectId(id) });
}
```

## 로깅

### 구조화된 로깅

```typescript
// ✅ Good: Structured logs with context
logger.info('User logged in', {
  userId: user._id,
  email: user.email,
  platform: req.headers['x-platform'],
  ip: req.ip
});

logger.error('Failed to send notification', {
  notificationId: notification._id,
  userId: notification.userId,
  error: error.message,
  stack: error.stack
});

// ❌ Bad: Unstructured string logs
logger.info(`User ${user.email} logged in`);
logger.error(`Error: ${error.message}`);
```

### 로그 레벨

- **error**: 애플리케이션 에러, 예외
- **warn**: 성능 저하, 복구 가능한 문제
- **info**: 중요한 비즈니스 이벤트 (로그인, 회원가입 등)
- **debug**: 상세한 진단 정보 (개발 환경 전용)

### 로그 메시지 규칙

```typescript
// ✅ Good: 서비스명 접두사 사용
logger.info('[stagelives] User logged in', { userId, email });
logger.error('[stagelives] Database connection failed', { error });

// ✅ Good: 모듈별 접두사
logger.info('[stagelives:auth] OAuth login successful', { provider: 'google' });
logger.warn('[stagelives:concert] Slow query detected', { duration });

// ❌ Bad: 접두사 없음
logger.info('User logged in');
```

## 보안 모범 사례

### 입력 유효성 검사

```typescript
// ✅ Good: Validate and sanitize all inputs
import sanitizeHtml from 'sanitize-html';

async createArticle(req: Request, res: Response) {
  const { title, content } = req.body;

  // Sanitize HTML content
  const sanitizedContent = sanitizeHtml(content, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: {}
  });

  // Validate with schema
  const { error, value } = articleSchema.validate({
    title,
    content: sanitizedContent
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Proceed with sanitized data
}
```

### 비밀번호 처리

```typescript
// ✅ Good: Hash passwords with bcrypt
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// ❌ Bad: Storing plain-text passwords
user.password = req.body.password;  // NEVER DO THIS
```

### NoSQL Injection 방지

```typescript
// ✅ Good: Use express-mongo-sanitize
import mongoSanitize from 'express-mongo-sanitize';

app.use(mongoSanitize());  // Removes $ and . from user input

// ✅ Good: Use typed queries
const user = await userCollection.findOne({
  email: email  // Type-checked string
});

// ❌ Bad: Direct user input in queries
const user = await userCollection.findOne(req.body);  // Can inject operators
```

## API 설계

### RESTful 규칙

```
GET    /concerts          - List concerts (with pagination)
GET    /concerts/:id      - Get single concert
POST   /concerts          - Create concert
PUT    /concerts/:id      - Update concert
DELETE /concerts/:id      - Delete concert

POST   /concerts/:id/like - Like concert
DELETE /concerts/:id/like - Unlike concert
```

### 응답 형식

```typescript
// ✅ Good: Consistent response structure
// Success
res.status(200).json({
  data: concerts,
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    pages: 8
  }
});

// Error
res.status(400).json({
  error: 'ValidationError',
  message: 'Invalid input parameters',
  details: validationErrors
});
```

### 상태 코드

- **200 OK**: 성공적인 GET, PUT, DELETE
- **201 Created**: 성공적인 POST
- **400 Bad Request**: 잘못된 입력
- **401 Unauthorized**: 인증 필요
- **403 Forbidden**: 권한 부족
- **404 Not Found**: 리소스를 찾을 수 없음
- **409 Conflict**: 리소스 중복
- **429 Too Many Requests**: Rate limit 초과
- **500 Internal Server Error**: 서버 에러

## 테스팅

### 모델 테스트

```typescript
describe('UserModel', () => {
  beforeEach(async () => {
    // Setup test database
    await setupTestDB();
  });

  afterEach(async () => {
    // Cleanup
    await teardownTestDB();
  });

  it('should create a user with valid data', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      termsConsents: []
    };

    const user = await userModel.createUser(userData);

    expect(user._id).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.status).toBe(UserStatus.PENDING_VERIFICATION);
  });

  it('should throw error for duplicate email', async () => {
    // ... test implementation
  });
});
```

## 주석 및 문서화

### JSDoc 주석

```typescript
/**
 * Find pending notifications that should be sent
 *
 * @param beforeDate - Only return notifications scheduled before this date
 * @param limit - Maximum number of notifications to return (default: 100)
 * @returns Array of scheduled notifications
 */
public async findPendingNotifications(
  beforeDate: Date,
  limit: number = 100
): Promise<IScheduledNotification[]> {
  return this.collection
    .find({
      status: NotificationStatus.PENDING,
      scheduledAt: { $lte: beforeDate },
    })
    .limit(limit)
    .sort({ scheduledAt: 1 })
    .toArray();
}
```

### 인라인 주석

```typescript
// ✅ Good: Explain complex business logic
// Calculate scheduled notification time based on user preferences
// For ticket opening at 2025-01-01 12:00, and preference [10, 30, 60]:
// - First notification: 2025-01-01 11:50 (10 min before)
// - Second notification: 2025-01-01 11:30 (30 min before)
// - Third notification: 2025-01-01 11:00 (60 min before)
const scheduledAt = new Date(ticketOpenDate.getTime() - (minutes * 60 * 1000));

// ❌ Bad: State the obvious
// Increment counter by 1
counter++;
```

## Git 커밋 메시지

```
형식: <type>(<scope>): <subject>

타입:
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 변경
- style: 코드 스타일 변경 (포맷팅 등)
- refactor: 코드 리팩토링
- test: 테스트 추가 또는 업데이트
- chore: 유지보수 작업

예시:
feat(auth): add Google OAuth authentication
fix(concert): resolve status update scheduler issue
docs(api): update Swagger documentation for notifications
refactor(user): simplify session management logic
```

## 성능 가이드라인

1. **블로킹 작업 방지**: async/await 사용, 이벤트 루프 블록 금지
2. **Connection Pooling**: 데이터베이스 연결 재사용
3. **캐싱**: 자주 액세스하는 데이터를 Redis에 캐싱
4. **페이지네이션**: 큰 결과 집합은 항상 페이지네이션
5. **인덱스**: 자주 쿼리되는 필드에 인덱스 생성
6. **대량 작업**: 루프 대신 `insertMany`, `updateMany` 사용
7. **N+1 쿼리**: 집계 파이프라인 또는 대량 작업 사용

## 코드 리뷰 체크리스트

- [ ] TypeScript 타입이 제대로 정의됨
- [ ] 에러 처리가 포괄적임
- [ ] 로깅에 필요한 컨텍스트 포함
- [ ] 입력 유효성 검사가 구현됨
- [ ] 보안 모범 사례를 따름
- [ ] 데이터베이스 쿼리가 최적화됨
- [ ] 코드에 적절한 주석 추가
- [ ] 테스트가 포함됨 (해당하는 경우)
- [ ] API 응답이 규칙을 따름
- [ ] 하드코딩된 비밀 또는 자격 증명이 없음

---

**최종 업데이트**: 2025-11-20
**버전**: 1.1.0
