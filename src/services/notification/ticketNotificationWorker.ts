import { Worker, Job } from 'bullmq';
import { ObjectId } from 'mongodb';
import logger from '../../utils/logger/logger.js';
import { env } from '../../config/env/env.js';
import {
  TICKET_NOTIFICATION_QUEUE_NAME,
  TicketNotificationJobData,
} from '../../config/queue/ticketNotificationQueue.js';
import { getDB } from '../../utils/database/db.js';
import { User, UserStatus } from '../../models/auth/user.js';
import { IConcert } from '../../models/concert/base/ConcertTypes.js';
import fcmService from './fcmService.js';
import { getNotificationHistoryModel } from '../../models/notification/notificationHistory.js';
import { TicketNotificationType } from '../../models/notification/notificationHistory.js';

/**
 * Redis connection configuration for Worker
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
 * Ticket Notification Worker
 * 티켓 오픈 알림 Worker
 *
 * BullMQ에서 Job을 받아서:
 * 1. 콘서트를 좋아요한 사용자 조회
 * 2. 런타임 필터링 (알림 설정 확인)
 * 3. FCM 배치 전송 (500명씩)
 * 4. NotificationHistory에 저장
 */

let worker: Worker<TicketNotificationJobData> | null = null;

// FCM 배치 크기 (Firebase 권장: 500)
const FCM_BATCH_SIZE = 500;

/**
 * Get notification type based on minutes before
 * 몇 분 전인지에 따라 알림 타입 반환
 */
function getNotificationType(
  notifyBeforeMinutes: number,
): TicketNotificationType {
  switch (notifyBeforeMinutes) {
    case 10:
      return TicketNotificationType.TICKET_OPEN_10MIN;
    case 30:
      return TicketNotificationType.TICKET_OPEN_30MIN;
    case 60:
      return TicketNotificationType.TICKET_OPEN_1HOUR;
    case 1440:
      return TicketNotificationType.TICKET_OPEN_1DAY;
    default:
      return TicketNotificationType.TICKET_OPEN_1HOUR;
  }
}

/**
 * Process ticket notification job
 * 티켓 알림 Job 처리
 *
 * @description
 * 티켓 오픈 알림을 처리하는 Worker 함수입니다.
 * 스케줄러가 등록한 Job을 받아서 다음 작업을 수행합니다:
 *
 * 1. 콘서트 정보 확인
 * 2. 알림 받을 사용자 필터링
 *    - 콘서트를 좋아요한 사용자
 *    - FCM 토큰이 있는 사용자 (푸시 알림 가능)
 *    - 활성 상태인 사용자
 *    - 해당 시간대 알림을 설정한 사용자
 * 3. FCM 푸시 알림 전송
 * 4. 알림 히스토리 저장
 *
 * @param job - BullMQ Job 객체
 * @param job.data.concertId - 콘서트 ID
 * @param job.data.concertTitle - 콘서트 제목
 * @param job.data.ticketOpenTitle - 티켓 오픈 제목
 * @param job.data.ticketOpenDate - 티켓 오픈 일시
 * @param job.data.notifyBeforeMinutes - 알림 시간 (10, 30, 60, 1440분 전)
 */
async function processTicketNotification(
  job: Job<TicketNotificationJobData>,
): Promise<void> {
  const {
    concertId,
    concertTitle,
    ticketOpenTitle,
    ticketOpenDate: ticketOpenDateRaw, // raw로 받기
    notifyBeforeMinutes,
  } = job.data;

  // ✅ Date 객체로 변환
  const ticketOpenDate = new Date(ticketOpenDateRaw);

  logger.info(
    `📬 Processing ticket notification job: ${concertTitle} - ${notifyBeforeMinutes}min before`,
  );

  try {
    // 1. 콘서트 정보 확인
    // 삭제되거나 존재하지 않는 콘서트는 알림 전송하지 않음
    const concertDB = getDB();
    const concertCollection = concertDB.collection<IConcert>('concerts');
    const concert = await concertCollection.findOne({
      _id: new ObjectId(concertId),
    });

    if (!concert) {
      logger.warn(`Concert not found: ${concertId}`);
      return;
    }

    // 2. 알림을 받을 사용자 조회
    // 다음 조건을 모두 만족하는 사용자만 알림 전송:
    const userDB = getDB();
    const userCollection = userDB.collection<User>('users');

    const users = await userCollection
      .find({
        // 조건 1: 해당 콘서트를 좋아요한 사용자
        likedConcerts: new ObjectId(concertId),

        // 조건 2: FCM 토큰이 있는 사용자 (푸시 알림 전송 가능)
        fcmToken: { $exists: true, $ne: '' },

        // 조건 3: 활성 상태인 사용자 (탈퇴/정지 제외)
        status: UserStatus.ACTIVE,

        // 조건 4: 알림 설정 확인
        $or: [
          // 4-1. notificationPreference가 없는 경우
          //      (신규 사용자 또는 마이그레이션 전 사용자 -> 기본값으로 알림 받음)
          { notificationPreference: { $exists: false } },

          // 4-2. ticketOpenNotification 배열에 해당 시간(notifyBeforeMinutes)이 포함된 경우
          //      예: notifyBeforeMinutes=60이고, ticketOpenNotification=[10, 60, 1440]이면 알림 받음
          {
            'notificationPreference.ticketOpenNotification':
              notifyBeforeMinutes,
          },
        ],
      })
      .toArray();

    if (users.length === 0) {
      logger.info(`No users to notify for concert: ${concertTitle}`);
      return;
    }

    logger.info(
      `Found ${users.length} users who liked the concert and want ${notifyBeforeMinutes}min notification`,
    );

    // 3. FCM 알림 페이로드 생성
    const timeText =
      notifyBeforeMinutes === 1440
        ? '하루'
        : notifyBeforeMinutes === 60
          ? '1시간'
          : notifyBeforeMinutes === 30
            ? '30분'
            : '10분';

    const notificationTitle = `${concertTitle} 티켓 오픈 ${timeText} 전!`;
    const notificationMessage = `${ticketOpenTitle} 티켓 오픈까지 ${timeText} 남았습니다. 놓치지 마세요!`;

    // 4. 500명씩 배치로 FCM 전송
    const totalUsers = users.length;
    let successCount = 0;
    let failureCount = 0;
    const allInvalidTokens: string[] = [];
    const successfulUserIds: ObjectId[] = [];

    for (let i = 0; i < totalUsers; i += FCM_BATCH_SIZE) {
      const batch = users.slice(i, i + FCM_BATCH_SIZE);
      const batchTokens = batch
        .map((user) => user.fcmToken)
        .filter((token): token is string => !!token);

      if (batchTokens.length === 0) {
        continue;
      }

      logger.info(
        `Sending batch ${Math.floor(i / FCM_BATCH_SIZE) + 1}/${Math.ceil(totalUsers / FCM_BATCH_SIZE)} (${batchTokens.length} tokens)`,
      );

      // FCM 배치 전송
      const result = await fcmService.sendBatchNotifications(batchTokens, {
        title: notificationTitle,
        body: notificationMessage,
        data: {
          type: 'ticket_opening',
          concertId: concertId,
          concertTitle: concertTitle,
          ticketOpenTitle: ticketOpenTitle,
          ticketOpenDate: ticketOpenDate.toISOString(),
          notifyBeforeMinutes: notifyBeforeMinutes.toString(),
        },
      });

      successCount += result.successCount;
      failureCount += result.failureCount;
      allInvalidTokens.push(...result.invalidTokens);

      // 성공한 사용자 ID 저장 (NotificationHistory 저장용)
      batch.forEach((user, index) => {
        const tokenIndex =
          batch.slice(0, index + 1).filter((u) => u.fcmToken).length - 1;
        const isSuccess =
          tokenIndex >= 0 &&
          !allInvalidTokens.includes(user.fcmToken as string);
        if (isSuccess && user._id) {
          successfulUserIds.push(user._id);
        }
      });
    }

    logger.info(
      `📊 Notification sending completed: ${successCount} success, ${failureCount} failed`,
    );

    // 6. 잘못된 FCM 토큰 제거
    if (allInvalidTokens.length > 0) {
      await userCollection.updateMany(
        { fcmToken: { $in: allInvalidTokens } },
        { $unset: { fcmToken: '', fcmTokenUpdatedAt: '' } },
      );
      logger.info(`🗑️  Removed ${allInvalidTokens.length} invalid FCM tokens`);
    }

    // 5. NotificationHistory에 저장 (성공한 알림만)
    if (successfulUserIds.length > 0) {
      const notificationHistoryModel = getNotificationHistoryModel(userDB);
      const notificationType = getNotificationType(notifyBeforeMinutes);

      const historyData = successfulUserIds.map((userId) => ({
        userId,
        concertId: new ObjectId(concertId),
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        data: {
          concertId: concertId,
          concertTitle: concertTitle,
          ticketOpenTitle: ticketOpenTitle,
          ticketOpenDate: ticketOpenDate.toISOString(),
        },
      }));

      await notificationHistoryModel.bulkCreate(historyData);
      logger.info(
        `💾 Saved ${successfulUserIds.length} notification histories`,
      );
    }

    logger.info(
      `✅ Ticket notification job completed: ${concertTitle} - ${notifyBeforeMinutes}min before`,
    );
  } catch (error) {
    logger.error('❌ Error processing ticket notification job:', error);
    throw error; // Job 재시도를 위해 에러를 throw
  }
}

/**
 * Create and start the ticket notification worker
 * 티켓 알림 Worker 생성 및 시작
 */
export function createTicketNotificationWorker(): Worker<TicketNotificationJobData> | null {
  try {
    worker = new Worker<TicketNotificationJobData>(
      TICKET_NOTIFICATION_QUEUE_NAME,
      processTicketNotification,
      {
        connection,
        concurrency: 5, // 동시에 5개의 Job 처리
        limiter: {
          max: 10, // 최대 10개의 Job
          duration: 1000, // 1초당
        },
      },
    );

    // Worker 이벤트 핸들러
    worker.on('completed', (job) => {
      logger.info(`✅ Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`❌ Job ${job?.id} failed:`, error);
    });

    worker.on('error', (error) => {
      logger.error('❌ Worker error:', error);
    });

    logger.info(
      `✅ Ticket Notification Worker created: ${TICKET_NOTIFICATION_QUEUE_NAME}`,
    );
    return worker;
  } catch (error) {
    logger.error('❌ Failed to create Ticket Notification Worker:', error);
    return null;
  }
}

/**
 * Close the ticket notification worker
 * 티켓 알림 Worker 종료
 */
export async function closeTicketNotificationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Ticket Notification Worker closed');
  }
}
