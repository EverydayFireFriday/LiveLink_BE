# Error Handling Guide

## 🎯 개요

LiveLink Backend의 에러 처리 전략과 패턴을 설명합니다.

---

## 📋 에러 분류

### 1. HTTP 상태 코드별 분류

| 상태 코드 | 분류 | 설명 | 예시 |
|----------|------|------|------|
| 400 | Bad Request | 잘못된 요청 데이터 | 유효성 검증 실패 |
| 401 | Unauthorized | 인증 필요 | 로그인 필요 |
| 403 | Forbidden | 권한 없음 | 관리자 전용 기능 |
| 404 | Not Found | 리소스 없음 | 존재하지 않는 콘서트 |
| 409 | Conflict | 충돌 | 중복된 이메일 |
| 429 | Too Many Requests | Rate Limit 초과 | 요청 제한 초과 |
| 500 | Internal Server Error | 서버 오류 | 예상치 못한 오류 |
| 503 | Service Unavailable | 서비스 이용 불가 | DB 연결 실패 |

---

## 🏗️ 에러 구조

### 표준 에러 응답 형식

```typescript
interface ErrorResponse {
  success: false;
  error: string;          // 에러 메시지
  statusCode: number;     // HTTP 상태 코드
  details?: any;          // 추가 상세 정보 (선택)
}
```

### 성공 응답 형식

```typescript
interface SuccessResponse<T> {
  success: true;
  data?: T;              // 응답 데이터
  message?: string;      // 성공 메시지 (선택)
}
```

---

## 🛠️ 에러 핸들링 패턴

### 1. 컨트롤러 레벨 에러 처리

**패턴: try-catch with next()**

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const getConcertById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // 유효성 검증
    if (!id) {
      res.status(400).json({
        success: false,
        error: '콘서트 ID가 필요합니다',
        statusCode: 400,
      });
      return;
    }

    // 비즈니스 로직
    const concert = await ConcertModel.findById(id);

    if (!concert) {
      res.status(404).json({
        success: false,
        error: '콘서트를 찾을 수 없습니다',
        statusCode: 404,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: concert,
    });
  } catch (error) {
    logger.error('콘서트 조회 실패:', error);
    next(error); // 글로벌 에러 핸들러로 전달
  }
};
```

### 2. 글로벌 에러 핸들러

**src/middlewares/error/errorHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 로그 기록
  logger.error('에러 발생:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // 기본 상태 코드 및 메시지
  let statusCode = err.statusCode || 500;
  let message = err.message || '서버 오류가 발생했습니다';

  // MongoDB 에러 처리
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '데이터 유효성 검증에 실패했습니다';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = '잘못된 ID 형식입니다';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = '중복된 데이터입니다';
  }

  // Joi/Zod 유효성 검증 에러
  if (err.isJoi || err.name === 'ZodError') {
    statusCode = 400;
    message = err.details || err.errors;
  }

  // 응답 전송
  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```

**app.ts에 등록:**

```typescript
import { errorHandler } from './middlewares/error/errorHandler';

// 모든 라우트 등록 후
app.use(errorHandler);
```

### 3. 비동기 에러 처리 래퍼

**src/utils/asyncHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

**사용 예시:**

```typescript
import { asyncHandler } from '../utils/asyncHandler';

router.get('/concert/:id', asyncHandler(async (req, res, next) => {
  const concert = await ConcertModel.findById(req.params.id);

  if (!concert) {
    return res.status(404).json({
      success: false,
      error: '콘서트를 찾을 수 없습니다',
      statusCode: 404,
    });
  }

  res.json({ success: true, data: concert });
}));
```

### 4. 커스텀 에러 클래스

**src/utils/errors/AppError.ts**

```typescript
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 사용 예시
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource}을(를) 찾을 수 없습니다`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '인증이 필요합니다') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '권한이 없습니다') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
```

**사용 예시:**

```typescript
import { NotFoundError, ConflictError } from '../utils/errors/AppError';

export const createUser = async (userData: UserData) => {
  const existingUser = await UserModel.findByEmail(userData.email);

  if (existingUser) {
    throw new ConflictError('이미 존재하는 이메일입니다');
  }

  const user = await UserModel.create(userData);

  if (!user) {
    throw new NotFoundError('사용자');
  }

  return user;
};
```

---

## 🔍 상황별 에러 처리

### 1. 인증 에러

```typescript
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다',
      statusCode: 401,
    });
  }
  next();
};
```

### 2. 권한 에러

```typescript
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다',
      statusCode: 403,
    });
  }
  next();
};
```

### 3. 유효성 검증 에러 (Joi)

```typescript
import Joi from 'joi';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  username: Joi.string().min(3).max(20).required(),
});

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { error } = registerSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: '입력 데이터가 올바르지 않습니다',
      details: error.details.map(d => d.message),
      statusCode: 400,
    });
  }

  next();
};
```

### 4. MongoDB 에러

```typescript
export const handleMongoError = (error: any): { statusCode: number; message: string } => {
  // Duplicate Key Error (E11000)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return {
      statusCode: 409,
      message: `이미 존재하는 ${field}입니다`,
    };
  }

  // Validation Error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((e: any) => e.message);
    return {
      statusCode: 400,
      message: messages.join(', '),
    };
  }

  // Cast Error (잘못된 ObjectId)
  if (error.name === 'CastError') {
    return {
      statusCode: 400,
      message: '잘못된 ID 형식입니다',
    };
  }

  return {
    statusCode: 500,
    message: '데이터베이스 오류가 발생했습니다',
  };
};
```

### 5. Rate Limit 에러

```typescript
export const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
    statusCode: 429,
    retryAfter: res.getHeader('Retry-After'),
  });
};
```

### 6. Redis 연결 실패 (Graceful Degradation)

```typescript
export const connectRedis = async (): Promise<boolean> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      await redisClient.ping();
      logger.info('✅ Redis 연결 성공');
      return true;
    }
    return true;
  } catch (error) {
    logger.warn('⚠️ Redis 연결 실패. 메모리 기반으로 동작합니다.');
    logger.error('Redis Error:', error);
    return false;
  }
};
```

### 7. Socket.IO 에러

```typescript
io.use((socket, next) => {
  // 인증 확인
  if (!socket.request.session || !socket.request.session.passport) {
    return next(new Error('인증이 필요합니다'));
  }
  next();
});

socket.on('error', (error) => {
  logger.error('Socket.IO 에러:', error);
  socket.emit('error', { message: '연결 오류가 발생했습니다' });
});
```

---

## 📊 로깅 전략

### 1. Winston Logger 설정

**src/utils/logger/logger.ts**

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // 에러 로그 파일
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // 모든 로그 파일
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

export { logger };
```

### 2. 로깅 레벨별 사용

```typescript
import { logger } from '../utils/logger';

// ERROR: 에러 발생 시
logger.error('사용자 생성 실패:', { userId, error: error.message });

// WARN: 경고 상황
logger.warn('Redis 연결 실패, 메모리 기반으로 전환');

// INFO: 일반 정보
logger.info('서버 시작됨', { port: 3000, environment: 'production' });

// DEBUG: 디버깅 정보 (개발 환경)
logger.debug('API 요청 수신:', { method: 'GET', url: '/concert' });
```

### 3. 요청 로깅 (Morgan)

```typescript
import morgan from 'morgan';
import { logger } from './utils/logger';

// Morgan 스트림 설정
const stream = {
  write: (message: string) => logger.http(message.trim()),
};

// 개발 환경
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 프로덕션 환경
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream }));
}
```

---

## 🚨 외부 에러 모니터링 (Sentry)

### 1. Sentry 설치 및 설정

```bash
npm install @sentry/node @sentry/tracing
```

**src/config/sentry.ts**

```typescript
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Express } from 'express';

export const initSentry = (app: Express) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app }),
      ],
      tracesSampleRate: 0.1, // 10% 샘플링
      environment: process.env.NODE_ENV,
    });

    // Request handler must be first
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
};

export const sentryErrorHandler = () => {
  if (process.env.NODE_ENV === 'production') {
    return Sentry.Handlers.errorHandler();
  }
  return (req: any, res: any, next: any) => next();
};
```

**app.ts에 적용:**

```typescript
import { initSentry, sentryErrorHandler } from './config/sentry';

const app = express();

// Sentry 초기화 (첫 번째)
initSentry(app);

// ... 미들웨어 및 라우트 등록

// Sentry 에러 핸들러 (에러 핸들러 전)
app.use(sentryErrorHandler());

// 글로벌 에러 핸들러 (마지막)
app.use(errorHandler);
```

---

## 🧪 에러 테스트

### 1. 에러 응답 테스트

```typescript
import request from 'supertest';
import app from '../app';

describe('Error Handling', () => {
  it('404 - 존재하지 않는 라우트', async () => {
    const response = await request(app).get('/nonexistent');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      statusCode: 404,
    });
  });

  it('401 - 인증 없이 보호된 라우트 접근', async () => {
    const response = await request(app).get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('로그인');
  });

  it('400 - 유효하지 않은 요청 데이터', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'invalid-email' });

    expect(response.status).toBe(400);
  });
});
```

---

## 📖 에러 처리 베스트 프랙티스

### ✅ DO

1. **항상 에러를 로깅하세요**
   ```typescript
   catch (error) {
     logger.error('에러 발생:', error);
     next(error);
   }
   ```

2. **사용자 친화적인 메시지 제공**
   ```typescript
   res.status(404).json({
     success: false,
     error: '콘서트를 찾을 수 없습니다',
   });
   ```

3. **에러를 분류하고 구조화**
   - Custom Error Classes 사용
   - HTTP 상태 코드 명확히 구분

4. **민감한 정보 노출 방지**
   - 프로덕션에서 스택 트레이스 숨김
   - 데이터베이스 에러 메시지 일반화

### ❌ DON'T

1. **에러를 무시하지 마세요**
   ```typescript
   // ❌ 나쁜 예
   try {
     await someOperation();
   } catch (error) {
     // 아무것도 하지 않음
   }
   ```

2. **모든 에러를 500으로 처리하지 마세요**
   ```typescript
   // ❌ 나쁜 예
   res.status(500).json({ error: 'Error' });
   ```

3. **에러 메시지에 민감한 정보 포함 금지**
   ```typescript
   // ❌ 나쁜 예
   error: `User password ${password} is invalid`
   ```

---

**Last Updated:** 2025-10-10
**Version:** 1.0.0
