import { getDB } from '../../utils/database/db.js';
import { UserModel } from '../../models/auth/user.js';
import { ISupportInquiry } from '../../models/support/supportInquiry.js';
import { FCMService } from '../notification/fcmService.js';
import { getNotificationHistoryModel } from '../../models/notification/notificationHistory.js';
import logger from '../../utils/logger/logger.js';

/**
 * Support Notification Service
 * 지원 문의 알림 서비스
 */
export class SupportNotificationService {
  private fcmService: FCMService;

  constructor() {
    this.fcmService = new FCMService();
  }

  /**
   * Send notification when admin responds to inquiry
   * 관리자가 문의에 답변할 때 알림 전송
   */
  async sendResponseNotification(inquiry: ISupportInquiry): Promise<boolean> {
    try {
      const db = getDB();
      const userModel = new UserModel();
      const notificationHistoryModel = getNotificationHistoryModel(db);

      // Get user information
      const user = await userModel.findById(inquiry.userId);
      if (!user) {
        logger.error(
          `User not found for inquiry: ${inquiry._id?.toString() || 'unknown'}`,
        );
        return false;
      }

      // Check if user has FCM token
      if (!user.fcmToken) {
        logger.info(
          `User ${user._id} has no FCM token. Skipping notification.`,
        );
        return false;
      }

      // Check if admin response exists
      if (!inquiry.adminResponse) {
        logger.error(
          `Admin response not found for inquiry: ${inquiry._id?.toString() || 'unknown'}`,
        );
        return false;
      }

      // Prepare notification payload
      const title = '고객센터 답변 도착';
      const body = `"${inquiry.subject}" 문의에 대한 답변이 등록되었습니다.`;
      const data: Record<string, string> = {
        type: 'support_response',
        inquiryId: inquiry._id?.toString() || '',
        category: inquiry.category,
        screen: 'SupportInquiryDetailScreen',
      };

      // Send FCM notification
      const success = await this.fcmService.sendNotification(user.fcmToken, {
        title,
        body,
        data,
      });

      if (!success) {
        logger.error(
          `Failed to send FCM notification for inquiry: ${inquiry._id}`,
        );
        return false;
      }

      // Save notification history
      await notificationHistoryModel.create({
        userId: inquiry.userId,
        title,
        message: body,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        type: 'support_response' as any,
        data,
      });

      logger.info(
        `Support response notification sent for inquiry: ${inquiry._id?.toString() || 'unknown'}`,
      );
      return true;
    } catch (error) {
      logger.error('Error sending support response notification:', error);
      return false;
    }
  }

  /**
   * Send notification when inquiry status changes (optional)
   * 문의 상태 변경 시 알림 전송 (선택사항)
   */
  async sendStatusChangeNotification(
    inquiry: ISupportInquiry,
    oldStatus: string,
    newStatus: string,
  ): Promise<boolean> {
    try {
      const db = getDB();
      const userModel = new UserModel();
      const notificationHistoryModel = getNotificationHistoryModel(db);

      // Get user information
      const user = await userModel.findById(inquiry.userId);
      if (!user || !user.fcmToken) {
        return false;
      }

      // Prepare notification payload
      const statusMessages: Record<string, string> = {
        PENDING: '대기 중',
        IN_PROGRESS: '처리 중',
        ANSWERED: '답변 완료',
        CLOSED: '종료',
      };

      const title = '문의 상태 변경';
      const body = `"${inquiry.subject}" 문의가 ${statusMessages[newStatus] || newStatus} 상태로 변경되었습니다.`;
      const data: Record<string, string> = {
        type: 'support_status_change',
        inquiryId: inquiry._id?.toString() || '',
        oldStatus,
        newStatus,
        screen: 'SupportInquiryDetailScreen',
      };

      // Send FCM notification
      const success = await this.fcmService.sendNotification(user.fcmToken, {
        title,
        body,
        data,
      });

      if (success) {
        // Save notification history
        await notificationHistoryModel.create({
          userId: inquiry.userId,
          title,
          message: body,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          type: 'support_status_change' as any,
          data,
        });

        logger.info(
          `Support status change notification sent for inquiry: ${inquiry._id?.toString() || 'unknown'}`,
        );
      }

      return success;
    } catch (error) {
      logger.error('Error sending support status change notification:', error);
      return false;
    }
  }
}

export const supportNotificationService = new SupportNotificationService();
