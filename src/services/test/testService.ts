import { ObjectId } from 'mongodb';
import { getConcertTestModel } from '../../models/test/test';
import logger from '../../utils/logger/logger';

import { validateConcertData } from '../../models/concert/validation/ConcertCreateValidation';
import {
  generateObjectIdFromUid,
  isValidImageUrl,
} from '../../models/concert/validation/ConcertValidationUtils';

// Model의 Concert 타입을 그대로 사용 (I 접두사 제거)
import type { IConcert } from '../../models/concert/base/ConcertTypes';
import { UserModel } from '../../models/auth/user';
import { getDB } from '../../utils/database/db';
import {
  getNotificationHistoryModel,
  ConcertUpdateNotificationType,
} from '../../models/notification/notificationHistory';
import * as admin from 'firebase-admin';
import { getFirebaseApp } from '../../config/firebase/firebaseConfig';
import { getConcertModel } from '../../models/concert/concert';

export interface CreateConcertRequest {
  uid: string;
  title: string;
  artist?: string[];
  location: string[]; // ILocation[] -> string[]로 변경
  datetime?: string[]; // 선택적 필드 (날짜 미정인 경우 빈 배열 또는 생략 가능)
  price?: Array<{ tier: string; amount: number }>;
  description?: string;
  category?: string[];
  ticketLink?: Array<{ platform: string; url: string }>;
  ticketOpenDate?: Array<{ openTitle: string; openDate: string }>;
  posterImage?: string;
  infoImages?: string[]; // info -> infoImages로 변경
}

export interface ConcertServiceResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
  statusCode?: number;
}

export class TestService {
  /**
   * 새 테스트 콘서트 생성
   */
  static async createTestConcert(
    concertData: CreateConcertRequest,
  ): Promise<ConcertServiceResponse> {
    try {
      // 1. 데이터 유효성 검증
      const validationResult = validateConcertData(concertData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.message,
          statusCode: 400,
        };
      }

      const ConcertTestModel = getConcertTestModel();

      // 2. UID 중복 확인
      const existingConcert = await ConcertTestModel.findByUid(concertData.uid);
      if (existingConcert) {
        return {
          success: false,
          error: '이미 존재하는 콘서트 UID입니다.',
          statusCode: 409, // Conflict
        };
      }

      // 3. 이미지 URL 유효성 검증 (선택사항)
      if (
        concertData.posterImage &&
        !isValidImageUrl(concertData.posterImage)
      ) {
        return {
          success: false,
          error: '올바르지 않은 포스터 이미지 URL입니다.',
          statusCode: 400,
        };
      }

      // 4. infoImages URL 유효성 검증 (선택사항)
      if (concertData.infoImages && Array.isArray(concertData.infoImages)) {
        for (const imageUrl of concertData.infoImages) {
          if (!isValidImageUrl(imageUrl)) {
            return {
              success: false,
              error: '올바르지 않은 정보 이미지 URL입니다.',
              statusCode: 400,
            };
          }
        }
      }

      // 5. ObjectId 생성
      let mongoId: ObjectId;
      try {
        mongoId = generateObjectIdFromUid(concertData.uid);

        // ObjectId 중복 확인
        const existingById = await ConcertTestModel.findById(
          mongoId.toString(),
        );
        if (existingById) {
          mongoId = new ObjectId();
        }
      } catch (error) {
        mongoId = new ObjectId();
      }

      // 6. 데이터 정규화 및 준비 - Model의 Concert 타입 사용
      const processedData: Omit<IConcert, 'createdAt' | 'updatedAt'> = {
        _id: mongoId,
        uid: concertData.uid,
        title: concertData.title,
        artist: Array.isArray(concertData.artist)
          ? concertData.artist
          : concertData.artist
            ? [concertData.artist]
            : [],
        location: Array.isArray(concertData.location)
          ? concertData.location
          : [concertData.location], // string 배열로 변경
        datetime: concertData.datetime
          ? Array.isArray(concertData.datetime)
            ? concertData.datetime.map((dt) => new Date(dt)) // string을 Date로 변환
            : [new Date(concertData.datetime)]
          : [], // datetime이 없으면 빈 배열
        price: Array.isArray(concertData.price)
          ? concertData.price
          : concertData.price
            ? [concertData.price]
            : [],
        description: concertData.description || '',
        category: Array.isArray(concertData.category)
          ? concertData.category
          : concertData.category
            ? [concertData.category]
            : [],
        ticketLink: Array.isArray(concertData.ticketLink)
          ? concertData.ticketLink
          : concertData.ticketLink
            ? [concertData.ticketLink]
            : [],
        ticketOpenDate: Array.isArray(concertData.ticketOpenDate)
          ? concertData.ticketOpenDate.map((item) => ({
              openTitle: item.openTitle,
              openDate: new Date(item.openDate),
            }))
          : undefined,
        posterImage: concertData.posterImage || '',
        infoImages: concertData.infoImages || [], // info -> infoImages로 변경

        status: 'upcoming',
        likesCount: 0,
      };

      // 7. MongoDB에 저장
      const newConcert = await ConcertTestModel.create(processedData);

      return {
        success: true,
        data: {
          id: mongoId,
          uid: concertData.uid,
          title: concertData.title,
          artist: processedData.artist,
          location: processedData.location,
          datetime: processedData.datetime,
          price: processedData.price,
          category: processedData.category,
          ticketLink: processedData.ticketLink,
          ticketOpenDate: processedData.ticketOpenDate,
          posterImage: processedData.posterImage,
          infoImages: processedData.infoImages, // info -> infoImages로 변경

          status: processedData.status,
          likesCount: 0,
          createdAt: newConcert.createdAt,
          updatedAt: newConcert.updatedAt,
        },
        statusCode: 201,
      };
    } catch (error) {
      logger.error('테스트 콘서트 생성 서비스 에러:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '테스트 콘서트 생성 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 테스트 알림 전송
   */
  static async sendTestNotifications(params: {
    userId?: string;
    fcmToken?: string;
    count: number;
  }): Promise<ConcertServiceResponse> {
    try {
      const { userId, fcmToken, count } = params;
      const userModel = new UserModel();
      const db = getDB();
      const notificationHistoryModel = getNotificationHistoryModel(db);

      // 사용자 찾기
      let user;
      if (userId) {
        user = await userModel.findById(userId);
      } else if (fcmToken) {
        user = await userModel.findByFcmToken(fcmToken);
      }

      if (!user || !user._id) {
        return {
          success: false,
          error: '사용자를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      // 콘서트 하나 찾기
      const Concert = getConcertModel();
      const concert = await Concert.collection.findOne({});
      const concertId = concert ? concert._id : new ObjectId();

      // 알림 생성
      const notifications = [];
      const now = new Date();

      for (let i = 1; i <= count; i++) {
        notifications.push({
          _id: new ObjectId(),
          userId: user._id,
          type: ConcertUpdateNotificationType.CONCERT_UPDATE,
          title: `테스트 알림 ${i}`,
          message: `이것은 ${i}번째 테스트 알림입니다.`,
          data: {
            index: i.toString(),
            concertId: concertId.toString(),
          },
          isRead: false,
          sentAt: new Date(now.getTime() - (count - i) * 60000),
          createdAt: new Date(now.getTime() - (count - i) * 60000),
          expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        });
      }

      // DB에 저장
      await notificationHistoryModel.bulkInsertWithIds(notifications);

      const unreadCount = await notificationHistoryModel.countUnread(user._id);

      let fcmSuccessCount = 0;
      let fcmFailureCount = 0;

      // FCM 전송
      if (user.fcmToken) {
        const app = getFirebaseApp();
        const messaging = admin.messaging(app);

        for (let i = 0; i < notifications.length; i++) {
          const notification = notifications[i];

          try {
            const message: admin.messaging.Message = {
              token: user.fcmToken,
              notification: {
                title: notification.title,
                body: notification.message,
              },
              data: {
                historyId: notification._id.toString(),
                concertId: concertId.toString(),
                index: (i + 1).toString(),
                timestamp: new Date().toISOString(),
              },
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
                    badge: unreadCount - i,
                  },
                },
              },
            };

            await messaging.send(message);
            fcmSuccessCount++;

            // 딜레이
            if (i < notifications.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          } catch (error) {
            logger.error(`FCM 전송 실패 (알림 ${i + 1}):`, error);
            fcmFailureCount++;
          }
        }
      }

      return {
        success: true,
        data: {
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          notificationsCreated: count,
          fcmSent: fcmSuccessCount,
          fcmFailed: fcmFailureCount,
          hasFcmToken: !!user.fcmToken,
          unreadCount,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('테스트 알림 전송 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '테스트 알림 전송 실패',
        statusCode: 500,
      };
    }
  }
}
