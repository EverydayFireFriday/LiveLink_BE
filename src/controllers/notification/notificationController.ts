import express from 'express';
import { ResponseBuilder } from '../../utils/response/apiResponse.js';
import { ScheduledNotificationService } from '../../services/notification/scheduledNotificationService.js';
import { NotificationStatus } from '../../models/notification/index.js';
import logger from '../../utils/logger/logger.js';
import { ErrorCodes } from '../../utils/errors/errorCodes.js';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../../utils/errors/customErrors.js';

/**
 * Create a scheduled notification
 * 예약 알림 생성
 */
export const createScheduledNotification = async (
  req: express.Request,
  res: express.Response,
) => {
  const userId = req.session?.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('인증이 필요합니다', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { title, message, concertId, scheduledAt, data } = req.body;

    // Validation
    if (!title || !message || !scheduledAt) {
      throw new BadRequestError(
        'title, message, scheduledAt 필드는 필수입니다',
        ErrorCodes.VAL_MISSING_FIELD,
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

    if (result.success && result.data) {
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
        throw new BadRequestError(
          result.error || '예약 알림 생성 실패',
          ErrorCodes.NOTIF_SEND_FAILED,
        );
      } else if (statusCode === 404) {
        throw new NotFoundError(
          result.error || '리소스를 찾을 수 없습니다',
          ErrorCodes.CONCERT_NOT_FOUND,
        );
      }
      throw new InternalServerError(
        result.error || '예약 알림 생성 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ Failed to create scheduled notification:', error);
    throw new InternalServerError(
      '예약 알림 생성 중 오류가 발생했습니다',
      ErrorCodes.NOTIF_SEND_FAILED,
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
  const userId = req.session?.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('인증이 필요합니다', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const status = req.query.status as NotificationStatus | undefined;

    // Validate status if provided
    if (status && !Object.values(NotificationStatus).includes(status)) {
      throw new BadRequestError(
        '유효하지 않은 상태 값입니다',
        ErrorCodes.VAL_INVALID_INPUT,
      );
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
      throw new InternalServerError(
        result.error || '예약 알림 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ Failed to get scheduled notifications:', error);
    throw new InternalServerError(
      '예약 알림 조회 중 오류가 발생했습니다',
      ErrorCodes.SYS_INTERNAL_ERROR,
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
  const userId = req.session?.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('인증이 필요합니다', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError(
        '알림 ID가 필요합니다',
        ErrorCodes.VAL_MISSING_FIELD,
      );
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
        throw new NotFoundError(
          result.error || '예약 알림을 찾을 수 없습니다',
          ErrorCodes.NOTIF_NOT_FOUND,
        );
      } else if (statusCode === 403) {
        throw new BadRequestError(
          result.error || '접근 권한이 없습니다',
          ErrorCodes.AUTH_FORBIDDEN,
        );
      }
      throw new InternalServerError(
        result.error || '예약 알림 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ Failed to get scheduled notification:', error);
    throw new InternalServerError(
      '예약 알림 조회 중 오류가 발생했습니다',
      ErrorCodes.SYS_INTERNAL_ERROR,
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
  const userId = req.session?.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('인증이 필요합니다', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError(
        '알림 ID가 필요합니다',
        ErrorCodes.VAL_MISSING_FIELD,
      );
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
        throw new BadRequestError(
          result.error || '취소할 수 없는 상태입니다',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      } else if (statusCode === 404) {
        throw new NotFoundError(
          result.error || '예약 알림을 찾을 수 없습니다',
          ErrorCodes.NOTIF_NOT_FOUND,
        );
      } else if (statusCode === 403) {
        throw new BadRequestError(
          result.error || '접근 권한이 없습니다',
          ErrorCodes.AUTH_FORBIDDEN,
        );
      }
      throw new InternalServerError(
        result.error || '예약 알림 취소 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ Failed to cancel scheduled notification:', error);
    throw new InternalServerError(
      '예약 알림 취소 중 오류가 발생했습니다',
      ErrorCodes.SYS_INTERNAL_ERROR,
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
  const userId = req.session?.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('인증이 필요합니다', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const result =
      await ScheduledNotificationService.getNotificationStats(userId);

    if (result.success) {
      return ResponseBuilder.success(res, '알림 통계 조회 성공', result.data);
    } else {
      throw new InternalServerError(
        result.error || '알림 통계 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ Failed to get notification stats:', error);
    throw new InternalServerError(
      '알림 통계 조회 중 오류가 발생했습니다',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Bulk create scheduled notifications
 * 예약 알림 일괄 생성
 */
export const bulkCreateScheduledNotifications = async (
  req: express.Request,
  res: express.Response,
) => {
  const userId = req.session?.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('인증이 필요합니다', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { notifications } = req.body;

    // Validation
    if (
      !notifications ||
      !Array.isArray(notifications) ||
      notifications.length === 0
    ) {
      throw new BadRequestError(
        'notifications 배열이 필요합니다',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    // Add userId to each notification
    const notificationsWithUserId = notifications.map((notification) => ({
      ...notification,
      userId,
    }));

    const result =
      await ScheduledNotificationService.bulkCreateScheduledNotifications(
        notificationsWithUserId,
      );

    if (result.success && result.data) {
      logger.info(
        `✅ Bulk notifications created by user ${userId}: ${result.data.summary.succeeded}/${result.data.summary.total}`,
      );
      return ResponseBuilder.created(
        res,
        '예약 알림 일괄 생성이 완료되었습니다',
        result.data,
      );
    } else {
      const statusCode = result.statusCode || 500;
      if (statusCode === 400) {
        throw new BadRequestError(
          result.error || '예약 알림 일괄 생성 실패',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }
      throw new InternalServerError(
        result.error || '예약 알림 일괄 생성 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ Failed to bulk create scheduled notifications:', error);
    throw new InternalServerError(
      '예약 알림 일괄 생성 중 오류가 발생했습니다',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Bulk cancel scheduled notifications
 * 예약 알림 일괄 취소
 */
export const bulkCancelScheduledNotifications = async (
  req: express.Request,
  res: express.Response,
) => {
  const userId = req.session?.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('인증이 필요합니다', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { notificationIds } = req.body;

    // Validation
    if (
      !notificationIds ||
      !Array.isArray(notificationIds) ||
      notificationIds.length === 0
    ) {
      throw new BadRequestError(
        'notificationIds 배열이 필요합니다',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    const result =
      await ScheduledNotificationService.bulkCancelScheduledNotifications(
        notificationIds,
        userId,
      );

    if (result.success && result.data) {
      logger.info(
        `✅ Bulk notifications cancelled by user ${userId}: ${result.data.summary.succeeded}/${result.data.summary.total}`,
      );
      return ResponseBuilder.success(
        res,
        '예약 알림 일괄 취소가 완료되었습니다',
        result.data,
      );
    } else {
      const statusCode = result.statusCode || 500;
      if (statusCode === 400) {
        throw new BadRequestError(
          result.error || '예약 알림 일괄 취소 실패',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }
      throw new InternalServerError(
        result.error || '예약 알림 일괄 취소 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ Failed to bulk cancel scheduled notifications:', error);
    throw new InternalServerError(
      '예약 알림 일괄 취소 중 오류가 발생했습니다',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};
