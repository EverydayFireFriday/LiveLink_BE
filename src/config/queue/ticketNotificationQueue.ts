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
 * Ticket Notification Queue
 * 티켓 오픈 알림 큐 (콘서트별 배치 알림용)
 */

// Queue 이름
export const TICKET_NOTIFICATION_QUEUE_NAME = 'ticket-notifications';

// Job 타입 정의
export interface TicketNotificationJobData {
  concertId: string; // 콘서트 ID
  concertTitle: string; // 콘서트 제목
  ticketOpenTitle: string; // 티켓 오픈 제목
  ticketOpenDate: Date; // 티켓 오픈 시간
  notifyBeforeMinutes: number; // 몇 분 전 알림인지 (10, 30, 60)
}

let ticketNotificationQueue: Queue<TicketNotificationJobData> | null = null;

/**
 * Get or create Ticket Notification Queue
 * 티켓 알림 큐 가져오기 또는 생성
 */
export const getTicketNotificationQueue = ():
  | Queue<TicketNotificationJobData>
  | undefined => {
  try {
    // 이미 생성된 큐가 있으면 반환
    if (ticketNotificationQueue) {
      return ticketNotificationQueue;
    }

    // 새로운 큐 생성
    ticketNotificationQueue = new Queue<TicketNotificationJobData>(
      TICKET_NOTIFICATION_QUEUE_NAME,
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
      `✅ Ticket Notification Queue created: ${TICKET_NOTIFICATION_QUEUE_NAME}`,
    );
    return ticketNotificationQueue;
  } catch (error) {
    logger.error('Failed to create Ticket Notification Queue:', error);
    return undefined;
  }
};

/**
 * Close Ticket Notification Queue
 * 티켓 알림 큐 닫기
 */
export const closeTicketNotificationQueue = async (): Promise<void> => {
  if (ticketNotificationQueue) {
    await ticketNotificationQueue.close();
    ticketNotificationQueue = null;
    logger.info('Ticket Notification Queue closed');
  }
};
