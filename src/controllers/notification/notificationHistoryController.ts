import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import logger from '../../utils/logger/logger.js';
import { getDB } from '../../utils/database/db.js';
import { getNotificationHistoryModel } from '../../models/notification/notificationHistory.js';
import { Database } from '../../models/auth/user.js';

/**
 * Get user's notification history
 * 사용자의 알림 이력 조회
 */
export const getNotificationHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      isRead,
      page = '1',
      limit = '20',
    } = req.query as {
      isRead?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const db = getDB();
    const notificationHistoryModel = getNotificationHistoryModel(db);

    // 읽음/안읽음 필터
    const options: {
      skip: number;
      limit: number;
      isRead?: boolean;
    } = {
      skip,
      limit: limitNum,
    };

    if (isRead !== undefined) {
      options.isRead = isRead === 'true';
    }

    const notifications = await notificationHistoryModel.findByUserId(
      new ObjectId(userId),
      options,
    );

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: notifications.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
};

/**
 * Get unread notification count
 * 읽지 않은 알림 개수 조회
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const db = getDB();
    const notificationHistoryModel = getNotificationHistoryModel(db);

    const unreadCount = await notificationHistoryModel.countUnread(
      new ObjectId(userId),
    );

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

/**
 * Mark notification as read
 * 알림을 읽음으로 표시
 */
export const markNotificationAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid notification ID' });
      return;
    }

    const db = getDB();
    const notificationHistoryModel = getNotificationHistoryModel(db);

    // 알림이 해당 사용자의 것인지 확인
    const notification = await notificationHistoryModel.findById(
      new ObjectId(id),
    );

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (notification.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // 읽음으로 표시
    const success = await notificationHistoryModel.markAsRead(new ObjectId(id));

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } else {
      res.status(400).json({ error: 'Notification already read' });
    }
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all notifications as read
 * 모든 알림을 읽음으로 표시
 */
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const db = getDB();
    const notificationHistoryModel = getNotificationHistoryModel(db);

    const modifiedCount = await notificationHistoryModel.markAllAsRead(
      new ObjectId(userId),
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount,
      },
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

/**
 * Update notification preferences
 * 알림 설정 업데이트
 *
 * 사용자의 알림 수신 설정을 업데이트합니다.
 *
 * @description
 * 알림 설정 구조:
 * - ticketOpenNotification: 티켓 오픈 알림을 받을 시간(분 단위) 배열
 *   - 가능한 값: 10, 30, 60, 1440 (10분, 30분, 1시간, 1일 전)
 *   - 빈 배열([])인 경우: 티켓 오픈 알림을 받지 않음
 *
 * - concertStartNotification: 공연 시작 알림을 받을 시간(분 단위) 배열
 *   - 가능한 값: 60, 180, 1440 (1시간, 3시간, 1일 전)
 *   - 빈 배열([])인 경우: 공연 시작 알림을 받지 않음
 *
 * @example
 * // 모든 알림 활성화
 * { ticketOpenNotification: [10, 30, 60, 1440], concertStartNotification: [60, 180, 1440] }
 *
 * // 티켓 오픈 알림만 활성화 (1일 전에만)
 * { ticketOpenNotification: [1440], concertStartNotification: [] }
 *
 * // 모든 알림 비활성화
 * { ticketOpenNotification: [], concertStartNotification: [] }
 */
export const updateNotificationPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. 인증 확인
    const userId = req.session?.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ticketOpenNotification, concertStartNotification } = req.body;

    // 2. 타입 유효성 검사 - 배열인지 확인
    if (!Array.isArray(ticketOpenNotification)) {
      res
        .status(400)
        .json({ error: 'ticketOpenNotification must be an array' });
      return;
    }

    if (!Array.isArray(concertStartNotification)) {
      res
        .status(400)
        .json({ error: 'concertStartNotification must be an array' });
      return;
    }

    // 3. 티켓 오픈 알림 시간 유효성 검사
    // 허용된 값: 10분, 30분, 1시간(60분), 1일(1440분) 전
    const validTicketValues = [10, 30, 60, 1440];
    const isValidTicketNotification = ticketOpenNotification.every(
      (value: number) => validTicketValues.includes(value),
    );

    if (!isValidTicketNotification) {
      res.status(400).json({
        error: 'ticketOpenNotification values must be 10, 30, 60, or 1440',
      });
      return;
    }

    // 4. 공연 시작 알림 시간 유효성 검사
    // 허용된 값: 1시간(60분), 3시간(180분), 1일(1440분) 전
    const validConcertValues = [60, 180, 1440];
    const isValidConcertNotification = concertStartNotification.every(
      (value: number) => validConcertValues.includes(value),
    );

    if (!isValidConcertNotification) {
      res.status(400).json({
        error: 'concertStartNotification values must be 60, 180, or 1440',
      });
      return;
    }

    // 5. 중복 제거
    // 사용자가 같은 시간을 중복으로 선택한 경우 중복 제거
    // 예: [10, 30, 10, 60] -> [10, 30, 60]
    const uniqueTicketNotification: number[] = [
      ...new Set(ticketOpenNotification),
    ];
    const uniqueConcertNotification: number[] = [
      ...new Set(concertStartNotification),
    ];

    // 6. 데이터베이스 업데이트 (userService 사용하여 캐시 자동 삭제)
    const { UserService } = await import('../../services/auth/userService');
    const userService = new UserService();

    const updatedUser = await userService.updateUser(userId, {
      notificationPreference: {
        ticketOpenNotification: uniqueTicketNotification,
        concertStartNotification: uniqueConcertNotification,
      },
      updatedAt: new Date(),
    });

    // 7. 응답 처리
    if (updatedUser) {
      logger.info(
        `[Notification] Updated preferences for user: ${userId}, cache invalidated`,
      );
      res.status(200).json({
        success: true,
        message: 'Notification preferences updated',
        data: {
          ticketOpenNotification: uniqueTicketNotification,
          concertStartNotification: uniqueConcertNotification,
        },
      });
    } else {
      res.status(400).json({ error: 'Failed to update preferences' });
    }
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    res
      .status(500)
      .json({ error: 'Failed to update notification preferences' });
  }
};

/**
 * Get notification preferences
 * 알림 설정 조회
 *
 * 사용자의 현재 알림 수신 설정을 조회합니다.
 *
 * @description
 * 사용자의 notificationPreference가 없는 경우 기본값을 반환합니다.
 *
 * 기본값:
 * - ticketOpenNotification: [10, 30, 60, 1440]
 *   (티켓 오픈 10분, 30분, 1시간, 1일 전에 모두 알림)
 * - concertStartNotification: [60, 180, 1440]
 *   (공연 시작 1시간, 3시간, 1일 전에 모두 알림)
 *
 * @returns
 * {
 *   success: true,
 *   data: {
 *     ticketOpenNotification: number[],
 *     concertStartNotification: number[]
 *   }
 * }
 */
export const getNotificationPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. 인증 확인
    const userId = req.session?.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 2. 사용자 조회 (notificationPreference 필드만)
    const database = Database.getInstance();
    const userCollection = database.getUserCollection();

    const user = await userCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { notificationPreference: 1 } },
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // 3. 기본값 설정
    // 사용자의 notificationPreference가 없는 경우(신규 사용자 또는 마이그레이션 전 사용자)
    // 모든 알림을 활성화한 상태로 기본값 반환
    const defaultPreference = {
      ticketOpenNotification: [10, 30, 60, 1440], // 모든 시간대 활성화
      concertStartNotification: [60, 180, 1440], // 모든 시간대 활성화
    };

    // 4. 응답 반환
    res.status(200).json({
      success: true,
      data: user.notificationPreference || defaultPreference,
    });
  } catch (error) {
    logger.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
};

/**
 * Delete notification history
 * 알림 히스토리 삭제
 */
export const deleteNotificationHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid notification ID' });
      return;
    }

    const db = getDB();
    const notificationHistoryModel = getNotificationHistoryModel(db);

    // 알림이 해당 사용자의 것인지 확인
    const notification = await notificationHistoryModel.findById(
      new ObjectId(id),
    );

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (notification.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // 알림 삭제
    const success = await notificationHistoryModel.deleteById(new ObjectId(id));

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } else {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
