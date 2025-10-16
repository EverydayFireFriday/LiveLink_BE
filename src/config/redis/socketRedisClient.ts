import Redis, { RedisOptions } from 'ioredis';
import logger from '../../utils/logger/logger';
import { env } from '../env/env';

/**
 * Socket.IO Redis Adapter용 Redis 클라이언트
 *
 * 주요 특징:
 * - ioredis 사용 (Socket.IO Redis adapter 권장)
 * - Pub/Sub 전용 클라이언트 쌍 생성
 * - 수평 확장(horizontal scaling)을 위한 구성
 * - 기존 세션 저장소와 독립적으로 동작
 */

// Redis 연결 옵션
const redisOptions: RedisOptions = {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 100, 10000);
    logger.warn(`🔄 Socket.IO Redis reconnection attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    logger.error(`❌ Socket.IO Redis reconnect error: ${err.message}`);
    return true;
  },
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
};

// Pub 클라이언트 (메시지 발행용)
// REDIS_URL 사용 (예: redis://localhost:6379)
export const pubClient = new Redis(env.REDIS_URL, redisOptions);

// Sub 클라이언트 (메시지 구독용)
export const subClient = pubClient.duplicate();

// Pub 클라이언트 이벤트 핸들링
pubClient.on('connect', () => {
  logger.info('✅ Socket.IO Redis Pub client connected');
});

pubClient.on('ready', () => {
  logger.info('✅ Socket.IO Redis Pub client ready');
});

pubClient.on('error', (err: Error) => {
  if (
    err.message?.includes('Connection is closed') ||
    err.message?.includes('ECONNREFUSED')
  ) {
    return;
  }
  logger.error(`❌ Socket.IO Redis Pub client error: ${err.message}`);
});

pubClient.on('close', () => {
  logger.info('ℹ️ Socket.IO Redis Pub client connection closed');
});

// Sub 클라이언트 이벤트 핸들링
subClient.on('connect', () => {
  logger.info('✅ Socket.IO Redis Sub client connected');
});

subClient.on('ready', () => {
  logger.info('✅ Socket.IO Redis Sub client ready');
});

subClient.on('error', (err: Error) => {
  if (
    err.message?.includes('Connection is closed') ||
    err.message?.includes('ECONNREFUSED')
  ) {
    return;
  }
  logger.error(`❌ Socket.IO Redis Sub client error: ${err.message}`);
});

subClient.on('close', () => {
  logger.info('ℹ️ Socket.IO Redis Sub client connection closed');
});

// Redis 연결 확인 함수
export const connectSocketRedis = async (): Promise<boolean> => {
  try {
    await pubClient.ping();
    await subClient.ping();
    logger.info('✅ Socket.IO Redis clients ping successful');
    return true;
  } catch (error) {
    logger.warn('⚠️ Socket.IO Redis connection failed. Socket.IO will run in single-server mode.', { error });
    logger.warn('⚠️ Horizontal scaling will not work without Redis adapter.');
    return false;
  }
};

// Redis 연결 해제 함수
export const disconnectSocketRedis = async (): Promise<void> => {
  try {
    await Promise.all([
      pubClient.quit(),
      subClient.quit(),
    ]);
    logger.info('✅ Socket.IO Redis clients disconnected');
  } catch (error) {
    logger.error('❌ Socket.IO Redis disconnect error:', { error });
  }
};
