import * as admin from 'firebase-admin';
import { getFirebaseApp } from '../../config/firebase/firebaseConfig';
import logger from '../../utils/logger/logger';
import { UserModel } from '../../models/auth/user.js';
import { getDB } from '../../utils/database/db.js';
import {
  getNotificationHistoryModel,
  ConcertUpdateNotificationType,
} from '../../models/notification/notificationHistory.js';
import { env } from '../../config/env/env';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  badge?: number;
}

export interface ConcertUpdateNotification {
  concertId: string;
  concertTitle: string;
  updateType: 'info_updated' | 'date_changed' | 'ticket_open' | 'cancelled';
  message: string;
}

export class FCMService {
  private messaging: admin.messaging.Messaging;

  constructor() {
    const app = getFirebaseApp();
    this.messaging = admin.messaging(app);
  }

  /**
   * 단일 FCM 토큰으로 알림 전송
   */
  async sendNotification(
    token: string,
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      // 테스트 서버일 때 제목에 [TEST] 추가
      const finalTitle = env.IS_TEST_SERVER
        ? `[TEST] ${payload.title}`
        : payload.title;

      const message: admin.messaging.Message = {
        token,
        notification: {
          title: finalTitle,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: payload.badge || 1,
            },
          },
        },
      };

      await this.messaging.send(message);
      const logPrefix = env.IS_TEST_SERVER ? '[TEST] ' : '';
      logger.info(
        `✅ ${logPrefix}FCM notification sent successfully to token: ${token.substring(0, 20)}...`,
        {
          title: finalTitle,
          body: payload.body,
        },
      );
      return true;
    } catch (error: unknown) {
      const firebaseError = error as {
        code?: string;
        message?: string;
        errorInfo?: {
          code?: string;
          message?: string;
        };
      };

      // 에러 코드 및 메시지 상세 로깅
      logger.error('❌ FCM notification error details:', {
        code: firebaseError.code,
        message: firebaseError.message,
        errorInfo: firebaseError.errorInfo,
        token: token.substring(0, 20) + '...',
      });

      if (
        firebaseError.code === 'messaging/invalid-registration-token' ||
        firebaseError.code === 'messaging/registration-token-not-registered'
      ) {
        logger.warn(
          `⚠️ Invalid or expired FCM token: ${token.substring(0, 20)}...`,
        );
        // 이 경우 DB에서 토큰을 제거해야 함
        return false;
      }

      if (
        firebaseError.code === 'messaging/third-party-auth-error' ||
        (firebaseError.message && firebaseError.message.includes('APNS'))
      ) {
        logger.error(
          '❌ APNS authentication error - check Firebase Console APNs settings',
        );
      }

      logger.error('❌ Failed to send FCM notification:', error);
      throw error;
    }
  }

  /**
   * 여러 FCM 토큰으로 배치 알림 전송
   * @description
   * 개별 사용자에게 정확한 뱃지 카운트를 보내기 위해 각 토큰에 대해 개별적으로 알림을 전송합니다.
   * 이는 sendEachForMulticast보다 비효율적일 수 있지만, 사용자 경험에 중요합니다.
   * TODO: 대규모 전송 시 성능 최적화를 위해 사용자를 읽지 않은 알림 수로 그룹화하는 로직 추가 고려
   */
  async sendBatchNotifications(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    const userModel = new UserModel();
    const db = getDB();
    const notificationHistoryModel = getNotificationHistoryModel(db);

    for (const token of tokens) {
      try {
        const user = await userModel.findByFcmToken(token);
        if (user && user._id) {
          const unreadCount = await notificationHistoryModel.countUnread(
            user._id,
          );
          const userPayload: NotificationPayload = {
            ...payload,
            badge: unreadCount + 1,
          };
          const success = await this.sendNotification(token, userPayload);
          if (success) {
            successCount++;
          } else {
            failureCount++;
            invalidTokens.push(token);
          }
        } else {
          // 사용자를 찾을 수 없는 경우 토큰을 무효 처리
          logger.warn(
            `User not found for FCM token: ${token.substring(0, 20)}...`,
          );
          failureCount++;
          invalidTokens.push(token);
        }
      } catch (error) {
        logger.error(
          `Failed to send notification to token ${token.substring(0, 20)}...:`,
          error,
        );
        failureCount++;
        invalidTokens.push(token);
      }
    }

    logger.info(
      `📊 FCM batch notification results: ${successCount} success, ${failureCount} failed, ${invalidTokens.length} invalid tokens`,
    );

    return { successCount, failureCount, invalidTokens };
  }

  /**
   * 콘서트 업데이트 알림 생성 및 전송
   */
  async sendConcertUpdateNotification(
    userTokens: string[],
    notification: ConcertUpdateNotification,
  ): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    if (userTokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    const updateTypeMessages = {
      info_updated: '공연 정보가 업데이트되었습니다',
      date_changed: '공연 일정이 변경되었습니다',
      ticket_open: '티켓 예매가 오픈되었습니다',
      cancelled: '공연이 취소되었습니다',
    };

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    const userModel = new UserModel();
    const db = getDB();
    const notificationHistoryModel = getNotificationHistoryModel(db);

    for (const token of userTokens) {
      try {
        const user = await userModel.findByFcmToken(token);
        if (user && user._id) {
          // 알림 히스토리에 저장
          const history = await notificationHistoryModel.create({
            userId: user._id,
            type: ConcertUpdateNotificationType.CONCERT_UPDATE,
            title: notification.concertTitle,
            message:
              notification.message ||
              updateTypeMessages[notification.updateType],
            data: {
              concertId: notification.concertId,
              updateType: notification.updateType,
            },
          });

          const unreadCount = await notificationHistoryModel.countUnread(
            user._id,
          );

          const payload: NotificationPayload = {
            title: notification.concertTitle,
            body:
              notification.message ||
              updateTypeMessages[notification.updateType],
            data: {
              concertId: notification.concertId,
              updateType: notification.updateType,
              timestamp: new Date().toISOString(),
              historyId: history._id!.toString(),
            },
            badge: unreadCount,
          };

          const success = await this.sendNotification(token, payload);
          if (success) {
            successCount++;
          } else {
            failureCount++;
            invalidTokens.push(token);
          }
        } else {
          // 사용자를 찾을 수 없는 경우 토큰을 무효 처리
          logger.warn(
            `User not found for FCM token: ${token.substring(0, 20)}...`,
          );
          failureCount++;
          invalidTokens.push(token);
        }
      } catch (error) {
        logger.error(
          `Failed to send concert update notification to token ${token.substring(0, 20)}...:`,
          error,
        );
        failureCount++;
        invalidTokens.push(token);
      }
    }

    logger.info(
      `📊 Concert update notification results: ${successCount} success, ${failureCount} failed, ${invalidTokens.length} invalid tokens`,
    );

    return { successCount, failureCount, invalidTokens };
  }
}

export default new FCMService();
