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
import type { INotificationHistory } from '../../models/notification/notificationHistory.js';
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
 * 3. ObjectId 사전 생성 (historyId)
 * 4. FCM 개별 전송 (각 사용자의 badge count와 historyId 포함)
 * 5. 성공한 알림만 NotificationHistory에 저장
 */

let worker: Worker<ConcertStartNotificationJobData> | null = null;

// 한 번에 처리할 사용자 수 (메모리 관리 및 로깅을 위한 그룹 단위)
// 각 사용자에게는 개별적으로 FCM 전송 (badge count와 historyId 포함)
const PROCESSING_BATCH_SIZE = 500;

/**
 * Get notification type
 * 알림 타입 반환
 */
function getNotificationType(): ConcertStartNotificationType {
  return ConcertStartNotificationType.CONCERT_START;
}

/**
 * Process concert start notification job
 * 공연 시작 알림 Job 처리
 *
 * @description
 * 공연 시작 알림을 처리하는 Worker 함수입니다.
 * 스케줄러가 등록한 Job을 받아서 다음 작업을 수행합니다:
 *
 * 1. 콘서트 정보 확인
 * 2. 알림 받을 사용자 필터링
 *    - 콘서트를 좋아요한 사용자
 *    - FCM 토큰이 있는 사용자 (푸시 알림 가능)
 *    - 활성 상태인 사용자
 *    - 해당 시간대 알림을 설정한 사용자
 * 3. 각 사용자에 대해 ObjectId 사전 생성 (historyId)
 * 4. FCM 푸시 알림 개별 전송 (badge count와 historyId 포함)
 * 5. 성공한 알림만 히스토리 저장 (사전 생성된 historyId 사용)
 * 6. 잘못된 FCM 토큰 제거
 *
 * @param job - BullMQ Job 객체
 * @param job.data.concertId - 콘서트 ID
 * @param job.data.concertTitle - 콘서트 제목
 * @param job.data.performanceDate - 공연 일시
 * @param job.data.notifyBeforeMinutes - 알림 시간 (60, 180, 1440분 전)
 */
async function processConcertStartNotification(
  job: Job<ConcertStartNotificationJobData>,
): Promise<void> {
  const {
    concertId,
    concertTitle,
    performanceDate: performanceDateRaw,
    notifyBeforeMinutes,
  } = job.data;

  const performanceDate = new Date(performanceDateRaw);

  logger.info(
    `📬 Processing concert start notification job: ${concertTitle} - ${notifyBeforeMinutes}min before`,
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

          // 4-2. concertStartNotification 배열에 해당 시간(notifyBeforeMinutes)이 포함된 경우
          //      예: notifyBeforeMinutes=180이고, concertStartNotification=[60, 180, 1440]이면 알림 받음
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

    // 4. 각 사용자에 대해 ObjectId 미리 생성 및 매핑
    const userHistoryMap = new Map<string, ObjectId>(); // userId -> historyId
    users.forEach((user) => {
      if (user._id) {
        userHistoryMap.set(user._id.toString(), new ObjectId());
      }
    });

    // 5. FCM 개별 전송 (각 사용자의 badge count와 historyId 포함)
    const totalUsers = users.length;
    let successCount = 0;
    let failureCount = 0;
    const allInvalidTokens: string[] = [];
    const successfulHistories: INotificationHistory[] = [];
    const notificationHistoryModel = getNotificationHistoryModel(userDB);
    const notificationType = getNotificationType();

    for (let i = 0; i < totalUsers; i += PROCESSING_BATCH_SIZE) {
      const batch = users.slice(i, i + PROCESSING_BATCH_SIZE);

      logger.info(
        `Processing batch ${Math.floor(i / PROCESSING_BATCH_SIZE) + 1}/${Math.ceil(totalUsers / PROCESSING_BATCH_SIZE)} (${batch.length} users)`,
      );

      // 각 사용자에게 개별 전송 (badge count와 historyId 포함)
      for (const user of batch) {
        if (!user.fcmToken || !user._id) continue;

        const historyId = userHistoryMap.get(user._id.toString());
        if (!historyId) continue;

        try {
          const unreadCount = await notificationHistoryModel.countUnread(
            user._id,
          );

          const success = await fcmService.sendNotification(user.fcmToken, {
            title: notificationTitle,
            body: notificationMessage,
            badge: unreadCount + 1,
            data: {
              concertId: concertId,
              concertTitle: concertTitle,
              performanceDate: performanceDate.toISOString(),
              notifyBeforeMinutes: notifyBeforeMinutes.toString(),
              historyId: historyId.toString(),
            },
          });

          if (success) {
            successCount++;
            // 성공한 경우에만 history 데이터 준비
            successfulHistories.push({
              _id: historyId, // 사전 생성한 ObjectId 사용
              userId: user._id,
              type: notificationType,
              title: notificationTitle,
              message: notificationMessage,
              isRead: false,
              sentAt: new Date(),
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90일
              data: {
                concertId: concertId,
                concertTitle: concertTitle,
                performanceDate: performanceDate.toISOString(),
              },
            });
          } else {
            failureCount++;
            allInvalidTokens.push(user.fcmToken);
          }
        } catch (error) {
          logger.error(
            `Failed to send to ${user.fcmToken.substring(0, 20)}...`,
            error,
          );
          failureCount++;
          allInvalidTokens.push(user.fcmToken);
        }
      }
    }

    logger.info(
      `📊 Notification sending completed: ${successCount} success, ${failureCount} failed`,
    );

    // 6. 성공한 알림만 DB에 일괄 저장
    if (successfulHistories.length > 0) {
      await notificationHistoryModel.bulkInsertWithIds(successfulHistories);
      logger.info(
        `💾 Saved ${successfulHistories.length} notification histories`,
      );
    }

    // 7. 잘못된 FCM 토큰 제거
    if (allInvalidTokens.length > 0) {
      await userCollection.updateMany(
        { fcmToken: { $in: allInvalidTokens } },
        { $unset: { fcmToken: '', fcmTokenUpdatedAt: '' } },
      );
      logger.info(`🗑️  Removed ${allInvalidTokens.length} invalid FCM tokens`);
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
