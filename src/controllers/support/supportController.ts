import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import logger from '../../utils/logger/logger.js';
import { supportService } from '../../services/support/supportService.js';
import { supportNotificationService } from '../../services/support/supportNotificationService.js';
import {
  SupportCategory,
  InquiryStatus,
  Priority,
} from '../../types/support/supportEnums.js';
import { ErrorCodes } from '../../utils/errors/errorCodes.js';
import {
  AppError,
  UnauthorizedError,
  BadRequestError,
  InternalServerError,
} from '../../utils/errors/customErrors.js';

/**
 * Create a new support inquiry
 * 새로운 지원 문의 생성
 * POST /api/support
 */
export const createInquiry = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.session?.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { category, subject, content, priority, attachments } = req.body as {
      category?: string;
      subject?: string;
      content?: string;
      priority?: string;
      attachments?: string[];
    };

    // Validate required fields
    if (!category || !subject || !content) {
      throw new BadRequestError(
        'Category, subject, and content are required',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    // Validate category
    if (!Object.values(SupportCategory).includes(category as SupportCategory)) {
      throw new BadRequestError(
        'Invalid category',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    // Validate priority if provided
    if (priority && !Object.values(Priority).includes(priority as Priority)) {
      throw new BadRequestError(
        'Invalid priority',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    const inquiry = await supportService.createInquiry({
      userId: new ObjectId(userId),
      category: category as SupportCategory,
      subject,
      content,
      priority: priority as Priority | undefined,
      attachments,
    });

    res.status(201).json({
      success: true,
      data: inquiry,
      message: '문의가 성공적으로 등록되었습니다.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error creating inquiry:', error);
    throw new InternalServerError(
      'Failed to create inquiry',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Get inquiry by ID
 * 문의 상세 조회
 * GET /api/support/:id
 */
export const getInquiryById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.session?.user?.userId;
  const userEmail = req.session?.user?.email;

  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      throw new BadRequestError(
        'Invalid inquiry ID',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    // Check if user is admin using email
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase());
    const isAdmin = userEmail
      ? adminEmails.includes(userEmail.toLowerCase())
      : false;

    const inquiry = await supportService.getInquiryById(
      new ObjectId(id),
      new ObjectId(userId),
      isAdmin,
    );

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error fetching inquiry:', error);
    throw new InternalServerError(
      'Failed to fetch inquiry',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Get user's own inquiries
 * 사용자 본인의 문의 목록 조회
 * GET /api/support
 */
export const getUserInquiries = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.session?.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const {
      status,
      page = '1',
      limit = '20',
    } = req.query as {
      status?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Validate status if provided
    if (
      status &&
      !Object.values(InquiryStatus).includes(status as InquiryStatus)
    ) {
      throw new BadRequestError('Invalid status', ErrorCodes.VAL_INVALID_INPUT);
    }

    // Regular user can only see their own inquiries
    const result = await supportService.getUserInquiries(new ObjectId(userId), {
      status: status as InquiryStatus | undefined,
      page: pageNum,
      limit: limitNum,
    });

    res.status(200).json({
      success: true,
      data: result.inquiries,
      pagination: {
        page: result.page,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error fetching user inquiries:', error);
    throw new InternalServerError(
      'Failed to fetch inquiries',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Get all inquiries (Admin only)
 * 전체 문의 목록 조회 (관리자 전용)
 * GET /api/support/admin
 */
export const getAdminInquiries = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Admin check is handled by requireAdmin middleware

  try {
    const {
      status,
      category,
      priority,
      page = '1',
      limit = '20',
    } = req.query as {
      status?: string;
      category?: string;
      priority?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Validate enums if provided
    if (
      status &&
      !Object.values(InquiryStatus).includes(status as InquiryStatus)
    ) {
      throw new BadRequestError('Invalid status', ErrorCodes.VAL_INVALID_INPUT);
    }

    if (
      category &&
      !Object.values(SupportCategory).includes(category as SupportCategory)
    ) {
      throw new BadRequestError(
        'Invalid category',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    if (priority && !Object.values(Priority).includes(priority as Priority)) {
      throw new BadRequestError(
        'Invalid priority',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    // Admin can see all inquiries with full filtering
    const result = await supportService.getAllInquiries({
      status: status as InquiryStatus | undefined,
      category: category as SupportCategory | undefined,
      priority: priority as Priority | undefined,
      page: pageNum,
      limit: limitNum,
    });

    res.status(200).json({
      success: true,
      data: result.inquiries,
      pagination: {
        page: result.page,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error fetching admin inquiries:', error);
    throw new InternalServerError(
      'Failed to fetch inquiries',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Update inquiry status (Admin only)
 * 문의 상태 변경 (관리자 전용)
 * PATCH /api/support/:id/status
 */
export const updateInquiryStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Admin check is handled by requireAdmin middleware

  try {
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!ObjectId.isValid(id)) {
      throw new BadRequestError(
        'Invalid inquiry ID',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    if (
      !status ||
      !Object.values(InquiryStatus).includes(status as InquiryStatus)
    ) {
      throw new BadRequestError('Invalid status', ErrorCodes.VAL_INVALID_INPUT);
    }

    const updatedInquiry = await supportService.updateInquiryStatus(
      new ObjectId(id),
      status as InquiryStatus,
    );

    res.status(200).json({
      success: true,
      data: updatedInquiry,
      message: '문의 상태가 변경되었습니다.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating inquiry status:', error);
    throw new InternalServerError(
      'Failed to update inquiry status',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Update inquiry priority (Admin only)
 * 문의 우선순위 변경 (관리자 전용)
 * PATCH /api/support/:id/priority
 */
export const updateInquiryPriority = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Admin check is handled by requireAdmin middleware

  try {
    const { id } = req.params;
    const { priority } = req.body as { priority?: string };

    if (!ObjectId.isValid(id)) {
      throw new BadRequestError(
        'Invalid inquiry ID',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    if (!priority || !Object.values(Priority).includes(priority as Priority)) {
      throw new BadRequestError(
        'Invalid priority',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    const updatedInquiry = await supportService.updateInquiryPriority(
      new ObjectId(id),
      priority as Priority,
    );

    res.status(200).json({
      success: true,
      data: updatedInquiry,
      message: '문의 우선순위가 변경되었습니다.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating inquiry priority:', error);
    throw new InternalServerError(
      'Failed to update inquiry priority',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Add admin response to inquiry (Admin only)
 * 관리자 답변 작성 (관리자 전용)
 * POST /api/support/:id/response
 */
export const addAdminResponse = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.session?.user?.userId;

  // Admin check is handled by requireAdmin middleware
  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { id } = req.params;
    const { content } = req.body as { content?: string };

    if (!ObjectId.isValid(id)) {
      throw new BadRequestError(
        'Invalid inquiry ID',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    if (!content) {
      throw new BadRequestError(
        'Response content is required',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    const updatedInquiry = await supportService.addAdminResponse(
      new ObjectId(id),
      new ObjectId(userId),
      content,
    );

    // Send FCM notification to user
    try {
      await supportNotificationService.sendResponseNotification(updatedInquiry);
    } catch (notificationError) {
      // Log notification error but don't fail the response
      logger.error('Failed to send notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      data: updatedInquiry,
      message: '답변이 성공적으로 등록되었습니다.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error adding admin response:', error);
    throw new InternalServerError(
      'Failed to add admin response',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Delete inquiry
 * 문의 삭제
 * DELETE /api/support/:id
 */
export const deleteInquiry = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.session?.user?.userId;
  const userEmail = req.session?.user?.email;

  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      throw new BadRequestError(
        'Invalid inquiry ID',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    // Check if user is admin using email
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase());
    const isAdmin = userEmail
      ? adminEmails.includes(userEmail.toLowerCase())
      : false;

    await supportService.deleteInquiry(
      new ObjectId(id),
      new ObjectId(userId),
      isAdmin,
    );

    res.status(200).json({
      success: true,
      message: '문의가 삭제되었습니다.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error deleting inquiry:', error);
    throw new InternalServerError(
      'Failed to delete inquiry',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * Get user's inquiry statistics
 * 사용자 본인의 문의 통계 조회
 * GET /api/support/stats
 */
export const getUserInquiryStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.session?.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('Unauthorized', ErrorCodes.AUTH_UNAUTHORIZED);
  }

  try {
    const stats = await supportService.getUserInquiryStats(
      new ObjectId(userId),
    );

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error fetching user inquiry stats:', error);
    throw new InternalServerError(
      'Failed to fetch inquiry stats',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};
