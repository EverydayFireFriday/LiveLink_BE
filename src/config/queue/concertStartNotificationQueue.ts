import { Queue } from 'bullmq';
import { env } from '../env/env.js';
import logger from '../../utils/logger/logger.js';

/**
 * Redis connection configuration for Queue
 */
const connection = {
  host: env.REDIS_URL.includes('redis://')
    ? new URL(env.REDIS_URL).hostname
    : env.REDIS_URL.split(':')[0] || 'localhost',
  port: env.REDIS_URL.includes('redis://')
    ? parseInt(new URL(env.REDIS_URL).port)
    : parseInt(env.REDIS_URL.split(':')[1]) || 6379,
  maxRetriesPerRequest: null,
};

/**
 * Concert Start Notification Queue
 * 공연 시작 알림 큐 (콘서트별 배치 알림용)
 */

// Queue 이름
export const CONCERT_START_NOTIFICATION_QUEUE_NAME =
  'concert-start-notifications';

// Job 타입 정의
export interface ConcertStartNotificationJobData {
  concertId: string; // 콘서트 ID
  concertTitle: string; // 콘서트 제목
  performanceDate: Date; // 공연 시작 시간
  notifyBeforeMinutes: number; // 몇 분 전 알림인지 (60, 180, 1440)
}

let concertStartNotificationQueue: Queue<ConcertStartNotificationJobData> | null =
  null;

/**
 * Get or create Concert Start Notification Queue
 * 공연 시작 알림 큐 가져오기 또는 생성
 */
export const getConcertStartNotificationQueue = ():
  | Queue<ConcertStartNotificationJobData>
  | undefined => {
  try {
    // 이미 생성된 큐가 있으면 반환
    if (concertStartNotificationQueue) {
      return concertStartNotificationQueue;
    }

    // 새로운 큐 생성
    concertStartNotificationQueue = new Queue<ConcertStartNotificationJobData>(
      CONCERT_START_NOTIFICATION_QUEUE_NAME,
      {
        connection,
        defaultJobOptions: {
          attempts: 3, // 최대 3번 재시도
          backoff: {
            type: 'exponential',
            delay: 2000, // 2초부터 시작
          },
          removeOnComplete: {
            age: 24 * 60 * 60, // 24시간 후 삭제
            count: 1000, // 최대 1000개 보관
          },
          removeOnFail: {
            age: 7 * 24 * 60 * 60, // 7일 후 삭제
          },
        },
      },
    );

    logger.info(
      `✅ Concert Start Notification Queue created: ${CONCERT_START_NOTIFICATION_QUEUE_NAME}`,
    );
    return concertStartNotificationQueue;
  } catch (error) {
    logger.error('Failed to create Concert Start Notification Queue:', error);
    return undefined;
  }
};

/**
 * Close Concert Start Notification Queue
 * 공연 시작 알림 큐 닫기
 */
export const closeConcertStartNotificationQueue = async (): Promise<void> => {
  if (concertStartNotificationQueue) {
    await concertStartNotificationQueue.close();
    concertStartNotificationQueue = null;
    logger.info('Concert Start Notification Queue closed');
  }
};
