import { ObjectId } from 'mongodb';
import { getDB } from '../../utils/database/db.js';
import {
  getSupportInquiryModel,
  ISupportInquiry,
  IAdminResponse,
} from '../../models/support/supportInquiry.js';
import {
  SupportCategory,
  InquiryStatus,
  Priority,
} from '../../support/supportEnums.js';
import logger from '../../utils/logger/logger.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from '../../utils/errors/customErrors.js';
import { ErrorCodes } from '../../utils/errors/errorCodes.js';

/**
 * Create Inquiry Data Interface
 * 문의 생성 데이터 인터페이스
 */
export interface CreateInquiryData {
  userId: ObjectId;
  category: SupportCategory;
  subject: string;
  content: string;
  priority?: Priority;
  attachments?: string[];
}

/**
 * Support Service Class
 * 지원 서비스 클래스
 */
export class SupportService {
  /**
   * Create a new support inquiry
   * 새로운 지원 문의 생성
   */
  async createInquiry(data: CreateInquiryData): Promise<ISupportInquiry> {
    try {
      const db = getDB();
      const supportInquiryModel = getSupportInquiryModel(db);

      // Validate input
      if (!data.subject || data.subject.trim().length === 0) {
        throw new BadRequestError(
          '문의 제목을 입력해주세요.',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }

      if (!data.content || data.content.trim().length === 0) {
        throw new BadRequestError(
          '문의 내용을 입력해주세요.',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }

      if (data.subject.length > 200) {
        throw new BadRequestError(
          '문의 제목은 200자를 초과할 수 없습니다.',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }

      if (data.content.length > 5000) {
        throw new BadRequestError(
          '문의 내용은 5000자를 초과할 수 없습니다.',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }

      const inquiry = await supportInquiryModel.create({
        userId: data.userId,
        category: data.category,
        subject: data.subject.trim(),
        content: data.content.trim(),
        priority: data.priority,
        attachments: data.attachments,
      });

      logger.info(
        `Support inquiry created: ${inquiry._id?.toString() || 'unknown'}`,
      );
      return inquiry;
    } catch (error) {
      logger.error('Error creating support inquiry:', error);
      throw error;
    }
  }

  /**
   * Get inquiry by ID
   * ID로 문의 조회
   */
  async getInquiryById(
    inquiryId: ObjectId,
    userId?: ObjectId,
    isAdmin?: boolean,
  ): Promise<ISupportInquiry> {
    try {
      const db = getDB();
      const supportInquiryModel = getSupportInquiryModel(db);

      const inquiry = await supportInquiryModel.findById(inquiryId);

      if (!inquiry) {
        throw new NotFoundError(
          undefined,
          ErrorCodes.SUPPORT_INQUIRY_NOT_FOUND,
        );
      }

      // Check authorization: only owner or admin can view
      if (
        userId &&
        !isAdmin &&
        inquiry.userId.toString() !== userId.toString()
      ) {
        throw new ForbiddenError(
          '이 문의를 조회할 권한이 없습니다.',
          ErrorCodes.AUTH_FORBIDDEN,
        );
      }

      return inquiry;
    } catch (error) {
      logger.error('Error getting inquiry by ID:', error);
      throw error;
    }
  }

  /**
   * Get user's inquiries with pagination
   * 사용자별 문의 목록 조회 (페이지네이션)
   */
  async getUserInquiries(
    userId: ObjectId,
    options?: {
      status?: InquiryStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<{ inquiries: ISupportInquiry[]; total: number; page: number }> {
    try {
      const db = getDB();
      const supportInquiryModel = getSupportInquiryModel(db);

      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

      const [inquiries, total] = await Promise.all([
        supportInquiryModel.findByUserId(userId, {
          status: options?.status,
          skip,
          limit,
        }),
        supportInquiryModel.countByUserId(userId),
      ]);

      return {
        inquiries,
        total,
        page,
      };
    } catch (error) {
      logger.error('Error getting user inquiries:', error);
      throw error;
    }
  }

  /**
   * Get all inquiries (Admin only)
   * 전체 문의 목록 조회 (관리자 전용, 페이지네이션)
   */
  async getAllInquiries(options?: {
    status?: InquiryStatus;
    category?: SupportCategory;
    priority?: Priority;
    page?: number;
    limit?: number;
  }): Promise<{ inquiries: ISupportInquiry[]; total: number; page: number }> {
    try {
      const db = getDB();
      const supportInquiryModel = getSupportInquiryModel(db);

      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

      const [inquiries, total] = await Promise.all([
        supportInquiryModel.findAll({
          status: options?.status,
          category: options?.category,
          priority: options?.priority,
          skip,
          limit,
        }),
        supportInquiryModel.countAll({
          status: options?.status,
          category: options?.category,
          priority: options?.priority,
        }),
      ]);

      return {
        inquiries,
        total,
        page,
      };
    } catch (error) {
      logger.error('Error getting all inquiries:', error);
      throw error;
    }
  }

  /**
   * Update inquiry status
   * 문의 상태 변경
   */
  async updateInquiryStatus(
    inquiryId: ObjectId,
    status: InquiryStatus,
  ): Promise<ISupportInquiry> {
    try {
      const db = getDB();
      const supportInquiryModel = getSupportInquiryModel(db);

      const success = await supportInquiryModel.updateStatus(inquiryId, status);

      if (!success) {
        throw new NotFoundError(
          undefined,
          ErrorCodes.SUPPORT_INQUIRY_NOT_FOUND,
        );
      }

      const updatedInquiry = await supportInquiryModel.findById(inquiryId);

      if (!updatedInquiry) {
        throw new NotFoundError(
          undefined,
          ErrorCodes.SUPPORT_INQUIRY_NOT_FOUND,
        );
      }

      logger.info(
        `Inquiry status updated: ${inquiryId.toString()} -> ${status}`,
      );
      return updatedInquiry;
    } catch (error) {
      logger.error('Error updating inquiry status:', error);
      throw error;
    }
  }

  /**
   * Update inquiry priority
   * 문의 우선순위 변경
   */
  async updateInquiryPriority(
    inquiryId: ObjectId,
    priority: Priority,
  ): Promise<ISupportInquiry> {
    try {
      const db = getDB();
      const supportInquiryModel = getSupportInquiryModel(db);

      const success = await supportInquiryModel.updatePriority(
        inquiryId,
        priority,
      );

      if (!success) {
        throw new NotFoundError(
          undefined,
          ErrorCodes.SUPPORT_INQUIRY_NOT_FOUND,
        );
      }

      const updatedInquiry = await supportInquiryModel.findById(inquiryId);

      if (!updatedInquiry) {
        throw new NotFoundError(
          undefined,
          ErrorCodes.SUPPORT_INQUIRY_NOT_FOUND,
        );
      }

      logger.info(
        `Inquiry priority updated: ${inquiryId.toString()} -> ${priority}`,
      );
      return updatedInquiry;
    } catch (error) {
      logger.error('Error updating inquiry priority:', error);
      throw error;
    }
  }

  /**
   * Add admin response to inquiry
   * 관리자 답변 추가
   * Note: FCM notification will be sent by the controller layer
   */
  async addAdminResponse(
    inquiryId: ObjectId,
    responderId: ObjectId,
    content: string,
  ): Promise<ISupportInquiry> {
    try {
      const db = getDB();
      const supportInquiryModel = getSupportInquiryModel(db);

      // Validate input
      if (!content || content.trim().length === 0) {
        throw new BadRequestError(
          '답변 내용을 입력해주세요.',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }

      if (content.length > 5000) {
        throw new BadRequestError(
          '답변 내용은 5000자를 초과할 수 없습니다.',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }

      // Check if inquiry exists
      const inquiry = await supportInquiryModel.findById(inquiryId);
      if (!inquiry) {
        throw new NotFoundError(
          undefined,
          ErrorCodes.SUPPORT_INQUIRY_NOT_FOUND,
        );
      }

      // Check if already answered
      if (inquiry.adminResponse) {
        throw new ConflictError(undefined, ErrorCodes.SUPPORT_ALREADY_ANSWERED);
      }

      const adminResponse: IAdminResponse = {
        responderId,
        content: content.trim(),
        respondedAt: new Date(),
      };

      const success = await supportInquiryModel.addAdminResponse(
        inquiryId,
        adminResponse,
      );

      if (!success) {
        throw new NotFoundError(undefined, ErrorCodes.SUPPORT_UPDATE_FAILED);
      }

      const updatedInquiry = await supportInquiryModel.findById(inquiryId);

      if (!updatedInquiry) {
        throw new NotFoundError(
          undefined,
          ErrorCodes.SUPPORT_INQUIRY_NOT_FOUND,
        );
      }

      logger.info(`Admin response added to inquiry: ${inquiryId.toString()}`);
      return updatedInquiry;
    } catch (error) {
      logger.error('Error adding admin response:', error);
      throw error;
    }
  }

  /**
   * Delete inquiry (soft delete)
   * 문의 삭제 (소프트 삭제)
   */
  async deleteInquiry(
    inquiryId: ObjectId,
    userId?: ObjectId,
    isAdmin?: boolean,
  ): Promise<void> {
    try {
      const db = getDB();
      const supportInquiryModel = getSupportInquiryModel(db);

      // Check if inquiry exists
      const inquiry = await supportInquiryModel.findById(inquiryId);
      if (!inquiry) {
        throw new NotFoundError(
          undefined,
          ErrorCodes.SUPPORT_INQUIRY_NOT_FOUND,
        );
      }

      // Check authorization: only owner or admin can delete
      if (
        userId &&
        !isAdmin &&
        inquiry.userId.toString() !== userId.toString()
      ) {
        throw new ForbiddenError(
          '이 문의를 삭제할 권한이 없습니다.',
          ErrorCodes.AUTH_FORBIDDEN,
        );
      }

      const success = await supportInquiryModel.softDelete(inquiryId);

      if (!success) {
        throw new NotFoundError(undefined, ErrorCodes.SUPPORT_DELETE_FAILED);
      }

      logger.info(`Inquiry deleted: ${inquiryId.toString()}`);
    } catch (error) {
      logger.error('Error deleting inquiry:', error);
      throw error;
    }
  }
}

export const supportService = new SupportService();
