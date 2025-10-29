import express from 'express';
import { ResponseBuilder } from '../../utils/response/apiResponse.js';
import { ScheduledNotificationService } from '../../services/notification/scheduledNotificationService.js';
import { NotificationStatus } from '../../models/notification/index.js';
import logger from '../../utils/logger/logger.js';

/**
 * Create a scheduled notification
 * 예약 알림 생성
 */
export const createScheduledNotification = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const userId = req.session?.user?.userId;

    if (!userId) {
      return ResponseBuilder.unauthorized(res, '인증이 필요합니다');
    }

    const { title, message, concertId, scheduledAt, data } = req.body;

    // Validation
    if (!title || !message || !scheduledAt) {
      return ResponseBuilder.badRequest(
        res,
        'title, message, scheduledAt 필드는 필수입니다',
      );
    }

    const result =
      await ScheduledNotificationService.createScheduledNotification({
        userId,
        concertId,
        title,
        message,
        scheduledAt,
        data,
      });

    if (result.success) {
      logger.info(
        `✅ Scheduled notification created by user ${userId}: ${result.data._id}`,
      );
      return ResponseBuilder.created(
        res,
        '예약 알림이 생성되었습니다',
        result.data,
      );
    } else {
      const statusCode = result.statusCode || 500;
      if (statusCode === 400) {
        return ResponseBuilder.badRequest(
          res,
          result.error || '예약 알림 생성 실패',
        );
      } else if (statusCode === 404) {
        return ResponseBuilder.notFound(
          res,
          result.error || '리소스를 찾을 수 없습니다',
        );
      } else {
        return ResponseBuilder.internalError(
          res,
          result.error || '예약 알림 생성 실패',
        );
      }
    }
  } catch (error: any) {
    logger.error('❌ Failed to create scheduled notification:', error);
    return ResponseBuilder.internalError(
      res,
      '예약 알림 생성 중 오류가 발생했습니다',
    );
  }
};

/**
 * Get user's scheduled notifications
 * 사용자의 예약 알림 목록 조회
 */
export const getUserScheduledNotifications = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const userId = req.session?.user?.userId;

    if (!userId) {
      return ResponseBuilder.unauthorized(res, '인증이 필요합니다');
    }

    const status = req.query.status as NotificationStatus | undefined;

    // Validate status if provided
    if (status && !Object.values(NotificationStatus).includes(status)) {
      return ResponseBuilder.badRequest(res, '유효하지 않은 상태 값입니다');
    }

    const result =
      await ScheduledNotificationService.getUserScheduledNotifications(
        userId,
        status,
      );

    if (result.success) {
      return ResponseBuilder.success(
        res,
        '예약 알림 목록 조회 성공',
        result.data,
      );
    } else {
      return ResponseBuilder.internalError(
        res,
        result.error || '예약 알림 조회 실패',
      );
    }
  } catch (error: any) {
    logger.error('❌ Failed to get scheduled notifications:', error);
    return ResponseBuilder.internalError(
      res,
      '예약 알림 조회 중 오류가 발생했습니다',
    );
  }
};

/**
 * Get scheduled notification by ID
 * ID로 예약 알림 조회
 */
export const getScheduledNotificationById = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const userId = req.session?.user?.userId;

    if (!userId) {
      return ResponseBuilder.unauthorized(res, '인증이 필요합니다');
    }

    const { id } = req.params;

    if (!id) {
      return ResponseBuilder.badRequest(res, '알림 ID가 필요합니다');
    }

    const result =
      await ScheduledNotificationService.getScheduledNotificationById(
        id,
        userId,
      );

    if (result.success) {
      return ResponseBuilder.success(res, '예약 알림 조회 성공', result.data);
    } else {
      const statusCode = result.statusCode || 500;
      if (statusCode === 404) {
        return ResponseBuilder.notFound(
          res,
          result.error || '예약 알림을 찾을 수 없습니다',
        );
      } else if (statusCode === 403) {
        return ResponseBuilder.forbidden(
          res,
          result.error || '접근 권한이 없습니다',
        );
      } else {
        return ResponseBuilder.internalError(
          res,
          result.error || '예약 알림 조회 실패',
        );
      }
    }
  } catch (error: any) {
    logger.error('❌ Failed to get scheduled notification:', error);
    return ResponseBuilder.internalError(
      res,
      '예약 알림 조회 중 오류가 발생했습니다',
    );
  }
};

/**
 * Cancel a scheduled notification
 * 예약 알림 취소
 */
export const cancelScheduledNotification = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const userId = req.session?.user?.userId;

    if (!userId) {
      return ResponseBuilder.unauthorized(res, '인증이 필요합니다');
    }

    const { id } = req.params;

    if (!id) {
      return ResponseBuilder.badRequest(res, '알림 ID가 필요합니다');
    }

    const result =
      await ScheduledNotificationService.cancelScheduledNotification(
        id,
        userId,
      );

    if (result.success) {
      logger.info(
        `✅ Scheduled notification cancelled by user ${userId}: ${id}`,
      );
      return ResponseBuilder.success(
        res,
        '예약 알림이 취소되었습니다',
        result.data,
      );
    } else {
      const statusCode = result.statusCode || 500;
      if (statusCode === 400) {
        return ResponseBuilder.badRequest(
          res,
          result.error || '취소할 수 없는 상태입니다',
        );
      } else if (statusCode === 404) {
        return ResponseBuilder.notFound(
          res,
          result.error || '예약 알림을 찾을 수 없습니다',
        );
      } else if (statusCode === 403) {
        return ResponseBuilder.forbidden(
          res,
          result.error || '접근 권한이 없습니다',
        );
      } else {
        return ResponseBuilder.internalError(
          res,
          result.error || '예약 알림 취소 실패',
        );
      }
    }
  } catch (error: any) {
    logger.error('❌ Failed to cancel scheduled notification:', error);
    return ResponseBuilder.internalError(
      res,
      '예약 알림 취소 중 오류가 발생했습니다',
    );
  }
};

/**
 * Get notification statistics
 * 알림 통계 조회
 */
export const getNotificationStats = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const userId = req.session?.user?.userId;

    if (!userId) {
      return ResponseBuilder.unauthorized(res, '인증이 필요합니다');
    }

    const result =
      await ScheduledNotificationService.getNotificationStats(userId);

    if (result.success) {
      return ResponseBuilder.success(res, '알림 통계 조회 성공', result.data);
    } else {
      return ResponseBuilder.internalError(
        res,
        result.error || '알림 통계 조회 실패',
      );
    }
  } catch (error: any) {
    logger.error('❌ Failed to get notification stats:', error);
    return ResponseBuilder.internalError(
      res,
      '알림 통계 조회 중 오류가 발생했습니다',
    );
  }
};
