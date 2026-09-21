import { Db } from 'mongodb';
import { getScheduledNotificationModel } from '../../models/notification/index.js';
import { notificationQueue } from '../../config/queue/notificationQueue.js';
import logger from '../../utils/logger/logger.js';

/**
 * Notification Recovery Service
 * Redis 장애나 서버 재시작 시 손실된 Job을 MongoDB에서 복구
 */
export class NotificationRecoveryService {
  /**
   * Recover lost jobs from MongoDB
   * pending 상태의 알림 중 Redis Queue에 없는 Job을 재생성
   */
  static async recoverLostJobs(db: Db): Promise<void> {
    try {
      logger.info('🔄 Starting notification job recovery...');

      const model = getScheduledNotificationModel(db);
      const now = new Date();

      // Find all pending notifications that should be sent in the future
      const pendingNotifications = await model.findFuturePendingNotifications();

      if (pendingNotifications.length === 0) {
        logger.info('✅ No pending notifications to recover');
        return;
      }

      logger.info(
        `📋 Found ${pendingNotifications.length} pending notification(s), checking Redis...`,
      );

      let recoveredCount = 0;
      let existingCount = 0;
      let expiredCount = 0;

      for (const notification of pendingNotifications) {
        const notificationId = notification._id!.toString();

        try {
          // Check if job exists in Redis
          const job = await notificationQueue.getJob(notificationId);

          if (job) {
            // Job exists in Redis
            existingCount++;
            logger.debug(`✓ Job exists in Redis: ${notificationId}`);
          } else {
            // Job is missing - recreate it
            const scheduledAt =
              notification.scheduledAt instanceof Date
                ? notification.scheduledAt
                : new Date(notification.scheduledAt);

            const delay = scheduledAt.getTime() - now.getTime();

            if (delay > 0) {
              // Recreate the job
              await notificationQueue.add(
                'send-notification',
                { notificationId },
                {
                  delay,
                  jobId: notificationId,
                },
              );

              recoveredCount++;
              logger.info(
                `🔄 Recovered job: ${notificationId} (will execute in ${Math.round(delay / 1000)}s)`,
              );
            } else {
              // scheduledAt is in the past (should not happen, but handle it)
              // Add immediately
              await notificationQueue.add(
                'send-notification',
                { notificationId },
                {
                  jobId: notificationId,
                },
              );

              expiredCount++;
              logger.warn(
                `⚠️ Recovered expired job (immediate execution): ${notificationId}`,
              );
            }
          }
        } catch (error: unknown) {
          logger.error(
            `❌ Failed to check/recover job ${notificationId}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      logger.info(
        `✅ Recovery complete: ${recoveredCount} recovered, ${expiredCount} expired, ${existingCount} already exist`,
      );
    } catch (error) {
      logger.error('❌ Notification recovery failed:', error);
      // Don't throw - recovery failure shouldn't prevent server startup
    }
  }

  /**
   * Clean up stale jobs (pending in DB but past scheduled time)
   * 전송 시간이 지났는데 아직 pending 상태인 알림 처리
   */
  static async cleanupStaleJobs(db: Db): Promise<void> {
    try {
      logger.info('🧹 Cleaning up stale notification jobs...');

      const model = getScheduledNotificationModel(db);
      const now = new Date();
      const gracePeriod = 5 * 60 * 1000; // 5분 유예 기간

      // Find notifications that are still pending but scheduled time has passed (with grace period)
      const staleNotifications =
        await model.findStalePendingNotifications(gracePeriod);

      if (staleNotifications.length === 0) {
        logger.info('✅ No stale notifications found');
        return;
      }

      logger.warn(
        `⚠️ Found ${staleNotifications.length} stale notification(s) (scheduled time passed > 5min)`,
      );

      let readdedCount = 0;
      let markedFailedCount = 0;

      for (const notification of staleNotifications) {
        const notificationId = notification._id!.toString();

        try {
          // Check if job exists in Redis
          const job = await notificationQueue.getJob(notificationId);

          if (job) {
            // Job exists - probably stuck, let it continue
            logger.debug(`Job exists but not processed yet: ${notificationId}`);
          } else {
            // Job is missing - check if it's too old
            const age =
              now.getTime() - new Date(notification.scheduledAt).getTime();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (age > maxAge) {
              // Too old - mark as failed
              await model.markAsFailed(
                notification._id!,
                'Job lost and too old to recover (>24h)',
              );
              markedFailedCount++;
              logger.warn(`⚠️ Marked as failed (too old): ${notificationId}`);
            } else {
              // Not too old - try to send immediately
              await notificationQueue.add(
                'send-notification',
                { notificationId },
                {
                  jobId: notificationId,
                },
              );
              readdedCount++;
              logger.info(
                `🔄 Re-added stale job for immediate execution: ${notificationId}`,
              );
            }
          }
        } catch (error: unknown) {
          logger.error(
            `❌ Failed to cleanup stale job ${notificationId}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      logger.info(
        `✅ Cleanup complete: ${readdedCount} re-added, ${markedFailedCount} marked as failed`,
      );
    } catch (error) {
      logger.error('❌ Stale job cleanup failed:', error);
    }
  }

  /**
   * Run full recovery process
   * 서버 시작 시 실행할 전체 복구 프로세스
   */
  static async runFullRecovery(db: Db): Promise<void> {
    logger.info('🚀 Running full notification recovery process...');

    // 1. Recover future jobs
    await this.recoverLostJobs(db);

    // 2. Clean up stale jobs
    await this.cleanupStaleJobs(db);

    logger.info('✅ Full recovery process completed');
  }
}
