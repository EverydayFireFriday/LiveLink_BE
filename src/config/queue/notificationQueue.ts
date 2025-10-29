import { Queue, QueueOptions } from 'bullmq';
import { env } from '../env/env.js';
import logger from '../../utils/logger/logger.js';

/**
 * BullMQ Queue Configuration for Scheduled Notifications
 * Redis 연결 설정 (BullMQ용 - legacyMode 없이)
 */
const connection = {
  host: env.REDIS_URL.includes('redis://')
    ? new URL(env.REDIS_URL).hostname
    : env.REDIS_URL.split(':')[0] || 'localhost',
  port: env.REDIS_URL.includes('redis://')
    ? parseInt(new URL(env.REDIS_URL).port)
    : parseInt(env.REDIS_URL.split(':')[1]) || 6379,
  maxRetriesPerRequest: null, // BullMQ 권장 설정
};

/**
 * Queue Options
 */
const queueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3, // 최대 3번 재시도
    backoff: {
      type: 'exponential',
      delay: 2000, // 2초부터 시작
    },
    removeOnComplete: {
      age: 24 * 3600, // 완료된 job은 24시간 후 삭제
      count: 1000, // 최대 1000개 유지
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 실패한 job은 7일 후 삭제
    },
  },
};

/**
 * Notification Queue
 * 예약 알림 전송을 위한 Job Queue
 */
export const notificationQueue = new Queue(
  'scheduled-notifications',
  queueOptions,
);

/**
 * Queue Event Handlers
 */
notificationQueue.on('error', (error) => {
  logger.error('❌ Notification queue error:', error);
});

notificationQueue.on('waiting', (job) => {
  logger.debug(`⏳ Job ${String(job.id)} is waiting`);
});

logger.info('📬 Notification queue initialized');

/**
 * Graceful shutdown helper
 */
export const closeNotificationQueue = async (): Promise<void> => {
  logger.info('🛑 Closing notification queue...');
  await notificationQueue.close();
  logger.info('✅ Notification queue closed');
};
