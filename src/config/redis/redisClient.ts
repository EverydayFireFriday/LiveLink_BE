import { createClient } from 'redis';
import logger from '../../utils/logger/logger';
import { env } from '../env/env';

/**
 * ⚠️ IMPORTANT: Redis 버전 관리 주의사항
 *
 * 현재 구성:
 * - redis: ^4.6.5
 * - connect-redis: ^6.1.3
 * - legacyMode: true (필수)
 *
 * ❌ Redis v5로 업그레이드 금지:
 * - connect-redis v6는 redis v4까지만 지원
 * - Redis v5는 connect-redis v7이 필요하지만 호환성 문제 있음
 * - 업그레이드 시 세션 저장 기능이 작동하지 않음
 *
 * ✅ 안전한 업그레이드 경로 (필요 시):
 * 1. ioredis로 완전 마이그레이션
 * 2. 또는 현재 구성(redis v4) 유지 권장
 */

// 전역 Redis 클라이언트 (싱글톤)
const redisClient = createClient({
  url: env.REDIS_URL,
  legacyMode: true, // connect-redis v6 호환성을 위해 필수
  socket: {
    reconnectStrategy: (retries: number) => {
      // 최대 10초까지 재시도 간격 증가
      const delay = Math.min(retries * 100, 10000);
      logger.warn(`🔄 Redis reconnection attempt ${retries}, delay: ${delay}ms`);
      return delay;
    },
    connectTimeout: 10000, // 10초 연결 타임아웃
  },
});

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
    err.message?.includes('Disconnects client') ||
    err.message?.includes('destroy') ||
    err.message?.includes('Connection is closed')
  ) {
    return;
  }
  logger.error(`❌ Redis Error: ${err.message}`);
});

redisClient.on('end', () => {
  logger.info('ℹ️ Redis connection ended');
});

redisClient.on('reconnecting', () => {
  logger.warn('🔄 Redis reconnecting...');
});

// Redis 클라이언트 연결 함수
export const connectRedis = async (): Promise<boolean> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      await redisClient.ping();
      logger.info('✅ Redis ping successful');
      return true;
    }
    return true;
  } catch (error) {
    logger.warn('⚠️ Redis connection failed. Server will continue without Redis.', { error });
    logger.warn('⚠️ Sessions, rate limiting, and caching will operate in degraded mode.');
    return false;
  }
};

// Redis 클라이언트 연결 해제 함수
export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient?.isOpen) {
      await redisClient.disconnect();
      logger.info('✅ Redis disconnected');
    }
  } catch (error) {
    logger.error('❌ Redis disconnect error:', { error });
    // 종료 시에는 에러를 무시
  }
};

export { redisClient };
