import { Db, ObjectId, Collection } from 'mongodb';
import logger from '../../utils/logger/logger.js';

/**
 * Notification Type for Ticket Opening
 * 티켓 오픈 알림 타입
 */
export enum TicketNotificationType {
  TICKET_OPEN_10MIN = 'ticket_open_10min', // 10분 전
  TICKET_OPEN_30MIN = 'ticket_open_30min', // 30분 전
  TICKET_OPEN_1HOUR = 'ticket_open_1hour', // 1시간 전
  TICKET_OPEN_1DAY = 'ticket_open_1day', // 하루 전
}

/**
 * Notification Type for Concert Start
 * 공연 시작 알림 타입
 */
export enum ConcertStartNotificationType {
  CONCERT_START_1HOUR = 'concert_start_1hour', // 1시간 전
  CONCERT_START_3HOUR = 'concert_start_3hour', // 3시간 전
  CONCERT_START_1DAY = 'concert_start_1day', // 하루 전
}

/**
 * Notification Type for Scheduled Notifications
 * 스케줄된 알림 타입
 */
export enum ScheduledNotificationType {
  SCHEDULED = 'scheduled', // 스케줄된 일반 알림
}

/**
 * Combined Notification Type
 * 통합 알림 타입
 */
export type NotificationType =
  | TicketNotificationType
  | ConcertStartNotificationType
  | ScheduledNotificationType;

/**
 * Notification History Interface
 * 알림 이력 인터페이스
 */
export interface INotificationHistory {
  _id?: ObjectId;
  userId: ObjectId; // 알림을 받은 사용자 ID
  concertId?: ObjectId; // 콘서트 ID (스케줄된 알림의 경우 optional)
  title: string; // 알림 제목
  message: string; // 알림 메시지
  type: NotificationType; // 알림 타입 (티켓 오픈 또는 공연 시작)
  isRead: boolean; // 읽음 여부
  readAt?: Date; // 읽은 시간
  sentAt: Date; // 전송 시간
  data?: Record<string, string>; // 추가 데이터 (FCM data payload)
  createdAt: Date; // 생성 시간
  expiresAt: Date; // TTL 만료 시간 (읽은 알림: 30일, 안읽은 알림: 90일)
}

/**
 * Notification History Model Class
 * 알림 이력 모델 클래스
 */
export class NotificationHistoryModel {
  private static instance: NotificationHistoryModel;
  private collection: Collection<INotificationHistory>;

  // TTL 설정 (일 단위)
  private readonly READ_NOTIFICATION_TTL_DAYS = 30; // 읽은 알림: 30일
  private readonly UNREAD_NOTIFICATION_TTL_DAYS = 90; // 안읽은 알림: 90일

  private constructor(db: Db) {
    this.collection = db.collection<INotificationHistory>(
      'notificationHistory',
    );
    void this.createIndexes();
  }

  /**
   * Get singleton instance
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(db: Db): NotificationHistoryModel {
    if (!NotificationHistoryModel.instance) {
      NotificationHistoryModel.instance = new NotificationHistoryModel(db);
    }
    return NotificationHistoryModel.instance;
  }

  /**
   * Create database indexes
   * 데이터베이스 인덱스 생성
   */
  private async createIndexes(): Promise<void> {
    try {
      // TTL index for automatic deletion
      await this.collection.createIndex(
        { expiresAt: 1 },
        {
          name: 'idx_expiresAt_ttl',
          expireAfterSeconds: 0, // expiresAt 시간에 자동 삭제
        },
      );

      // Index for user's notification history (읽음/안읽음 필터링)
      await this.collection.createIndex(
        { userId: 1, isRead: 1, createdAt: -1 },
        { name: 'idx_userId_isRead_createdAt' },
      );

      // Index for concert-related notifications
      await this.collection.createIndex(
        { concertId: 1, createdAt: -1 },
        { name: 'idx_concertId_createdAt' },
      );

      // Index for unread notifications count
      await this.collection.createIndex(
        { userId: 1, isRead: 1 },
        { name: 'idx_userId_isRead' },
      );

      logger.info('NotificationHistory indexes created successfully');
    } catch (error) {
      logger.error('Error creating NotificationHistory indexes:', error);
    }
  }

  /**
   * Calculate expiration date based on read status
   * 읽음 상태에 따라 만료 날짜 계산
   */
  private calculateExpiresAt(isRead: boolean): Date {
    const now = Date.now();
    const ttlDays = isRead
      ? this.READ_NOTIFICATION_TTL_DAYS
      : this.UNREAD_NOTIFICATION_TTL_DAYS;
    return new Date(now + ttlDays * 24 * 60 * 60 * 1000);
  }

  /**
   * Create a new notification history
   * 새로운 알림 이력 생성
   */
  public async create(
    notificationData: Omit<
      INotificationHistory,
      '_id' | 'createdAt' | 'expiresAt' | 'isRead' | 'sentAt'
    >,
  ): Promise<INotificationHistory> {
    const now = new Date();
    const isRead = false; // 초기 생성 시 읽지 않음

    const notification: INotificationHistory = {
      ...notificationData,
      isRead,
      sentAt: now,
      createdAt: now,
      expiresAt: this.calculateExpiresAt(isRead),
    };

    const result = await this.collection.insertOne(notification);
    return { ...notification, _id: result.insertedId };
  }

  /**
   * Bulk create notification histories
   * 알림 이력 일괄 생성 (배치 전송용)
   */
  public async bulkCreate(
    notificationsData: Omit<
      INotificationHistory,
      '_id' | 'createdAt' | 'expiresAt' | 'isRead' | 'sentAt'
    >[],
  ): Promise<INotificationHistory[]> {
    if (notificationsData.length === 0) {
      return [];
    }

    const now = new Date();
    const isRead = false;
    const expiresAt = this.calculateExpiresAt(isRead);

    const notifications: INotificationHistory[] = notificationsData.map(
      (data) => ({
        ...data,
        isRead,
        sentAt: now,
        createdAt: now,
        expiresAt,
      }),
    );

    const result = await this.collection.insertMany(notifications);

    // Return with inserted IDs
    return notifications.map((notification, index) => ({
      ...notification,
      _id: result.insertedIds[index],
    }));
  }

  /**
   * Bulk insert notification histories with pre-generated IDs
   * 사전 생성된 ID로 알림 이력 일괄 삽입
   * (FCM 전송 후 historyId를 포함시키기 위해 사용)
   */
  public async bulkInsertWithIds(
    notifications: INotificationHistory[],
  ): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    await this.collection.insertMany(notifications);
  }

  /**
   * Find user's notifications with pagination
   * 사용자의 알림 목록 조회 (페이지네이션)
   */
  public async findByUserId(
    userId: ObjectId,
    options?: {
      isRead?: boolean;
      skip?: number;
      limit?: number;
    },
  ): Promise<INotificationHistory[]> {
    const query: { userId: ObjectId; isRead?: boolean } = { userId };
    if (options?.isRead !== undefined) {
      query.isRead = options.isRead;
    }

    const cursor = this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options?.skip || 0);

    if (options?.limit) {
      cursor.limit(options.limit);
    }

    return cursor.toArray();
  }

  /**
   * Find notification by ID
   * ID로 알림 찾기
   */
  public async findById(id: ObjectId): Promise<INotificationHistory | null> {
    return this.collection.findOne({ _id: id });
  }

  /**
   * Mark notification as read
   * 알림을 읽음으로 표시
   */
  public async markAsRead(id: ObjectId): Promise<boolean> {
    const now = new Date();
    const expiresAt = this.calculateExpiresAt(true); // 읽은 알림은 30일 후 만료

    const result = await this.collection.updateOne(
      { _id: id, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: now,
          expiresAt, // TTL 업데이트
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Mark multiple notifications as read
   * 여러 알림을 읽음으로 표시
   */
  public async bulkMarkAsRead(ids: ObjectId[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const now = new Date();
    const expiresAt = this.calculateExpiresAt(true);

    const result = await this.collection.updateMany(
      { _id: { $in: ids }, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: now,
          expiresAt,
        },
      },
    );

    return result.modifiedCount;
  }

  /**
   * Mark all user's notifications as read
   * 사용자의 모든 알림을 읽음으로 표시
   */
  public async markAllAsRead(userId: ObjectId): Promise<number> {
    const now = new Date();
    const expiresAt = this.calculateExpiresAt(true);

    const result = await this.collection.updateMany(
      { userId, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: now,
          expiresAt,
        },
      },
    );

    return result.modifiedCount;
  }

  /**
   * Count unread notifications for user
   * 사용자의 읽지 않은 알림 개수 조회
   */
  public async countUnread(userId: ObjectId): Promise<number> {
    return this.collection.countDocuments({ userId, isRead: false });
  }

  /**
   * Count all notifications by read status
   * 읽음 상태별 알림 개수 조회
   */
  public async countByReadStatus(
    userId: ObjectId,
  ): Promise<{ read: number; unread: number }> {
    const result = await this.collection
      .aggregate<{ _id: boolean; count: number }>([
        { $match: { userId } },
        {
          $group: {
            _id: '$isRead',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const counts = { read: 0, unread: 0 };
    result.forEach((item) => {
      if (item._id === true) {
        counts.read = item.count;
      } else {
        counts.unread = item.count;
      }
    });

    return counts;
  }

  /**
   * Delete notification by ID
   * ID로 알림 삭제
   */
  public async deleteById(id: ObjectId): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  /**
   * Delete all user's notifications
   * 사용자의 모든 알림 삭제
   */
  public async deleteAllByUserId(userId: ObjectId): Promise<number> {
    const result = await this.collection.deleteMany({ userId });
    return result.deletedCount;
  }
}

/**
 * Get NotificationHistory model instance
 * NotificationHistory 모델 인스턴스 가져오기
 */
export const getNotificationHistoryModel = (
  db: Db,
): NotificationHistoryModel => {
  return NotificationHistoryModel.getInstance(db);
};
