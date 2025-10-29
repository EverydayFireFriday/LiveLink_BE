import { Db, ObjectId, Collection } from 'mongodb';
import logger from '../../utils/logger/logger.js';

/**
 * Scheduled Notification Status
 * 예약 알림 상태
 */
export enum NotificationStatus {
  PENDING = 'pending', // 전송 대기 중
  SENT = 'sent', // 전송 완료
  FAILED = 'failed', // 전송 실패
  CANCELLED = 'cancelled', // 취소됨
}

/**
 * Scheduled Notification Interface
 * 예약 알림 인터페이스
 */
export interface IScheduledNotification {
  _id?: ObjectId;
  userId: ObjectId; // 알림을 받을 사용자 ID
  concertId?: ObjectId; // 공연 관련 알림인 경우 공연 ID
  title: string; // 알림 제목
  message: string; // 알림 메시지
  data?: Record<string, string>; // 추가 데이터 (FCM data payload)
  scheduledAt: Date; // 예약 전송 시간
  status: NotificationStatus; // 알림 상태
  sentAt?: Date; // 실제 전송 시간
  errorReason?: string; // 실패 사유
  createdAt: Date; // 생성 시간
  updatedAt: Date; // 업데이트 시간
}

/**
 * Scheduled Notification Model Class
 * 예약 알림 모델 클래스
 */
export class ScheduledNotificationModel {
  private static instance: ScheduledNotificationModel;
  private collection: Collection<IScheduledNotification>;

  private constructor(db: Db) {
    this.collection = db.collection<IScheduledNotification>(
      'scheduledNotifications',
    );
    void this.createIndexes();
  }

  /**
   * Get singleton instance
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(db: Db): ScheduledNotificationModel {
    if (!ScheduledNotificationModel.instance) {
      ScheduledNotificationModel.instance = new ScheduledNotificationModel(db);
    }
    return ScheduledNotificationModel.instance;
  }

  /**
   * Create database indexes
   * 데이터베이스 인덱스 생성
   */
  private async createIndexes(): Promise<void> {
    try {
      // Index for finding pending notifications by scheduled time
      await this.collection.createIndex(
        { status: 1, scheduledAt: 1 },
        { name: 'idx_status_scheduledAt' },
      );

      // Index for user's scheduled notifications
      await this.collection.createIndex(
        { userId: 1, status: 1 },
        { name: 'idx_userId_status' },
      );

      // Index for concert-related notifications
      await this.collection.createIndex(
        { concertId: 1, status: 1 },
        { name: 'idx_concertId_status' },
      );

      logger.info('ScheduledNotification indexes created successfully');
    } catch (error) {
      logger.error('Error creating ScheduledNotification indexes:', error);
    }
  }

  /**
   * Create a new scheduled notification
   * 새로운 예약 알림 생성
   */
  public async create(
    notificationData: Omit<
      IScheduledNotification,
      '_id' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<IScheduledNotification> {
    const now = new Date();
    const notification: IScheduledNotification = {
      ...notificationData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(notification);
    return { ...notification, _id: result.insertedId };
  }

  /**
   * Find pending notifications that should be sent
   * 전송해야 할 대기 중인 알림 찾기
   */
  public async findPendingNotifications(
    beforeDate: Date,
    limit: number = 100,
  ): Promise<IScheduledNotification[]> {
    return this.collection
      .find({
        status: NotificationStatus.PENDING,
        scheduledAt: { $lte: beforeDate },
      })
      .limit(limit)
      .sort({ scheduledAt: 1 })
      .toArray();
  }

  /**
   * Find future pending notifications
   * 미래에 전송될 예정인 pending 알림 찾기 (복구용)
   */
  public async findFuturePendingNotifications(): Promise<
    IScheduledNotification[]
  > {
    return this.collection
      .find({
        status: NotificationStatus.PENDING,
        scheduledAt: { $gte: new Date() },
      })
      .sort({ scheduledAt: 1 })
      .toArray();
  }

  /**
   * Find stale pending notifications
   * 전송 시간이 지났는데 아직 pending인 알림 찾기 (정리용)
   */
  public async findStalePendingNotifications(
    gracePeriodMs: number = 5 * 60 * 1000,
  ): Promise<IScheduledNotification[]> {
    const cutoffDate = new Date(Date.now() - gracePeriodMs);
    return this.collection
      .find({
        status: NotificationStatus.PENDING,
        scheduledAt: { $lt: cutoffDate },
      })
      .toArray();
  }

  /**
   * Find user's scheduled notifications
   * 사용자의 예약 알림 목록 조회
   */
  public async findByUserId(
    userId: ObjectId,
    status?: NotificationStatus,
  ): Promise<IScheduledNotification[]> {
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    return this.collection.find(query).sort({ scheduledAt: -1 }).toArray();
  }

  /**
   * Find notification by ID
   * ID로 알림 찾기
   */
  public async findById(id: ObjectId): Promise<IScheduledNotification | null> {
    return this.collection.findOne({ _id: id });
  }

  /**
   * Mark notification as sent
   * 알림을 전송 완료로 표시
   */
  public async markAsSent(id: ObjectId): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id },
      {
        $set: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Mark notification as failed
   * 알림을 실패로 표시
   */
  public async markAsFailed(
    id: ObjectId,
    errorReason: string,
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id },
      {
        $set: {
          status: NotificationStatus.FAILED,
          errorReason,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Cancel a scheduled notification
   * 예약 알림 취소
   */
  public async cancel(id: ObjectId): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, status: NotificationStatus.PENDING },
      {
        $set: {
          status: NotificationStatus.CANCELLED,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Delete old notifications
   * 오래된 알림 삭제 (cleanup용)
   */
  public async deleteOldNotifications(beforeDate: Date): Promise<number> {
    const result = await this.collection.deleteMany({
      status: { $in: [NotificationStatus.SENT, NotificationStatus.FAILED] },
      updatedAt: { $lt: beforeDate },
    });

    return result.deletedCount;
  }

  /**
   * Count notifications by status
   * 상태별 알림 개수 조회
   */
  public async countByStatus(
    userId?: ObjectId,
  ): Promise<Record<string, number>> {
    const matchStage: any = {};
    if (userId) {
      matchStage.userId = userId;
    }

    const result = await this.collection
      .aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const counts: Record<string, number> = {};
    result.forEach((item) => {
      counts[item._id] = item.count;
    });

    return counts;
  }
}

/**
 * Get ScheduledNotification model instance
 * ScheduledNotification 모델 인스턴스 가져오기
 */
export const getScheduledNotificationModel = (
  db: Db,
): ScheduledNotificationModel => {
  return ScheduledNotificationModel.getInstance(db);
};
