# Testing Guide

## 🎯 개요

LiveLink Backend의 테스트 전략 및 작성 가이드입니다.

---

## 🛠️ 테스트 도구

### 테스트 프레임워크
- **Jest** 29.7.0 - 테스트 프레임워크
- **SuperTest** 6.3.3 - HTTP 요청 테스트
- **ts-jest** 29.1.1 - TypeScript 지원

### 설치된 패키지

```json
{
  "jest": "^29.7.0",
  "supertest": "^6.3.3",
  "ts-jest": "^29.1.1",
  "@types/jest": "^29.5.8",
  "@types/supertest": "^6.0.2"
}
```

---

## ⚙️ Jest 설정

### jest.config.js

프로젝트 루트에 `jest.config.js` 생성:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  verbose: true,
  testTimeout: 10000,
};
```

### package.json 스크립트

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e"
  }
}
```

---

## 📁 테스트 파일 구조

```
LiveLink_BE/
├── src/
│   ├── controllers/
│   │   ├── auth/
│   │   │   ├── authController.ts
│   │   │   └── authController.test.ts
│   ├── services/
│   │   ├── auth/
│   │   │   ├── authService.ts
│   │   │   └── authService.test.ts
│   ├── models/
│   │   ├── auth/
│   │   │   ├── userModel.ts
│   │   │   └── userModel.test.ts
│   ├── middlewares/
│   │   ├── auth/
│   │   │   ├── authMiddleware.ts
│   │   │   └── authMiddleware.test.ts
│   └── __tests__/
│       ├── integration/
│       │   ├── auth.integration.test.ts
│       │   └── concert.integration.test.ts
│       └── e2e/
│           ├── auth.e2e.test.ts
│           └── concert.e2e.test.ts
└── jest.config.js
```

---

## 🧪 테스트 작성 가이드

### 1. 단위 테스트 (Unit Test)

#### 1.1 모델 테스트

**src/models/auth/userModel.test.ts**

```typescript
import { MongoClient, Db, Collection } from 'mongodb';
import { UserModel } from './userModel';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('UserModel', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let userCollection: Collection;
  let userModel: UserModel;

  beforeAll(async () => {
    // 인메모리 MongoDB 서버 시작
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
    userCollection = db.collection('users');
    userModel = new UserModel(userCollection);
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // 각 테스트 후 컬렉션 초기화
    await userCollection.deleteMany({});
  });

  describe('createUser', () => {
    it('새로운 사용자를 생성해야 한다', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        name: '테스트유저',
      };

      const user = await userModel.createUser(userData);

      expect(user).toHaveProperty('_id');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.status).toBe('active');
    });

    it('중복된 이메일로 사용자를 생성하면 에러를 던져야 한다', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        name: '테스트유저',
      };

      await userModel.createUser(userData);

      await expect(
        userModel.createUser({
          ...userData,
          username: 'testuser2',
        })
      ).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('이메일로 사용자를 찾을 수 있어야 한다', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        name: '테스트유저',
      };

      await userModel.createUser(userData);
      const user = await userModel.findByEmail('test@example.com');

      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
    });

    it('존재하지 않는 이메일이면 null을 반환해야 한다', async () => {
      const user = await userModel.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });
});
```

#### 1.2 서비스 테스트

**src/services/auth/authService.test.ts**

```typescript
import { AuthService } from './authService';
import { UserModel } from '../../models/auth/userModel';
import bcrypt from 'bcrypt';

// Mock UserModel
jest.mock('../../models/auth/userModel');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserModel: jest.Mocked<UserModel>;

  beforeEach(() => {
    mockUserModel = new UserModel(null as any) as jest.Mocked<UserModel>;
    authService = new AuthService(mockUserModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('유효한 데이터로 사용자를 등록해야 한다', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123!',
        name: '테스트유저',
      };

      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        name: '테스트유저',
        status: 'active',
      };

      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.createUser.mockResolvedValue(mockUser as any);

      const result = await authService.registerUser(userData);

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserModel.createUser).toHaveBeenCalled();
    });

    it('이미 존재하는 이메일이면 에러를 던져야 한다', async () => {
      const userData = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'password123!',
        name: '테스트유저',
      };

      mockUserModel.findByEmail.mockResolvedValue({
        _id: 'existing-id',
        email: 'existing@example.com',
      } as any);

      await expect(authService.registerUser(userData)).rejects.toThrow(
        '이미 존재하는 이메일입니다'
      );
    });
  });

  describe('validatePassword', () => {
    it('올바른 비밀번호면 true를 반환해야 한다', async () => {
      const password = 'password123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await authService.validatePassword(password, hashedPassword);

      expect(result).toBe(true);
    });

    it('틀린 비밀번호면 false를 반환해야 한다', async () => {
      const password = 'password123!';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await authService.validatePassword(wrongPassword, hashedPassword);

      expect(result).toBe(false);
    });
  });
});
```

#### 1.3 미들웨어 테스트

**src/middlewares/auth/authMiddleware.test.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './authMiddleware';

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      isAuthenticated: jest.fn(),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('requireAuth', () => {
    it('인증된 사용자는 통과시켜야 한다', () => {
      (mockRequest.isAuthenticated as jest.Mock).mockReturnValue(true);

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('인증되지 않은 사용자는 401 에러를 반환해야 한다', () => {
      (mockRequest.isAuthenticated as jest.Mock).mockReturnValue(false);

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: '로그인이 필요합니다',
        statusCode: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
```

---

### 2. 통합 테스트 (Integration Test)

**src/__tests__/integration/auth.integration.test.ts**

```typescript
import request from 'supertest';
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../app';
import { Express } from 'express';

describe('Auth API Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    // 인메모리 MongoDB 서버 시작
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');

    // 테스트용 앱 생성
    app = await createApp(db);
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // 각 테스트 후 데이터 초기화
    await db.collection('users').deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('유효한 데이터로 회원가입에 성공해야 한다', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: '테스트유저',
        birthDate: '1990-01-01',
        isTermsAgreed: true,
        termsVersion: '1.0',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('_id');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('중복된 이메일로 회원가입 시 409 에러를 반환해야 한다', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: '테스트유저',
        birthDate: '1990-01-01',
        isTermsAgreed: true,
        termsVersion: '1.0',
      };

      // 첫 번째 회원가입
      await request(app).post('/auth/register').send(userData).expect(201);

      // 같은 이메일로 두 번째 회원가입
      const response = await request(app)
        .post('/auth/register')
        .send({ ...userData, username: 'testuser2' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('이미 존재');
    });

    it('유효하지 않은 이메일 형식이면 400 에러를 반환해야 한다', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'SecurePassword123!',
        name: '테스트유저',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // 테스트 사용자 생성
      await request(app).post('/auth/register').send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: '테스트유저',
        birthDate: '1990-01-01',
        isTermsAgreed: true,
        termsVersion: '1.0',
      });
    });

    it('올바른 자격 증명으로 로그인에 성공해야 한다', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('틀린 비밀번호로 로그인 시 401 에러를 반환해야 한다', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
```

---

### 3. E2E 테스트 (End-to-End Test)

**src/__tests__/e2e/concert.e2e.test.ts**

```typescript
import request from 'supertest';
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../app';
import { Express } from 'express';

describe('Concert E2E Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let authCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
    app = await createApp(db);

    // 일반 사용자 생성 및 로그인
    await request(app).post('/auth/register').send({
      username: 'testuser',
      email: 'user@example.com',
      password: 'Password123!',
      name: '일반유저',
      birthDate: '1990-01-01',
      isTermsAgreed: true,
      termsVersion: '1.0',
    });

    const userLogin = await request(app).post('/auth/login').send({
      emailOrUsername: 'user@example.com',
      password: 'Password123!',
    });

    authCookie = userLogin.headers['set-cookie'][0];

    // 관리자 생성 및 로그인
    await request(app).post('/auth/register').send({
      username: 'admin',
      email: process.env.ADMIN_EMAILS || 'admin@example.com',
      password: 'AdminPassword123!',
      name: '관리자',
      birthDate: '1990-01-01',
      isTermsAgreed: true,
      termsVersion: '1.0',
    });

    const adminLogin = await request(app).post('/auth/login').send({
      emailOrUsername: process.env.ADMIN_EMAILS || 'admin@example.com',
      password: 'AdminPassword123!',
    });

    adminCookie = adminLogin.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  describe('콘서트 생성 및 조회 플로우', () => {
    let concertId: string;

    it('관리자가 콘서트를 생성해야 한다', async () => {
      const concertData = {
        title: '2025 Test Concert',
        artist: ['Test Artist'],
        location: ['Seoul'],
        datetime: ['2025-12-01T19:00:00Z'],
        price: [{ tier: 'VIP', amount: 150000 }],
        category: ['K-POP'],
        ticketOpenDate: '2025-11-01T10:00:00Z',
      };

      const response = await request(app)
        .post('/concert')
        .set('Cookie', adminCookie)
        .send(concertData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.concert.title).toBe('2025 Test Concert');
      concertId = response.body.concert._id;
    });

    it('일반 사용자가 콘서트 목록을 조회할 수 있어야 한다', async () => {
      const response = await request(app).get('/concert').expect(200);

      expect(response.body.concerts).toHaveLength(1);
      expect(response.body.concerts[0].title).toBe('2025 Test Concert');
    });

    it('일반 사용자가 콘서트에 좋아요를 할 수 있어야 한다', async () => {
      const response = await request(app)
        .post(`/concert/${concertId}/like`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.liked).toBe(true);
      expect(response.body.likesCount).toBe(1);
    });

    it('일반 사용자가 콘서트 좋아요를 취소할 수 있어야 한다', async () => {
      const response = await request(app)
        .post(`/concert/${concertId}/like`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.liked).toBe(false);
      expect(response.body.likesCount).toBe(0);
    });
  });
});
```

---

## 🔧 테스트 유틸리티

### 1. 테스트 헬퍼 함수

**src/__tests__/helpers/testHelpers.ts**

```typescript
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

export class TestDatabase {
  private mongoServer?: MongoMemoryServer;
  private client?: MongoClient;
  private db?: Db;

  async connect(): Promise<Db> {
    this.mongoServer = await MongoMemoryServer.create();
    const uri = this.mongoServer.getUri();
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db('test');
    return this.db;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }

  async clearAll(): Promise<void> {
    if (this.db) {
      const collections = await this.db.collections();
      await Promise.all(collections.map(c => c.deleteMany({})));
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }
}

export const createTestUser = (overrides = {}) => ({
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123!',
  name: '테스트유저',
  birthDate: '1990-01-01',
  isTermsAgreed: true,
  termsVersion: '1.0',
  ...overrides,
});

export const createTestConcert = (overrides = {}) => ({
  title: 'Test Concert',
  artist: ['Test Artist'],
  location: ['Seoul'],
  datetime: ['2025-12-01T19:00:00Z'],
  price: [{ tier: 'VIP', amount: 150000 }],
  category: ['K-POP'],
  ticketOpenDate: '2025-11-01T10:00:00Z',
  ...overrides,
});
```

---

## 📊 테스트 커버리지

### 커버리지 목표

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

### 커버리지 확인

```bash
# 커버리지 리포트 생성
npm run test:coverage

# 커버리지 HTML 리포트 열기
open coverage/lcov-report/index.html
```

---

## 🏃 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 특정 파일 테스트
npm test -- auth.test.ts

# 감시 모드 (파일 변경 시 자동 실행)
npm run test:watch

# 커버리지 포함
npm run test:coverage

# 단위 테스트만
npm run test:unit

# 통합 테스트만
npm run test:integration

# E2E 테스트만
npm run test:e2e
```

---

## 📖 테스트 베스트 프랙티스

### ✅ DO

1. **테스트는 독립적이어야 한다**
   ```typescript
   // ✅ 좋은 예: afterEach로 초기화
   afterEach(async () => {
     await db.collection('users').deleteMany({});
   });
   ```

2. **Arrange-Act-Assert 패턴 사용**
   ```typescript
   it('사용자를 생성해야 한다', async () => {
     // Arrange (준비)
     const userData = { username: 'test', email: 'test@example.com' };

     // Act (실행)
     const user = await userModel.createUser(userData);

     // Assert (검증)
     expect(user.username).toBe('test');
   });
   ```

3. **설명적인 테스트 이름 사용**
   ```typescript
   // ✅ 좋은 예
   it('중복된 이메일로 회원가입 시 409 에러를 반환해야 한다', () => {});

   // ❌ 나쁜 예
   it('test register', () => {});
   ```

4. **Mock은 필요한 곳에만 사용**
   ```typescript
   jest.mock('../../services/emailService');
   ```

### ❌ DON'T

1. **실제 외부 서비스에 의존하지 마세요**
   ```typescript
   // ❌ 나쁜 예: 실제 이메일 발송
   await emailService.sendEmail();

   // ✅ 좋은 예: Mock 사용
   jest.mock('../../services/emailService');
   ```

2. **테스트 간 의존성을 만들지 마세요**
   ```typescript
   // ❌ 나쁜 예
   it('test 1', () => {
     globalVar = 'value';
   });

   it('test 2', () => {
     expect(globalVar).toBe('value'); // test 1에 의존
   });
   ```

---

## 🆘 트러블슈팅

### 1. MongoDB Memory Server 타임아웃

```typescript
jest.setTimeout(30000); // 타임아웃 증가
```

### 2. Redis Mock

```typescript
jest.mock('../../config/redis/redisClient', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));
```

### 3. Session Mock

```typescript
mockRequest = {
  session: {
    passport: { user: 'user-id' },
    save: jest.fn((cb) => cb()),
    destroy: jest.fn((cb) => cb()),
  },
  isAuthenticated: jest.fn().mockReturnValue(true),
};
```

---

**Last Updated:** 2025-10-10
**Version:** 1.0.0
