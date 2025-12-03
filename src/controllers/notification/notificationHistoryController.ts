import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import logger from '../../utils/logger/logger.js';
import { getDB } from '../../utils/database/db.js';
import { getNotificationHistoryModel } from '../../models/notification/notificationHistory.js';
import { Database } from '../../models/auth/user.js';
import { ErrorCodes } from '../../utils/errors/errorCodes.js';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from '../../utils/errors/customErrors.js';

/**
 * Get user's notification history
 * 사용자의 알림 이력 조회
 */
export const getNotificationHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.session?.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
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
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error fetching notification history:', error);
    throw new InternalServerError(
      'Failed to fetch notification history',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
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
  const userId = req.session?.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
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
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error fetching unread count:', error);
    throw new InternalServerError(
      'Failed to fetch unread count',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
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
  const userId = req.session?.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      throw new BadRequestError(
        'Invalid notification ID',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    const db = getDB();
    const notificationHistoryModel = getNotificationHistoryModel(db);

    // 알림이 해당 사용자의 것인지 확인
    const notification = await notificationHistoryModel.findById(
      new ObjectId(id),
    );

    if (!notification) {
      throw new NotFoundError(
        'Notification not found',
        ErrorCodes.NOTIF_NOT_FOUND,
      );
    }

    if (notification.userId.toString() !== userId) {
      throw new ForbiddenError('Forbidden', ErrorCodes.AUTH_FORBIDDEN);
    }

    // 읽음으로 표시
    const success = await notificationHistoryModel.markAsRead(new ObjectId(id));

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } else {
      throw new BadRequestError(
        'Notification already read',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error marking notification as read:', error);
    throw new InternalServerError(
      'Failed to mark notification as read',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
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
  const userId = req.session?.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
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
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error marking all notifications as read:', error);
    throw new InternalServerError(
      'Failed to mark all notifications as read',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Update notification preferences
 * 알림 설정 업데이트
 */
export const updateNotificationPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.session?.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { ticketOpenNotification, concertStartNotification } = req.body;

    // 2. 타입 유효성 검사 - 배열인지 확인
    if (!Array.isArray(ticketOpenNotification)) {
      throw new BadRequestError(
        'ticketOpenNotification must be an array',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    if (!Array.isArray(concertStartNotification)) {
      throw new BadRequestError(
        'concertStartNotification must be an array',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    // 3. 티켓 오픈 알림 시간 유효성 검사
    const validTicketValues = [10, 30, 60, 1440];
    const isValidTicketNotification = ticketOpenNotification.every(
      (value: number) => validTicketValues.includes(value),
    );

    if (!isValidTicketNotification) {
      throw new BadRequestError(
        'ticketOpenNotification values must be 10, 30, 60, or 1440',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    // 4. 공연 시작 알림 시간 유효성 검사
    const validConcertValues = [60, 180, 1440];
    const isValidConcertNotification = concertStartNotification.every(
      (value: number) => validConcertValues.includes(value),
    );

    if (!isValidConcertNotification) {
      throw new BadRequestError(
        'concertStartNotification values must be 60, 180, or 1440',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    // 5. 중복 제거
    const uniqueTicketNotification: number[] = [
      ...new Set(ticketOpenNotification),
    ];
    const uniqueConcertNotification: number[] = [
      ...new Set(concertStartNotification),
    ];

    // 6. 데이터베이스 업데이트
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
      throw new BadRequestError(
        'Failed to update preferences',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating notification preferences:', error);
    throw new InternalServerError(
      'Failed to update notification preferences',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Get notification preferences
 * 알림 설정 조회
 */
export const getNotificationPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.session?.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    // 2. 사용자 조회 (notificationPreference 필드만)
    const database = Database.getInstance();
    const userCollection = database.getUserCollection();

    const user = await userCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { notificationPreference: 1 } },
    );

    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.USER_NOT_FOUND);
    }

    // 3. 기본값 설정
    const defaultPreference = {
      ticketOpenNotification: [10, 30, 60, 1440],
      concertStartNotification: [60, 180, 1440],
    };

    // 4. 응답 반환
    res.status(200).json({
      success: true,
      data: user.notificationPreference || defaultPreference,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error fetching notification preferences:', error);
    throw new InternalServerError(
      'Failed to fetch notification preferences',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
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
  const userId = req.session?.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      throw new BadRequestError(
        'Invalid notification ID',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    const db = getDB();
    const notificationHistoryModel = getNotificationHistoryModel(db);

    // 알림이 해당 사용자의 것인지 확인
    const notification = await notificationHistoryModel.findById(
      new ObjectId(id),
    );

    if (!notification) {
      throw new NotFoundError(
        'Notification not found',
        ErrorCodes.NOTIF_NOT_FOUND,
      );
    }

    if (notification.userId.toString() !== userId) {
      throw new ForbiddenError('Forbidden', ErrorCodes.AUTH_FORBIDDEN);
    }

    // 알림 삭제
    const success = await notificationHistoryModel.deleteById(new ObjectId(id));

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } else {
      throw new InternalServerError(
        'Failed to delete notification',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error deleting notification:', error);
    throw new InternalServerError(
      'Failed to delete notification',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};
