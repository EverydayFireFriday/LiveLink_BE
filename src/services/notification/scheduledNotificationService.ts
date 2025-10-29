import { ObjectId } from 'mongodb';
import {
  getScheduledNotificationModel,
  NotificationStatus,
} from '../../models/notification/index.js';
import logger from '../../utils/logger/logger.js';
import { getDB } from '../../utils/database/db.js';
import { notificationQueue } from '../../config/queue/notificationQueue.js';
import type { NotificationJobData } from './notificationWorker.js';

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
 * Service Response Type
 */
export interface ScheduledNotificationServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
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
  ): Promise<ScheduledNotificationServiceResponse> {
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
          } as NotificationJobData,
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
          } as NotificationJobData,
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
    } catch (error: any) {
      logger.error('❌ Failed to create scheduled notification:', error);
      return {
        success: false,
        error: error.message || '예약 알림 생성 중 오류가 발생했습니다',
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
  ): Promise<ScheduledNotificationServiceResponse> {
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
    } catch (error: any) {
      logger.error('❌ Failed to get scheduled notifications:', error);
      return {
        success: false,
        error: error.message || '예약 알림 조회 중 오류가 발생했습니다',
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
  ): Promise<ScheduledNotificationServiceResponse> {
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
    } catch (error: any) {
      logger.error('❌ Failed to get scheduled notification:', error);
      return {
        success: false,
        error: error.message || '예약 알림 조회 중 오류가 발생했습니다',
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
  ): Promise<ScheduledNotificationServiceResponse> {
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
      } catch (queueError: any) {
        // Log but don't fail the request if job removal fails
        logger.warn(
          `⚠️ Failed to remove job from queue: ${queueError.message}`,
        );
      }

      return {
        success: true,
        data: { message: '예약 알림이 취소되었습니다' },
        statusCode: 200,
      };
    } catch (error: any) {
      logger.error('❌ Failed to cancel scheduled notification:', error);
      return {
        success: false,
        error: error.message || '예약 알림 취소 중 오류가 발생했습니다',
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
  ): Promise<ScheduledNotificationServiceResponse> {
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
    } catch (error: any) {
      logger.error('❌ Failed to get notification stats:', error);
      return {
        success: false,
        error: error.message || '통계 조회 중 오류가 발생했습니다',
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
  ): Promise<ScheduledNotificationServiceResponse> {
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
    } catch (error: any) {
      logger.error('❌ Failed to cleanup old notifications:', error);
      return {
        success: false,
        error: error.message || '알림 정리 중 오류가 발생했습니다',
        statusCode: 500,
      };
    }
  }
}
