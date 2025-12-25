# stagelives Backend - Development Guide

**Last Updated**: 2024-12-26

## 개발 환경 설정

### 초기 설정

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start MongoDB and Redis (Docker)
docker-compose up -d

# Run development server
npm run dev
```

### 필수 환경 변수

```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=stagelives

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Session
SESSION_SECRET=your-secret-key

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase.json

# External APIs
SPOTIFY_CLIENT_ID=...
YOUTUBE_API_KEY=...
```

## 코딩 표준

### TypeScript

```typescript
// ✅ Explicit types
async function findUser(id: string | ObjectId): Promise<User | null> {
  const objectId = typeof id === 'string' ? new ObjectId(id) : id;
  return await collection.findOne({ _id: objectId });
}

// ❌ No types
async function findUser(id) {
  return await collection.findOne({ _id: id });
}
```

### 파일 구조

```
feature/
├── featureModel.ts       # Data model
├── featureService.ts     # Business logic
├── featureController.ts  # Request handlers
├── featureRoutes.ts      # Route definitions
└── index.ts             # Barrel exports
```

### 명명 규칙

- **파일**: camelCase (`userService.ts`)
- **클래스**: PascalCase (`UserModel`)
- **함수**: camelCase (`findUserById`)
- **상수**: UPPER_SNAKE_CASE (`MAX_ATTEMPTS`)
- **인터페이스**: PascalCase with 'I' (`IUser`)
- **Enum**: PascalCase (`UserStatus`)

### Import 구문

```typescript
// Node.js built-in
import { Request, Response } from 'express';

// Third-party
import { ObjectId } from 'mongodb';

// Internal
import { UserModel } from '@/models/user';
import logger from '@/utils/logger';
```

### Async/Await

```typescript
// ✅ Use async/await
async function createUser(data: UserData): Promise<User> {
  try {
    const result = await collection.insertOne(data);
    return { ...data, _id: result.insertedId };
  } catch (error) {
    logger.error('User creation failed', { error });
    throw new Error('Failed to create user');
  }
}

// ❌ Don't use promise chaining
function createUser(data: UserData) {
  return collection.insertOne(data)
    .then(result => ({ ...data, _id: result.insertedId }))
    .catch(error => { throw error });
}
```

## 에러 처리

### Service 계층

```typescript
// Services throw errors
export async function getUserById(id: string): Promise<User> {
  const user = await userModel.findById(id);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}
```

### Controller 계층

```typescript
// Controllers catch and pass to error middleware
export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    next(error);  // Pass to error middleware
  }
}
```

### Error Middleware

```typescript
// Error middleware handles all errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});
```

## 보안

### Input Validation

```typescript
import Joi from 'joi';

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(50).required()
});

// In controller
const { error, value } = userSchema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}
```

### XSS 방지

```typescript
import sanitizeHtml from 'sanitize-html';

// Sanitize HTML content
const cleanContent = sanitizeHtml(userInput, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p'],
  allowedAttributes: {
    'a': ['href']
  }
});
```

### NoSQL Injection 방지

```typescript
// ✅ Use express-mongo-sanitize middleware
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize());

// ✅ Validate and convert ObjectId
const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
if (!objectId) {
  throw new Error('Invalid ID format');
}
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

// Strict rate limiter (auth endpoints)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
});

app.use('/api/', generalLimiter);
app.use('/auth/login', strictLimiter);
```

## 데이터베이스 작업

### MongoDB 쿼리

```typescript
// ✅ Use indexes
await collection.createIndex({ email: 1 }, { unique: true });

// ✅ Use projection to limit fields
const user = await collection.findOne(
  { _id: userId },
  { projection: { password: 0 } }  // Exclude password
);

// ✅ Use bulk operations
await collection.bulkWrite([
  { insertOne: { document: doc1 } },
  { updateOne: { filter: { _id: id }, update: { $set: data } } }
]);

// ❌ Avoid N+1 queries
for (const user of users) {
  await collection.updateOne({ _id: user._id }, { $set: { active: true } });
}
```

### 트랜잭션

```typescript
const session = client.startSession();

try {
  await session.withTransaction(async () => {
    await usersCollection.insertOne(user, { session });
    await profilesCollection.insertOne(profile, { session });
  });
} finally {
  await session.endSession();
}
```

## 로깅

### Structured Logging

```typescript
// ✅ Good - structured with context
logger.info('User created', {
  userId: user._id,
  email: user.email,
  timestamp: new Date()
});

// ❌ Bad - unstructured string
logger.info(`User ${user.email} created`);
```

### 로그 레벨

- `error`: 예외, 크리티컬 에러
- `warn`: 성능 저하, Redis 다운
- `info`: 중요 이벤트 (로그인, 회원가입)
- `debug`: 상세 진단 (개발 전용)

### 민감 정보 제외

```typescript
// ✅ Exclude sensitive data
logger.info('Login attempt', {
  email: user.email,
  success: true
  // Don't log password, tokens, etc.
});

// ❌ Don't log sensitive data
logger.info('Login', { password: req.body.password });  // NEVER!
```

## 테스팅

### Unit Tests

```typescript
import { UserModel } from '@/models/user';

describe('UserModel', () => {
  let userModel: UserModel;

  beforeAll(async () => {
    userModel = new UserModel(testDb);
  });

  it('should create a user', async () => {
    const user = await userModel.create({
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User'
    });

    expect(user).toHaveProperty('_id');
    expect(user.email).toBe('test@example.com');
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import app from '@/app';

describe('POST /auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('userId');
  });
});
```

## 일반 작업

### 새 기능 추가

1. **Model 생성** (`src/models/feature/`)
   - Interface 정의
   - CRUD 메서드 구현
   - Singleton 패턴 사용

2. **Service 생성** (`src/services/feature/`)
   - 비즈니스 로직 구현
   - 에러 처리

3. **Controller 생성** (`src/controllers/feature/`)
   - Request/Response 처리
   - Input validation
   - Service 호출

4. **Route 정의** (`src/routes/feature/`)
   - 엔드포인트 매핑
   - Middleware 체인
   - Rate limiting

5. **테스트 작성**
   - Unit tests
   - Integration tests

### 데이터베이스 마이그레이션

```bash
# MongoDB shell
mongosh "mongodb://localhost:27017/stagelives"

# Create index
db.users.createIndex({ email: 1 }, { unique: true })

# Add field to all documents
db.concerts.updateMany({}, { $set: { featured: false } })

# Remove field
db.users.updateMany({}, { $unset: { oldField: "" } })
```

### 성능 최적화

```typescript
// ✅ Use aggregation for complex queries
const results = await collection.aggregate([
  { $match: { status: 'active' } },
  { $lookup: {
      from: 'concerts',
      localField: 'concertId',
      foreignField: '_id',
      as: 'concert'
  }},
  { $limit: 20 }
]).toArray();

// ✅ Add indexes for frequent queries
await collection.createIndex({ status: 1, createdAt: -1 });

// ✅ Use projection to reduce data transfer
const users = await collection.find(
  { status: 'active' },
  { projection: { _id: 1, name: 1, email: 1 } }
).toArray();
```

## 아키텍처

### 계층 구조

```
┌─────────────────────────────────┐
│         Controllers             │  HTTP 요청/응답 처리
│  (Input validation, Response)   │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│          Services               │  비즈니스 로직
│   (Business rules, Workflow)    │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│           Models                │  데이터 접근
│    (CRUD, Database queries)     │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│         MongoDB                 │
└─────────────────────────────────┘
```

### 모델 Mixin 패턴 (Concert 예시)

```typescript
// Base class
class ConcertBase {
  async findById(id: string) { /* ... */ }
  async create(data: Concert) { /* ... */ }
}

// Feature mixins
class ConcertSearch {
  async search(query: string) { /* ... */ }
}

class ConcertTicketing {
  async scheduleTicketNotification() { /* ... */ }
}

// Combined model
class ConcertModel extends ConcertBase
  implements ConcertSearch, ConcertTicketing {
  // All methods available
}
```

### Background Jobs

```typescript
import cron from 'node-cron';

// Concert status automation (runs every hour)
cron.schedule('0 * * * *', async () => {
  await updateConcertStatuses();
});

// Ticket notification worker (runs every minute)
cron.schedule('* * * * *', async () => {
  await processTicketNotifications();
});
```

## 배포

### Health Checks

```typescript
// Liveness probe - is the server running?
app.get('/health/liveness', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe - is the server ready to accept traffic?
app.get('/health/readiness', async (req, res) => {
  try {
    await db.admin().ping();
    await redisClient.ping();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});
```

### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  server.close(async () => {
    await mongoClient.close();
    await redisClient.quit();
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 30000);
});
```

### 환경별 설정

```typescript
const config = {
  development: {
    logLevel: 'debug',
    corsOrigin: '*',
    swagger: true
  },
  production: {
    logLevel: 'info',
    corsOrigin: process.env.FRONTEND_URL,
    swagger: false
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

## 트러블슈팅

### Redis 연결 실패

```typescript
// Graceful degradation
if (!redisClient.isReady) {
  logger.warn('Redis unavailable, using memory session');
  // Fallback to memory store
}
```

### MongoDB 느린 쿼리

```bash
# Enable profiling
db.setProfilingLevel(1, { slowms: 100 })

# Check slow queries
db.system.profile.find({ millis: { $gt: 100 } })

# Add missing indexes
db.collection.createIndex({ field: 1 })
```

### 메모리 누수

```bash
# Monitor memory usage
node --inspect app.ts

# Use heap snapshot
node --heap-prof app.ts
```

---

**버전**: 2.0.0
