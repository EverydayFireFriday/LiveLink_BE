import { ObjectId } from 'mongodb';
import {
  getScheduledNotificationModel,
  NotificationStatus,
} from '../../models/notification/index.js';
import logger from '../../utils/logger/logger.js';
import { getDB } from '../../utils/database/db.js';
import { notificationQueue } from '../../config/queue/notificationQueue.js';

/**
 * Create Scheduled Notification Request
 */
export interface CreateScheduledNotificationRequest {
  userId: string;
  concertId?: string;
  title: string;
  message: string;
  data?: Record<string, string>;
  scheduledAt: Date | string;
}

/**
 * Bulk Create Scheduled Notification Request
 */
export interface BulkCreateScheduledNotificationRequest {
  notifications: CreateScheduledNotificationRequest[];
}

/**
 * Service Response Type - Generic to support different data types
 */
export interface ScheduledNotificationServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Notification Statistics Data
 */
export interface NotificationStatsData {
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  total: number;
}

/**
 * Cleanup Result Data
 */
export interface CleanupResultData {
  deletedCount: number;
}

/**
 * Cancel Result Data
 */
export interface CancelResultData {
  message: string;
}

/**
 * Bulk Create Result Data
 */
export interface BulkCreateResultData {
  created: import('../../models/notification/index.js').IScheduledNotification[];
  failed: unknown[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

/**
 * Bulk Cancel Result Data
 */
export interface BulkCancelResultData {
  cancelled: Array<{ id: string; title: string }>;
  failed: Array<{ id: string; error: string }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

/**
 * Scheduled Notification Service
 * 예약 알림 비즈니스 로직 처리
 */
export class ScheduledNotificationService {
  /**
   * Create a new scheduled notification
   * 새로운 예약 알림 생성
   */
  static async createScheduledNotification(
    request: CreateScheduledNotificationRequest,
  ): Promise<
    ScheduledNotificationServiceResponse<
      import('../../models/notification/index.js').IScheduledNotification
    >
  > {
    try {
      const db = getDB();
      const model = getScheduledNotificationModel(db);

      // Validate scheduled time
      const scheduledAt =
        typeof request.scheduledAt === 'string'
          ? new Date(request.scheduledAt)
          : request.scheduledAt;

      if (scheduledAt <= new Date()) {
        return {
          success: false,
          error: '예약 시간은 현재 시간보다 이후여야 합니다',
          statusCode: 400,
        };
      }

      // Create notification
      const notification = await model.create({
        userId: new ObjectId(request.userId),
        concertId: request.concertId
          ? new ObjectId(request.concertId)
          : undefined,
        title: request.title,
        message: request.message,
        data: request.data,
        scheduledAt,
        status: NotificationStatus.PENDING,
      });

      logger.info(
        `✅ Scheduled notification created: ${notification._id} for user ${request.userId}`,
      );

      // Add job to BullMQ queue with delay
      const delay = scheduledAt.getTime() - Date.now();

      if (delay > 0) {
        // Schedule for future
        await notificationQueue.add(
          'send-notification',
          {
            notificationId: notification._id!.toString(),
          },
          {
            delay,
            jobId: notification._id!.toString(), // Use notification ID as job ID to prevent duplicates
          },
        );
        logger.info(
          `📬 Job added to queue: ${notification._id}, will execute in ${Math.round(delay / 1000)}s`,
        );
      } else {
        // Send immediately (should not happen due to validation, but just in case)
        await notificationQueue.add(
          'send-notification',
          {
            notificationId: notification._id!.toString(),
          },
          {
            jobId: notification._id!.toString(),
          },
        );
        logger.info(`📬 Job added to queue (immediate): ${notification._id}`);
      }

      return {
        success: true,
        data: notification,
        statusCode: 201,
      };
    } catch (error) {
      logger.error('❌ Failed to create scheduled notification:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '예약 알림 생성 중 오류가 발생했습니다',
        statusCode: 500,
      };
    }
  }

  /**
   * Get user's scheduled notifications
   * 사용자의 예약 알림 목록 조회
   */
  static async getUserScheduledNotifications(
    userId: string,
    status?: NotificationStatus,
  ): Promise<
    ScheduledNotificationServiceResponse<
      import('../../models/notification/index.js').IScheduledNotification[]
    >
  > {
    try {
      const db = getDB();
      const model = getScheduledNotificationModel(db);
      const notifications = await model.findByUserId(
        new ObjectId(userId),
        status,
      );

      return {
        success: true,
        data: notifications,
        statusCode: 200,
      };
    } catch (error) {
      logger.error('❌ Failed to get scheduled notifications:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '예약 알림 조회 중 오류가 발생했습니다',
        statusCode: 500,
      };
    }
  }

  /**
   * Get scheduled notification by ID
   * ID로 예약 알림 조회
   */
  static async getScheduledNotificationById(
    notificationId: string,
    userId?: string,
  ): Promise<
    ScheduledNotificationServiceResponse<
      import('../../models/notification/index.js').IScheduledNotification
    >
  > {
    try {
      const db = getDB();
      const model = getScheduledNotificationModel(db);
      const notification = await model.findById(new ObjectId(notificationId));

      if (!notification) {
        return {
          success: false,
          error: '예약 알림을 찾을 수 없습니다',
          statusCode: 404,
        };
      }

      // Verify ownership if userId provided
      if (userId && notification.userId.toString() !== userId) {
        return {
          success: false,
          error: '접근 권한이 없습니다',
          statusCode: 403,
        };
      }

      return {
        success: true,
        data: notification,
        statusCode: 200,
      };
    } catch (error) {
      logger.error('❌ Failed to get scheduled notification:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '예약 알림 조회 중 오류가 발생했습니다',
        statusCode: 500,
      };
    }
  }

  /**
   * Cancel a scheduled notification
   * 예약 알림 취소
   */
  static async cancelScheduledNotification(
    notificationId: string,
    userId: string,
  ): Promise<ScheduledNotificationServiceResponse<CancelResultData>> {
    try {
      const db = getDB();
      const model = getScheduledNotificationModel(db);

      // Check if notification exists and belongs to user
      const notification = await model.findById(new ObjectId(notificationId));

      if (!notification) {
        return {
          success: false,
          error: '예약 알림을 찾을 수 없습니다',
          statusCode: 404,
        };
      }

      if (notification.userId.toString() !== userId) {
        return {
          success: false,
          error: '접근 권한이 없습니다',
          statusCode: 403,
        };
      }

      if (notification.status !== NotificationStatus.PENDING) {
        return {
          success: false,
          error: '대기 중인 알림만 취소할 수 있습니다',
          statusCode: 400,
        };
      }

      // Cancel the notification
      const cancelled = await model.cancel(new ObjectId(notificationId));

      if (!cancelled) {
        return {
          success: false,
          error: '예약 알림 취소에 실패했습니다',
          statusCode: 500,
        };
      }

      logger.info(
        `✅ Scheduled notification cancelled: ${notificationId} by user ${userId}`,
      );

      // Remove job from queue
      try {
        const job = await notificationQueue.getJob(notificationId);
        if (job) {
          await job.remove();
          logger.info(`🗑️ Job removed from queue: ${notificationId}`);
        }
      } catch (queueError) {
        // Log but don't fail the request if job removal fails
        logger.warn(
          `⚠️ Failed to remove job from queue: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
      }

      return {
        success: true,
        data: { message: '예약 알림이 취소되었습니다' },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('❌ Failed to cancel scheduled notification:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '예약 알림 취소 중 오류가 발생했습니다',
        statusCode: 500,
      };
    }
  }

  /**
   * Get notification statistics
   * 알림 통계 조회
   */
  static async getNotificationStats(
    userId?: string,
  ): Promise<ScheduledNotificationServiceResponse<NotificationStatsData>> {
    try {
      const db = getDB();
      const model = getScheduledNotificationModel(db);
      const userIdObj = userId ? new ObjectId(userId) : undefined;
      const counts = await model.countByStatus(userIdObj);

      return {
        success: true,
        data: {
          pending: counts[NotificationStatus.PENDING] || 0,
          sent: counts[NotificationStatus.SENT] || 0,
          failed: counts[NotificationStatus.FAILED] || 0,
          cancelled: counts[NotificationStatus.CANCELLED] || 0,
          total: Object.values(counts).reduce((sum, count) => sum + count, 0),
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('❌ Failed to get notification stats:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '통계 조회 중 오류가 발생했습니다',
        statusCode: 500,
      };
    }
  }

  /**
   * Cleanup old notifications (for maintenance)
   * 오래된 알림 정리 (유지보수용)
   */
  static async cleanupOldNotifications(
    daysOld: number = 30,
  ): Promise<ScheduledNotificationServiceResponse<CleanupResultData>> {
    try {
      const db = getDB();
      const model = getScheduledNotificationModel(db);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await model.deleteOldNotifications(cutoffDate);

      logger.info(
        `🧹 Cleaned up ${deletedCount} old notifications (older than ${daysOld} days)`,
      );

      return {
        success: true,
        data: { deletedCount },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('❌ Failed to cleanup old notifications:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '알림 정리 중 오류가 발생했습니다',
        statusCode: 500,
      };
    }
  }

  /**
   * Bulk create scheduled notifications
   * 예약 알림 일괄 생성 (N+1 문제 해결)
   */
  static async bulkCreateScheduledNotifications(
    requests: CreateScheduledNotificationRequest[],
  ): Promise<ScheduledNotificationServiceResponse<BulkCreateResultData>> {
    try {
      if (!requests || requests.length === 0) {
        return {
          success: false,
          error: '생성할 알림이 없습니다',
          statusCode: 400,
        };
      }

      const db = getDB();
      const model = getScheduledNotificationModel(db);
      const now = new Date();

      // Validate all requests first
      const validationErrors: string[] = [];
      const validData: Omit<
        import('../../models/notification/index.js').IScheduledNotification,
        '_id' | 'createdAt' | 'updatedAt'
      >[] = [];

      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        const scheduledAt =
          typeof request.scheduledAt === 'string'
            ? new Date(request.scheduledAt)
            : request.scheduledAt;

        if (scheduledAt <= now) {
          validationErrors.push(
            `알림 ${i + 1}: 예약 시간은 현재 시간보다 이후여야 합니다`,
          );
        } else if (!request.title || !request.message) {
          validationErrors.push(`알림 ${i + 1}: 제목과 메시지는 필수입니다`);
        } else {
          validData.push({
            userId: new ObjectId(request.userId),
            concertId: request.concertId
              ? new ObjectId(request.concertId)
              : undefined,
            title: request.title,
            message: request.message,
            data: request.data,
            scheduledAt,
            status: NotificationStatus.PENDING,
          });
        }
      }

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: validationErrors.join(', '),
          statusCode: 400,
        };
      }

      // Bulk create notifications in MongoDB (1 query instead of N)
      const createdNotifications = await model.bulkCreate(validData);

      logger.info(
        `✅ Bulk created ${createdNotifications.length} notifications in MongoDB`,
      );

      // Bulk add jobs to BullMQ queue (1 operation instead of N)
      const jobs = createdNotifications.map((notification) => {
        const delay = notification.scheduledAt.getTime() - Date.now();
        return {
          name: 'send-notification',
          data: {
            notificationId: notification._id!.toString(),
          },
          opts: {
            delay: delay > 0 ? delay : 0,
            jobId: notification._id!.toString(),
          },
        };
      });

      await notificationQueue.addBulk(jobs);

      logger.info(
        `✅ Bulk added ${jobs.length} jobs to queue - Bulk create completed`,
      );

      return {
        success: true,
        data: {
          created: createdNotifications,
          failed: [],
          summary: {
            total: requests.length,
            succeeded: createdNotifications.length,
            failed: requests.length - createdNotifications.length,
          },
        },
        statusCode: 201,
      };
    } catch (error) {
      logger.error('❌ Failed to bulk create scheduled notifications:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '예약 알림 일괄 생성 중 오류가 발생했습니다',
        statusCode: 500,
      };
    }
  }

  /**
   * Bulk cancel scheduled notifications
   * 예약 알림 일괄 취소 (N+1 문제 해결)
   */
  static async bulkCancelScheduledNotifications(
    notificationIds: string[],
    userId: string,
  ): Promise<ScheduledNotificationServiceResponse<BulkCancelResultData>> {
    try {
      if (!notificationIds || notificationIds.length === 0) {
        return {
          success: false,
          error: '취소할 알림이 없습니다',
          statusCode: 400,
        };
      }

      const db = getDB();
      const model = getScheduledNotificationModel(db);

      // Convert string IDs to ObjectId
      const objectIds = notificationIds.map((id) => new ObjectId(id));

      // Bulk fetch all notifications (1 query instead of N)
      const notifications = await model.findByIds(objectIds);

      // Create a map for quick lookup
      const notificationMap = new Map(
        notifications.map((n) => [n._id!.toString(), n]),
      );

      // Validate ownership and status
      const validIds: ObjectId[] = [];
      const failedNotifications: { id: string; error: string }[] = [];

      for (const notificationId of notificationIds) {
        const notification = notificationMap.get(notificationId);

        if (!notification) {
          failedNotifications.push({
            id: notificationId,
            error: '예약 알림을 찾을 수 없습니다',
          });
          continue;
        }

        if (notification.userId.toString() !== userId) {
          failedNotifications.push({
            id: notificationId,
            error: '접근 권한이 없습니다',
          });
          continue;
        }

        if (notification.status !== NotificationStatus.PENDING) {
          failedNotifications.push({
            id: notificationId,
            error: '대기 중인 알림만 취소할 수 있습니다',
          });
          continue;
        }

        validIds.push(new ObjectId(notificationId));
      }

      // Bulk cancel in MongoDB (1 query instead of N)
      const cancelledCount = await model.bulkCancel(validIds);

      logger.info(
        `✅ Bulk cancelled ${cancelledCount} notifications in MongoDB`,
      );

      // Bulk remove jobs from queue
      const queueRemovalPromises = validIds.map(async (id) => {
        const idStr = id.toString();
        try {
          const job = await notificationQueue.getJob(idStr);
          if (job) {
            await job.remove();
          }
        } catch (queueError) {
          logger.warn(
            `⚠️ Failed to remove job from queue: ${idStr} - ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
        }
      });

      await Promise.all(queueRemovalPromises);

      logger.info(`✅ Removed ${validIds.length} jobs from queue`);

      // Build success list
      const cancelledNotifications = validIds.map((id) => {
        const notification = notificationMap.get(id.toString())!;
        return {
          id: id.toString(),
          title: notification.title,
        };
      });

      logger.info(
        `✅ Bulk cancel completed: ${cancelledNotifications.length} cancelled, ${failedNotifications.length} failed`,
      );

      return {
        success: true,
        data: {
          cancelled: cancelledNotifications,
          failed: failedNotifications,
          summary: {
            total: notificationIds.length,
            succeeded: cancelledNotifications.length,
            failed: failedNotifications.length,
          },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('❌ Failed to bulk cancel scheduled notifications:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '예약 알림 일괄 취소 중 오류가 발생했습니다',
        statusCode: 500,
      };
    }
  }
}
