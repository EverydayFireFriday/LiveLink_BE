import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger/logger';
import { env, isDevelopment } from '../../config/env/env';
import { pubClient as ioredisClient } from '../../config/redis/socketRedisClient';

/**
 * ⚠️ IMPORTANT: Rate Limiter 설정 정책
 *
 * 현재 구성:
 * - rate-limiter-flexible: ^8.1.0
 * - ioredis (socketRedisClient의 pubClient 사용)
 * - insuranceLimiter: undefined (메모리 폴백 비활성화)
 *
 * ✅ 안전성 원칙:
 * - Redis 연결 실패 시 메모리 폴백 사용 금지
 * - insuranceLimiter를 undefined로 설정하여 명시적으로 차단
 * - Redis 연결 실패 시 요청은 에러 응답 반환
 *
 * 🔧 설정 파라미터:
 * - points: 허용되는 요청 수
 * - duration: 시간 윈도우 (초 단위)
 * - blockDuration: 제한 초과 시 차단 시간 (초 단위)
 * - keyPrefix: Redis 키 prefix
 */

// 공통 에러 핸들러
const createRateLimitHandler = (limiterName: string) => {
  return (req: Request, res: Response, _next: NextFunction) => {
    logger.warn(
      `Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}, Limiter: ${limiterName}`,
    );
    res.status(429).json({
      message: '요청 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: res.getHeader('Retry-After') || 60,
    });
  };
};

// Redis 연결 에러 핸들러
const handleRedisError = (req: Request, res: Response) => {
  logger.error(
    `Redis connection unavailable for rate limiting. IP: ${req.ip}, Path: ${req.path}`,
  );
  res.status(503).json({
    message:
      '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
  });
};

// 1. 기본 API Rate Limiter (Default)
const defaultLimiterInstance = new RateLimiterRedis({
  storeClient: ioredisClient,
  keyPrefix: 'rl_default',
  points: parseInt(env.API_LIMIT_DEFAULT_MAX) || 100, // 요청 수
  duration: (parseInt(env.API_LIMIT_DEFAULT_WINDOW_MS) || 60000) / 1000, // 초 단위로 변환
  blockDuration: 60, // 60초 차단
  insuranceLimiter: undefined, // 메모리 폴백 비활성화
});

// 2. 엄격한 API Rate Limiter (Strict)
const strictLimiterInstance = new RateLimiterRedis({
  storeClient: ioredisClient,
  keyPrefix: 'rl_strict',
  points: parseInt(env.API_LIMIT_STRICT_MAX) || 20,
  duration: (parseInt(env.API_LIMIT_STRICT_WINDOW_MS) || 60000) / 1000,
  blockDuration: 120, // 120초 차단
  insuranceLimiter: undefined,
});

// 3. 완화된 API Rate Limiter (Relaxed)
const relaxedLimiterInstance = new RateLimiterRedis({
  storeClient: ioredisClient,
  keyPrefix: 'rl_relaxed',
  points: parseInt(env.API_LIMIT_RELAXED_MAX) || 200,
  duration: (parseInt(env.API_LIMIT_RELAXED_WINDOW_MS) || 60000) / 1000,
  blockDuration: 30, // 30초 차단
  insuranceLimiter: undefined,
});

// 4. 로그인 API Rate Limiter
const loginLimiterInstance = new RateLimiterRedis({
  storeClient: ioredisClient,
  keyPrefix: 'rl_login',
  points: parseInt(env.API_LIMIT_LOGIN_MAX),
  duration: parseInt(env.API_LIMIT_LOGIN_WINDOW_MS) / 1000, // 초 단위로 변환
  blockDuration: 30 * 60, // 30분 차단
  insuranceLimiter: undefined,
});

// 5. 회원가입 API Rate Limiter
const signupLimiterInstance = new RateLimiterRedis({
  storeClient: ioredisClient,
  keyPrefix: 'rl_signup',
  points: parseInt(env.API_LIMIT_SIGNUP_MAX),
  duration: parseInt(env.API_LIMIT_SIGNUP_WINDOW_MS) / 1000, // 초 단위로 변환
  blockDuration: 60 * 60, // 1시간 차단
  insuranceLimiter: undefined,
});

/**
 * Express 미들웨어 래퍼 팩토리
 * @param limiter RateLimiterRedis 인스턴스
 * @param limiterName limiter 이름 (로깅용)
 */
const createRateLimitMiddleware = (
  limiter: RateLimiterRedis,
  limiterName: string,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 개발 환경에서는 rate limiting 스킵
    if (isDevelopment()) {
      return next();
    }

    void (async () => {
      // Redis 연결 확인
      if (ioredisClient.status !== 'ready') {
        return handleRedisError(req, res);
      }

      try {
        const key = req.ip || 'unknown'; // IP 주소를 키로 사용
        const result = await limiter.consume(key);

        // Rate limit 헤더 설정
        res.setHeader('X-RateLimit-Limit', limiter.points);
        res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
        res.setHeader(
          'X-RateLimit-Reset',
          new Date(Date.now() + result.msBeforeNext).toISOString(),
        );

        next();
      } catch (error) {
        // rate-limiter-flexible은 제한 초과 시 RateLimiterRes 객체를 throw함
        if (error && typeof error === 'object' && 'msBeforeNext' in error) {
          const rateLimiterError = error as {
            msBeforeNext: number;
            remainingPoints: number;
          };

          // Retry-After 헤더 설정 (초 단위)
          const retryAfterSeconds = Math.ceil(
            rateLimiterError.msBeforeNext / 1000,
          );
          res.setHeader('Retry-After', retryAfterSeconds);
          res.setHeader('X-RateLimit-Limit', limiter.points);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader(
            'X-RateLimit-Reset',
            new Date(Date.now() + rateLimiterError.msBeforeNext).toISOString(),
          );

          return createRateLimitHandler(limiterName)(req, res, next);
        }

        // 기타 에러 (Redis 연결 문제 등)
        logger.error(`Rate limiter error for ${limiterName}:`, error);
        return handleRedisError(req, res);
      }
    })();
  };
};

// Export Express 미들웨어
export const defaultLimiter = createRateLimitMiddleware(
  defaultLimiterInstance,
  'default',
);
export const strictLimiter = createRateLimitMiddleware(
  strictLimiterInstance,
  'strict',
);
export const relaxedLimiter = createRateLimitMiddleware(
  relaxedLimiterInstance,
  'relaxed',
);
export const loginLimiter = createRateLimitMiddleware(
  loginLimiterInstance,
  'login',
);
export const signupLimiter = createRateLimitMiddleware(
  signupLimiterInstance,
  'signup',
);
