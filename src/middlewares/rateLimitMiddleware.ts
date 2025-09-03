import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import logger from '../utils/logger';

// Rate Limiting 전용 Redis 클라이언트 생성 (모든 리미터가 공유)
const rateLimitRedisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

rateLimitRedisClient.on('connect', () => logger.info('✅ Redis connected (rate-limiter)'));
rateLimitRedisClient.on('error', (err) => logger.error('❌ Redis Error (rate-limiter):', err));

rateLimitRedisClient.connect().catch(logger.error);

// 공통 핸들러
const handler = (req: any, res: any, next: any, options: any) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(options.statusCode).json({ message: '요청 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.' });
};

// 1. 일반 API Rate Limiter: 1분당 30개
export const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => rateLimitRedisClient.sendCommand(args),
    prefix: 'rl_general:',
  }),
  windowMs: 60 * 1000, // 1분
  max: 30,
  handler,
  standardHeaders: true, 
  legacyHeaders: false, 
});

// 2. 로그인 API Rate Limiter: 15분당 5개
export const loginLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => rateLimitRedisClient.sendCommand(args),
    prefix: 'rl_login:',
  }),
  windowMs: 15 * 60 * 1000, // 15분
  max: 10,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. 회원가입 API Rate Limiter: 1시간당 3개
export const signupLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => rateLimitRedisClient.sendCommand(args),
    prefix: 'rl_signup:',
  }),
  windowMs: 60 * 60 * 1000, // 1시간
  max: 10,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});