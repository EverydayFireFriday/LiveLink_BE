import { Worker, Job } from 'bullmq';
import { ObjectId } from 'mongodb';
import logger from '../../utils/logger/logger.js';
import { env } from '../../config/env/env.js';
import {
  CONCERT_START_NOTIFICATION_QUEUE_NAME,
  ConcertStartNotificationJobData,
} from '../../config/queue/concertStartNotificationQueue.js';
import { getDB } from '../../utils/database/db.js';
import { User, UserStatus } from '../../models/auth/user.js';
import { IConcert } from '../../models/concert/base/ConcertTypes.js';
import fcmService from './fcmService.js';
import { getNotificationHistoryModel } from '../../models/notification/notificationHistory.js';
import { ConcertStartNotificationType } from '../../models/notification/notificationHistory.js';

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
 * Concert Start Notification Worker
 * 공연 시작 알림 Worker
 *
 * BullMQ에서 Job을 받아서:
 * 1. 콘서트를 좋아요한 사용자 조회
 * 2. 런타임 필터링 (알림 설정 확인)
 * 3. FCM 배치 전송 (500명씩)
 * 4. NotificationHistory에 저장
 */

let worker: Worker<ConcertStartNotificationJobData> | null = null;

// FCM 배치 크기 (Firebase 권장: 500)
const FCM_BATCH_SIZE = 500;

/**
 * Get notification type based on minutes before
 * 몇 분 전인지에 따라 알림 타입 반환
 */
function getNotificationType(
  notifyBeforeMinutes: number,
): ConcertStartNotificationType {
  switch (notifyBeforeMinutes) {
    case 60:
      return ConcertStartNotificationType.CONCERT_START_1HOUR;
    case 180:
      return ConcertStartNotificationType.CONCERT_START_3HOUR;
    case 1440:
      return ConcertStartNotificationType.CONCERT_START_1DAY;
    default:
      return ConcertStartNotificationType.CONCERT_START_1HOUR;
  }
}

/**
 * Process concert start notification job
 * 공연 시작 알림 Job 처리
 */
async function processConcertStartNotification(
  job: Job<ConcertStartNotificationJobData>,
): Promise<void> {
  const { concertId, concertTitle, performanceDate, notifyBeforeMinutes } =
    job.data;

  logger.info(
    `📬 Processing concert start notification job: ${concertTitle} - ${notifyBeforeMinutes}min before`,
  );

  try {
    // 1. 콘서트 정보 확인
    const concertDB = getDB();
    const concertCollection = concertDB.collection<IConcert>('concerts');
    const concert = await concertCollection.findOne({
      _id: new ObjectId(concertId),
    });

    if (!concert) {
      logger.warn(`Concert not found: ${concertId}`);
      return;
    }

    // 2. 콘서트를 좋아요한 사용자 조회 (런타임 필터링)
    const userDB = getDB();
    const userCollection = userDB.collection<User>('users');

    const users = await userCollection
      .find({
        likedConcerts: new ObjectId(concertId),
        fcmToken: { $exists: true, $ne: '' }, // FCM 토큰이 있는 사용자만
        status: UserStatus.ACTIVE, // 활성 사용자만
        // 알림 설정 필터링
        $or: [
          // notificationPreference가 없는 경우 (기본값으로 알림 받음)
          { notificationPreference: { $exists: false } },
          // concertStartNotification 배열에 해당 시간이 포함된 경우
          {
            'notificationPreference.concertStartNotification':
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
        : notifyBeforeMinutes === 180
          ? '3시간'
          : '1시간';

    const notificationTitle = `${concertTitle} 공연 시작 ${timeText} 전!`;
    const notificationMessage = `공연 시작까지 ${timeText} 남았습니다. 곧 시작됩니다!`;

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
          type: 'concert_start',
          concertId: concertId,
          concertTitle: concertTitle,
          performanceDate: performanceDate.toISOString(),
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

    // 5. 잘못된 FCM 토큰 제거
    if (allInvalidTokens.length > 0) {
      await userCollection.updateMany(
        { fcmToken: { $in: allInvalidTokens } },
        { $unset: { fcmToken: '', fcmTokenUpdatedAt: '' } },
      );
      logger.info(`🗑️  Removed ${allInvalidTokens.length} invalid FCM tokens`);
    }

    // 6. NotificationHistory에 저장 (성공한 알림만)
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
          performanceDate: performanceDate.toISOString(),
        },
      }));

      await notificationHistoryModel.bulkCreate(historyData);
      logger.info(
        `💾 Saved ${successfulUserIds.length} notification histories`,
      );
    }

    logger.info(
      `✅ Concert start notification job completed: ${concertTitle} - ${notifyBeforeMinutes}min before`,
    );
  } catch (error) {
    logger.error('❌ Error processing concert start notification job:', error);
    throw error; // Job 재시도를 위해 에러를 throw
  }
}

/**
 * Create and start the concert start notification worker
 * 공연 시작 알림 Worker 생성 및 시작
 */
export function createConcertStartNotificationWorker(): Worker<ConcertStartNotificationJobData> | null {
  try {
    worker = new Worker<ConcertStartNotificationJobData>(
      CONCERT_START_NOTIFICATION_QUEUE_NAME,
      processConcertStartNotification,
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
      `✅ Concert Start Notification Worker created: ${CONCERT_START_NOTIFICATION_QUEUE_NAME}`,
    );
    return worker;
  } catch (error) {
    logger.error(
      '❌ Failed to create Concert Start Notification Worker:',
      error,
    );
    return null;
  }
}

/**
 * Close the concert start notification worker
 * 공연 시작 알림 Worker 종료
 */
export async function closeConcertStartNotificationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Concert Start Notification Worker closed');
  }
}
