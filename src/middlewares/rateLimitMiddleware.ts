import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { env } from '../config/env'; // 💡 env import 추가

// Rate Limiting 전용 Redis 클라이언트 생성 (모든 리미터가 공유)
const rateLimitRedisClient = createClient({
  url: env.REDIS_URL, // 💡 환경 변수 사용
});

rateLimitRedisClient.on('connect', () =>
  logger.info('✅ Redis connected (rate-limiter)'),
);
rateLimitRedisClient.on('error', (err) =>
  logger.error('❌ Redis Error (rate-limiter):', err),
);

rateLimitRedisClient.connect().catch(logger.error);

// 공통 핸들러
const handler = (
  req: Request,
  res: Response,
  next: NextFunction,
  options: { statusCode: number },
) => {
  logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
  res
    .status(options.statusCode)
    .json({ message: '요청 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.' });
};

// 1. 기본 API Rate Limiter (Default)
export const defaultLimiter = rateLimit({
  store: rateLimitRedisClient.isOpen
    ? new RedisStore({
        sendCommand: (...args: string[]) =>
          rateLimitRedisClient.sendCommand(args),
        prefix: 'rl_default:',
      })
    : undefined, // 메모리 기반 사용
  windowMs: parseInt(env.API_LIMIT_DEFAULT_WINDOW_MS) || 60000, // 1분
  max: parseInt(env.API_LIMIT_DEFAULT_MAX) || 100,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. 엄격한 API Rate Limiter (Strict)
export const strictLimiter = rateLimit({
  store: rateLimitRedisClient.isOpen
    ? new RedisStore({
        sendCommand: (...args: string[]) =>
          rateLimitRedisClient.sendCommand(args),
        prefix: 'rl_strict:',
      })
    : undefined, // 메모리 기반 사용
  windowMs: parseInt(env.API_LIMIT_STRICT_WINDOW_MS) || 60000, // 1분
  max: parseInt(env.API_LIMIT_STRICT_MAX) || 20,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. 완화된 API Rate Limiter (Relaxed)
export const relaxedLimiter = rateLimit({
  store: rateLimitRedisClient.isOpen
    ? new RedisStore({
        sendCommand: (...args: string[]) =>
          rateLimitRedisClient.sendCommand(args),
        prefix: 'rl_relaxed:',
      })
    : undefined, // 메모리 기반 사용
  windowMs: parseInt(env.API_LIMIT_RELAXED_WINDOW_MS) || 60000, // 1분
  max: parseInt(env.API_LIMIT_RELAXED_MAX) || 200,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. 로그인 API Rate Limiter: 15분당 10개 (기존 유지)
export const loginLimiter = rateLimit({
  store: rateLimitRedisClient.isOpen
    ? new RedisStore({
        sendCommand: (...args: string[]) =>
          rateLimitRedisClient.sendCommand(args),
        prefix: 'rl_login:',
      })
    : undefined, // 메모리 기반 사용
  windowMs: 15 * 60 * 1000, // 15분
  max: 10,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. 회원가입 API Rate Limiter: 1시간당 10개 (기존 유지)
export const signupLimiter = rateLimit({
  store: rateLimitRedisClient.isOpen
    ? new RedisStore({
        sendCommand: (...args: string[]) =>
          rateLimitRedisClient.sendCommand(args),
        prefix: 'rl_signup:',
      })
    : undefined, // 메모리 기반 사용
  windowMs: 60 * 60 * 1000, // 1시간
  max: 10,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});
