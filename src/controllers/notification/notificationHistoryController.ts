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
    const options: any = {
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
 */
export const updateNotificationPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ticketOpenNotification, notifyBefore } = req.body;

    // 유효성 검사
    if (typeof ticketOpenNotification !== 'boolean') {
      res
        .status(400)
        .json({ error: 'ticketOpenNotification must be a boolean' });
      return;
    }

    if (!Array.isArray(notifyBefore)) {
      res.status(400).json({ error: 'notifyBefore must be an array' });
      return;
    }

    // notifyBefore 배열의 모든 값이 10, 30, 60 중 하나인지 확인
    const validValues = [10, 30, 60];
    const isValidNotifyBefore = notifyBefore.every((value) =>
      validValues.includes(value),
    );

    if (!isValidNotifyBefore) {
      res
        .status(400)
        .json({ error: 'notifyBefore values must be 10, 30, or 60' });
      return;
    }

    // 중복 제거
    const uniqueNotifyBefore = [...new Set(notifyBefore)];

    const database = Database.getInstance();
    const userCollection = database.getUserCollection();

    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          notificationPreference: {
            ticketOpenNotification,
            notifyBefore: uniqueNotifyBefore,
          },
          updatedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({
        success: true,
        message: 'Notification preferences updated',
        data: {
          ticketOpenNotification,
          notifyBefore: uniqueNotifyBefore,
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
 */
export const getNotificationPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

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

    // 기본값 설정
    const defaultPreference = {
      ticketOpenNotification: true,
      notifyBefore: [10, 30, 60],
    };

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
