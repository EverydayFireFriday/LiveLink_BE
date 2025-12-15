import { Db, ObjectId, Collection } from 'mongodb';
import logger from '../../utils/logger/logger.js';
import {
  SupportCategory,
  InquiryStatus,
  Priority,
} from '../../types/support/supportEnums.js';

/**
 * Admin Response Interface
 * 관리자 답변 인터페이스
 */
export interface IAdminResponse {
  responderId: ObjectId; // 답변한 관리자 ID
  content: string; // 답변 내용
  respondedAt: Date; // 답변 시간
}

/**
 * Support Inquiry Interface
 * 지원 문의 인터페이스
 */
export interface ISupportInquiry {
  _id?: ObjectId;
  userId: ObjectId; // 문의한 사용자 ID
  category: SupportCategory; // 문의 카테고리
  subject: string; // 문의 제목
  content: string; // 문의 내용
  status: InquiryStatus; // 문의 상태
  priority: Priority; // 우선순위
  adminResponse?: IAdminResponse; // 관리자 답변 (optional)
  attachments?: string[]; // 첨부파일 URL 목록 (optional)
  isDeleted: boolean; // 소프트 삭제 플래그
  deletedAt?: Date; // 삭제 시간
  createdAt: Date; // 생성 시간
  updatedAt: Date; // 수정 시간
}

/**
 * Support Inquiry Model Class
 * 지원 문의 모델 클래스
 */
export class SupportInquiryModel {
  private static instance: SupportInquiryModel;
  private collection: Collection<ISupportInquiry>;

  private constructor(db: Db) {
    this.collection = db.collection<ISupportInquiry>('supportInquiries');
    void this.createIndexes();
  }

  /**
   * Get singleton instance
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(db: Db): SupportInquiryModel {
    if (!SupportInquiryModel.instance) {
      SupportInquiryModel.instance = new SupportInquiryModel(db);
    }
    return SupportInquiryModel.instance;
  }

  /**
   * Create database indexes
   * 데이터베이스 인덱스 생성
   */
  private async createIndexes(): Promise<void> {
    try {
      // Index for user's inquiries
      await this.collection.createIndex(
        { userId: 1, createdAt: -1 },
        { name: 'idx_userId_createdAt' },
      );

      // Index for status filtering
      await this.collection.createIndex(
        { status: 1, createdAt: -1 },
        { name: 'idx_status_createdAt' },
      );

      // Index for soft delete
      await this.collection.createIndex(
        { isDeleted: 1 },
        { name: 'idx_isDeleted' },
      );

      // Compound index for admin queries
      await this.collection.createIndex(
        { isDeleted: 1, status: 1, createdAt: -1 },
        { name: 'idx_isDeleted_status_createdAt' },
      );

      logger.info('SupportInquiry indexes created successfully');
    } catch (error) {
      logger.error('Error creating SupportInquiry indexes:', error);
    }
  }

  /**
   * Create a new support inquiry
   * 새로운 지원 문의 생성
   */
  public async create(
    inquiryData: Omit<
      ISupportInquiry,
      '_id' | 'createdAt' | 'updatedAt' | 'status' | 'priority' | 'isDeleted'
    > & {
      status?: InquiryStatus;
      priority?: Priority;
    },
  ): Promise<ISupportInquiry> {
    const now = new Date();

    const inquiry: ISupportInquiry = {
      ...inquiryData,
      status: inquiryData.status || InquiryStatus.PENDING,
      priority: inquiryData.priority || Priority.MEDIUM,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(inquiry);
    return { ...inquiry, _id: result.insertedId };
  }

  /**
   * Find inquiry by ID
   * ID로 문의 찾기
   */
  public async findById(id: ObjectId): Promise<ISupportInquiry | null> {
    return this.collection.findOne({ _id: id, isDeleted: false });
  }

  /**
   * Find inquiries by user ID with pagination
   * 사용자 ID로 문의 목록 조회 (페이지네이션)
   */
  public async findByUserId(
    userId: ObjectId,
    options?: {
      status?: InquiryStatus;
      skip?: number;
      limit?: number;
    },
  ): Promise<ISupportInquiry[]> {
    const query: {
      userId: ObjectId;
      isDeleted: boolean;
      status?: InquiryStatus;
    } = {
      userId,
      isDeleted: false,
    };

    if (options?.status) {
      query.status = options.status;
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
   * Find all inquiries with pagination (Admin)
   * 전체 문의 목록 조회 (관리자용, 페이지네이션)
   */
  public async findAll(options?: {
    status?: InquiryStatus;
    category?: SupportCategory;
    priority?: Priority;
    skip?: number;
    limit?: number;
  }): Promise<ISupportInquiry[]> {
    const query: {
      isDeleted: boolean;
      status?: InquiryStatus;
      category?: SupportCategory;
      priority?: Priority;
    } = {
      isDeleted: false,
    };

    if (options?.status) {
      query.status = options.status;
    }
    if (options?.category) {
      query.category = options.category;
    }
    if (options?.priority) {
      query.priority = options.priority;
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
   * Count inquiries by user ID
   * 사용자 ID로 문의 개수 조회
   */
  public async countByUserId(
    userId: ObjectId,
    status?: InquiryStatus,
  ): Promise<number> {
    const query: {
      userId: ObjectId;
      isDeleted: boolean;
      status?: InquiryStatus;
    } = {
      userId,
      isDeleted: false,
    };
    if (status) {
      query.status = status;
    }
    return this.collection.countDocuments(query);
  }

  /**
   * Count all inquiries (Admin)
   * 전체 문의 개수 조회 (관리자용)
   */
  public async countAll(options?: {
    status?: InquiryStatus;
    category?: SupportCategory;
    priority?: Priority;
  }): Promise<number> {
    const query: {
      isDeleted: boolean;
      status?: InquiryStatus;
      category?: SupportCategory;
      priority?: Priority;
    } = {
      isDeleted: false,
    };

    if (options?.status) {
      query.status = options.status;
    }
    if (options?.category) {
      query.category = options.category;
    }
    if (options?.priority) {
      query.priority = options.priority;
    }

    return this.collection.countDocuments(query);
  }

  /**
   * Update inquiry status
   * 문의 상태 변경
   */
  public async updateStatus(
    id: ObjectId,
    status: InquiryStatus,
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, isDeleted: false },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Update inquiry priority
   * 문의 우선순위 변경
   */
  public async updatePriority(
    id: ObjectId,
    priority: Priority,
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, isDeleted: false },
      {
        $set: {
          priority,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Add admin response to inquiry
   * 관리자 답변 추가
   */
  public async addAdminResponse(
    id: ObjectId,
    adminResponse: IAdminResponse,
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, isDeleted: false },
      {
        $set: {
          adminResponse,
          status: InquiryStatus.ANSWERED,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Soft delete inquiry
   * 문의 소프트 삭제
   */
  public async softDelete(id: ObjectId): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Hard delete inquiry (Admin only)
   * 문의 영구 삭제 (관리자 전용)
   */
  public async hardDelete(id: ObjectId): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}

/**
 * Get SupportInquiry model instance
 * SupportInquiry 모델 인스턴스 가져오기
 */
export const getSupportInquiryModel = (db: Db): SupportInquiryModel => {
  return SupportInquiryModel.getInstance(db);
};
