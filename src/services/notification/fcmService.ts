import * as admin from 'firebase-admin';
import { getFirebaseApp } from '../../config/firebase/firebaseConfig';
import logger from '../../utils/logger/logger';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
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
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
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
              badge: 1,
            },
          },
        },
      };

      await this.messaging.send(message);
      logger.info(
        `✅ FCM notification sent successfully to token: ${token.substring(0, 20)}...`,
      );
      return true;
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
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
      logger.error('❌ Failed to send FCM notification:', error);
      throw error;
    }
  }

  /**
   * 여러 FCM 토큰으로 배치 알림 전송
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

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
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
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.sendEachForMulticast(message);

      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      logger.info(
        `📊 FCM batch notification results: ${response.successCount} success, ${response.failureCount} failed, ${invalidTokens.length} invalid tokens`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      logger.error('❌ Failed to send batch FCM notifications:', error);
      throw error;
    }
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
    const updateTypeMessages = {
      info_updated: '공연 정보가 업데이트되었습니다',
      date_changed: '공연 일정이 변경되었습니다',
      ticket_open: '티켓 예매가 오픈되었습니다',
      cancelled: '공연이 취소되었습니다',
    };

    const payload: NotificationPayload = {
      title: notification.concertTitle,
      body: notification.message || updateTypeMessages[notification.updateType],
      data: {
        type: 'concert_update',
        concertId: notification.concertId,
        updateType: notification.updateType,
        timestamp: new Date().toISOString(),
      },
    };

    return await this.sendBatchNotifications(userTokens, payload);
  }
}

export default new FCMService();
