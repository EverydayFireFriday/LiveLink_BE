import Redis, { RedisOptions } from 'ioredis';
import logger from '../../utils/logger/logger';
import { env } from '../env/env';

/**
 * Redis 클라이언트 (ioredis 기반)
 *
 * 현재 구성:
 * - ioredis: ^5.6.1
 * - connect-redis: ^7.1.1
 *
 * 장점:
 * - Socket.IO와 동일한 Redis 클라이언트 사용 (일관성)
 * - legacyMode 불필요
 * - 더 나은 성능과 기능 (클러스터, 센티널 지원)
 * - 프로미스 기반 API
 */

// Redis 연결 옵션
const redisOptions: RedisOptions = {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 100, 10000);
    logger.warn(`🔄 Redis reconnection attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    logger.error(`❌ Redis reconnect error: ${err.message}`);
    return true;
  },
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
};

// 전역 Redis 클라이언트 (싱글톤)
const redisClient = new Redis(env.REDIS_URL, redisOptions);

// Redis 이벤트 핸들링
redisClient.on('connect', () => {
  logger.info('✅ Redis connected');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis ready to accept commands');
});

redisClient.on('error', (err: Error) => {
  // 정상적인 종료 과정에서 발생하는 에러는 무시
  if (
    err.message?.includes('Connection is closed') ||
    err.message?.includes('ECONNREFUSED')
  ) {
    return;
  }
  logger.error(`❌ Redis Error: ${err.message}`);
});

redisClient.on('close', () => {
  logger.info('ℹ️ Redis connection closed');
});

redisClient.on('reconnecting', () => {
  logger.warn('🔄 Redis reconnecting...');
});

// Redis 클라이언트 연결 함수
export const connectRedis = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    logger.info('✅ Redis ping successful');
    return true;
  } catch (error) {
    logger.warn(
      '⚠️ Redis connection failed. Server will continue without Redis.',
      { error },
    );
    logger.warn(
      '⚠️ Sessions, rate limiting, and caching will operate in degraded mode.',
    );
    return false;
  }
};

// Redis 클라이언트 연결 해제 함수
export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('✅ Redis disconnected');
  } catch (error) {
    logger.error('❌ Redis disconnect error:', { error });
    // 종료 시에는 에러를 무시
  }
};

export { redisClient };
