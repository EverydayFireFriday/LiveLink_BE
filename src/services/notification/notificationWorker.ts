import { Worker, Job } from 'bullmq';
import { ObjectId } from 'mongodb';
import {
  getScheduledNotificationModel,
  NotificationStatus,
} from '../../models/notification/index.js';
import {
  getNotificationHistoryModel,
  ScheduledNotificationType,
} from '../../models/notification/notificationHistory.js';
import FCMService, { NotificationPayload } from './fcmService.js';
import { UserModel } from '../../models/auth/user.js';
import logger from '../../utils/logger/logger.js';
import { env } from '../../config/env/env.js';
import { getDB } from '../../utils/database/db.js';

/**
 * Job Data Interface
 */
export interface NotificationJobData {
  notificationId: string;
}

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
 * Process notification job
 * Job을 처리하여 실제로 알림을 전송
 *
 * @description
 * 스케줄된 알림을 처리하는 Worker 함수입니다.
 * 다음 작업을 수행합니다:
 *
 * 1. 스케줄된 알림 정보 조회
 * 2. 사용자 및 FCM 토큰 확인
 * 3. ObjectId 사전 생성 (historyId)
 * 4. FCM 푸시 알림 전송 (historyId 포함)
 * 5. 성공 시 NotificationHistory 저장 (사전 생성된 historyId 사용)
 * 6. 실패 시 잘못된 FCM 토큰 제거
 */
async function processNotification(
  job: Job<NotificationJobData>,
): Promise<void> {
  const { notificationId } = job.data;

  logger.info(`📬 Processing notification job: ${notificationId}`);

  try {
    const db = getDB();
    const model = getScheduledNotificationModel(db);

    // Get notification from database
    const notification = await model.findById(new ObjectId(notificationId));

    if (!notification) {
      logger.warn(`⚠️ Notification not found: ${notificationId}`);
      throw new Error('Notification not found');
    }

    // Check if already sent or cancelled
    if (notification.status !== NotificationStatus.PENDING) {
      logger.warn(
        `⚠️ Notification ${notificationId} is not pending (status: ${notification.status})`,
      );
      return; // Job 성공으로 처리 (재시도 불필요)
    }

    // Get user's FCM token
    const userModel = new UserModel();
    const user = await userModel.findById(notification.userId);

    if (!user) {
      logger.warn(`⚠️ User not found: ${notification.userId}`);
      await model.markAsFailed(new ObjectId(notificationId), 'User not found');
      return;
    }

    if (!user.fcmToken) {
      logger.warn(`⚠️ No FCM token for user: ${notification.userId}`);
      await model.markAsFailed(
        new ObjectId(notificationId),
        'No FCM token registered',
      );
      return;
    }

    // Get unread notification count
    const notificationHistoryModel = getNotificationHistoryModel(db);
    const unreadCount = await notificationHistoryModel.countUnread(
      notification.userId,
    );

    // ✅ ObjectId 미리 생성 (historyId)
    const historyId = new ObjectId();

    // Prepare FCM payload
    const payload: NotificationPayload = {
      title: notification.title,
      body: notification.message,
      data: {
        ...(notification.data || {}),
        notificationId: notificationId,
        scheduledAt: notification.scheduledAt.toISOString(),
        historyId: historyId.toString(),
        ...(notification.concertId && {
          concertId: notification.concertId.toString(),
        }),
      },
      badge: unreadCount + 1,
    };

    // Send notification via FCM
    const success = await FCMService.sendNotification(user.fcmToken, payload);

    if (success) {
      // Mark as sent
      await model.markAsSent(new ObjectId(notificationId));

      // ✅ NotificationHistory 저장 (사전 생성한 historyId 사용)
      await notificationHistoryModel.bulkInsertWithIds([
        {
          _id: historyId,
          userId: notification.userId,
          type: ScheduledNotificationType.SCHEDULED,
          title: notification.title,
          message: notification.message,
          isRead: false,
          sentAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90일
          data: {
            ...(notification.data || {}),
            ...(notification.concertId && {
              concertId: notification.concertId.toString(),
            }),
          },
        },
      ]);

      logger.info(
        `✅ Notification sent successfully: ${notificationId} to user ${notification.userId}`,
      );
    } else {
      // Invalid FCM token - mark as failed and clear token
      await model.markAsFailed(
        new ObjectId(notificationId),
        'Invalid or expired FCM token',
      );

      // Clear invalid FCM token
      await userModel.userCollection.updateOne(
        { _id: notification.userId },
        { $unset: { fcmToken: '' }, $set: { fcmTokenUpdatedAt: new Date() } },
      );

      logger.warn(
        `⚠️ Invalid FCM token cleared for user ${notification.userId.toString()}`,
      );
    }
  } catch (error: any) {
    logger.error(`❌ Failed to process notification ${notificationId}:`, error);

    // Mark as failed in database
    try {
      const db = getDB();
      const model = getScheduledNotificationModel(db);
      await model.markAsFailed(
        new ObjectId(notificationId),
        error.message || 'Unknown error',
      );
    } catch (dbError) {
      logger.error('❌ Failed to mark notification as failed:', dbError);
    }

    // Re-throw to trigger BullMQ retry
    throw error;
  }
}

/**
 * Create and start the notification worker
 */
export function createNotificationWorker(): Worker<NotificationJobData> {
  const worker = new Worker<NotificationJobData>(
    'scheduled-notifications',
    processNotification,
    {
      connection,
      concurrency: 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000, // per second
      },
    },
  );

  // Worker event handlers
  worker.on('ready', () => {
    logger.info('🚀 Notification worker ready');
  });

  worker.on('completed', (job) => {
    logger.info(`✅ Worker completed job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`❌ Worker failed job ${job?.id}:`, error);
  });

  worker.on('error', (error) => {
    logger.error('❌ Worker error:', error);
  });

  return worker;
}

/**
 * Close worker gracefully
 */
export async function closeNotificationWorker(worker: Worker): Promise<void> {
  logger.info('🛑 Closing notification worker...');
  await worker.close();
  logger.info('✅ Notification worker closed');
}
