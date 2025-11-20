# stagelives Backend - 일반 작업

**서비스명**: stagelives

## 개발 환경 설정

### 초기 설정

```bash
# Clone repository
git clone <repository-url>
cd LiveLink_BE

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB and Redis (using Docker)
docker-compose up -d

# Run in development mode
npm run dev

# Or use nodemon for auto-restart
npm run dev:watch
```

### 환경 변수 설정

`.env` 파일 생성:

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
REDIS_PASSWORD=

# Session
SESSION_SECRET=your-secret-key-here

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# OAuth - Apple
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=./config/AuthKey.p8

# Firebase (FCM)
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# JWT
JWT_SECRET=your-jwt-secret

# Spotify
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# YouTube
YOUTUBE_API_KEY=your-youtube-api-key
```

## 데이터베이스 작업

### MongoDB 연결

```bash
# Using MongoDB shell
mongosh "mongodb://localhost:27017/stagelives"

# Check collections
show collections

# Query users
db.users.find().pretty()

# Create indexes manually
db.users.createIndex({ email: 1 }, { unique: true })
```

### 데이터베이스 백업

```bash
# Backup all databases
mongodump --uri="mongodb://localhost:27017" --out=/backup/$(date +%Y%m%d)

# Backup specific database
mongodump --uri="mongodb://localhost:27017/stagelives" --out=/backup/stagelives

# Restore
mongorestore --uri="mongodb://localhost:27017" /backup/20250120
```

### Redis 작업

```bash
# Connect to Redis
redis-cli

# Check connected clients
CLIENT LIST

# View all keys
KEYS *

# Check session
GET sess:your-session-id

# Flush all data (CAUTION!)
FLUSHALL
```

## 새로운 기능 추가

### 1. 새로운 API 엔드포인트 추가

```bash
# Step 1: Define data model
src/models/feature/featureModel.ts

# Step 2: Create service
src/services/feature/featureService.ts

# Step 3: Create controller
src/controllers/feature/featureController.ts

# Step 4: Define routes
src/routes/feature/featureRoutes.ts

# Step 5: Register routes in app.ts
src/app.ts
```

**예시**: "Review" 기능 추가

```typescript
// 1. Model (src/models/review/review.ts)
export interface IReview {
  _id: ObjectId;
  concertId: ObjectId;
  userId: ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
}

// 2. Service (src/services/review/reviewService.ts)
export class ReviewService {
  async createReview(reviewData: CreateReviewDto): Promise<IReview> {
    // Business logic here
  }
}

// 3. Controller (src/controllers/review/reviewController.ts)
export const createReview = async (req: Request, res: Response) => {
  try {
    const review = await reviewService.createReview(req.body);
    res.status(201).json({ data: review });
  } catch (error) {
    next(error);
  }
};

// 4. Routes (src/routes/review/reviewRoutes.ts)
router.post('/concerts/:concertId/reviews', authenticate, createReview);

// 5. Register in app.ts
import reviewRoutes from './routes/review/reviewRoutes';
app.use('/api', reviewRoutes);
```

### 2. 새로운 OAuth 제공자 추가

```typescript
// 1. Install passport strategy
npm install passport-facebook

// 2. Create strategy file
// src/config/oauth/facebookStrategy.ts
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID!,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
  callbackURL: '/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
  // Handle user creation/login
}));

// 3. Add routes
router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/auth/facebook/callback', passport.authenticate('facebook'), (req, res) => {
  res.redirect('/');
});
```

### 3. 새로운 백그라운드 작업 추가

```typescript
// src/services/jobs/myCustomJob.ts
import cron from 'node-cron';
import logger from '../../utils/logger/logger';

export function startMyCustomJob() {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running custom job');
      // Job logic here
    } catch (error) {
      logger.error('Custom job failed:', error);
    }
  });

  logger.info('Custom job scheduler started');
}

// Register in app.ts
import { startMyCustomJob } from './services/jobs/myCustomJob';
startMyCustomJob();
```

## 테스팅

### 테스트 실행

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- userModel.test.ts
```

### 테스트 작성

```typescript
// src/models/auth/__tests__/user.test.ts
import { UserModel } from '../user';
import { setupTestDB, teardownTestDB } from '../../../utils/test/testSetup';

describe('UserModel', () => {
  let userModel: UserModel;

  beforeAll(async () => {
    await setupTestDB();
    userModel = new UserModel();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    // Clear users before each test
    await userModel.userCollection.deleteMany({});
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        termsConsents: []
      };

      const user = await userModel.createUser(userData);

      expect(user._id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.status).toBe('pending_verification');
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        termsConsents: []
      };

      await userModel.createUser(userData);

      await expect(userModel.createUser(userData))
        .rejects
        .toThrow('Email already exists');
    });
  });
});
```

## 디버깅

### 디버그 로깅 활성화

```bash
# In .env file
LOG_LEVEL=debug

# Or set environment variable
NODE_ENV=development LOG_LEVEL=debug npm run dev
```

### VS Code 디버거 사용

`.vscode/launch.json` 생성:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug TypeScript",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/src/app.ts"],
      "env": {
        "NODE_ENV": "development"
      },
      "sourceMaps": true,
      "cwd": "${workspaceFolder}",
      "protocol": "inspector"
    }
  ]
}
```

### MongoDB 쿼리 디버깅

```typescript
// Enable MongoDB query logging
import { MongoClient } from 'mongodb';

const client = new MongoClient(uri, {
  monitorCommands: true
});

client.on('commandStarted', (event) => {
  console.log('MongoDB Command:', JSON.stringify(event, null, 2));
});
```

## 성능 최적화

### 느린 쿼리 분석

```typescript
// Add query profiling
import logger from './utils/logger/logger';

// Wrap database calls with timing
async function findUsers() {
  const start = Date.now();
  const users = await userModel.find({});
  const duration = Date.now() - start;

  if (duration > 100) {  // Log if query takes > 100ms
    logger.warn('Slow query detected', {
      method: 'findUsers',
      duration
    });
  }

  return users;
}
```

### 인덱스 생성

```typescript
// In model initialization
async setupIndexes() {
  const collection = this.db.collection('concerts');

  // Single field index
  await collection.createIndex({ status: 1 });

  // Compound index
  await collection.createIndex(
    { userId: 1, status: 1 },
    { name: 'idx_userId_status' }
  );

  // Text search index
  await collection.createIndex(
    { title: 'text', description: 'text' },
    { name: 'idx_text_search' }
  );

  // TTL index (auto-delete after 30 days)
  await collection.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 }
  );
}
```

## 배포

### 프로덕션 빌드

```bash
# Build TypeScript
npm run build

# Output in dist/ folder
ls dist/

# Run production build
NODE_ENV=production node dist/app.js
```

### Docker 배포

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/app.js"]
```

```bash
# Build Docker image
docker build -t livelink-backend .

# Run container
docker run -p 3000:3000 --env-file .env livelink-backend
```

### 상태 확인

```bash
# Check server health
curl http://localhost:3000/health

# Check readiness (for Kubernetes)
curl http://localhost:3000/health/readiness

# Check liveness
curl http://localhost:3000/health/liveness
```

## 문제 해결

### 일반적인 문제

**문제**: MongoDB 연결 시간 초과
```bash
# Check MongoDB is running
docker ps | grep mongo

# Check connection string
echo $MONGO_URI

# Test connection
mongosh "$MONGO_URI"
```

**문제**: Redis 연결 실패
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli -h localhost -p 6379 ping
```

**문제**: 세션이 유지되지 않음
```bash
# Check Redis session keys
redis-cli
KEYS sess:*

# Check session configuration
# Ensure SESSION_SECRET is set
# Ensure Redis is connected
```

**문제**: FCM 알림이 전송되지 않음
```bash
# Verify Firebase credentials
cat config/firebase-service-account.json

# Check user has FCM token
db.users.findOne({ email: 'test@example.com' }, { fcmToken: 1 })

# Check notification logs
grep "FCM" logs/combined.log
```

## 모니터링

### 로그 보기

```bash
# View all logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log

# Search logs
grep "error" logs/combined.log | tail -20
```

### Prometheus 메트릭

```bash
# 메트릭 조회
curl http://localhost:3000/metrics

# 주요 메트릭:
# - http_requests_total
# - http_request_duration_seconds
# - mongodb_connections_active
# - redis_connections_active
```

---

**최종 업데이트**: 2025-11-20
**버전**: 1.1.0
