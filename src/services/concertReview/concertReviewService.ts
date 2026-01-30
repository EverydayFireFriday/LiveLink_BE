import { getConcertReviewModel } from '../../models/concertReview/concertReview';
import { getConcertModel } from '../../models/concert/concert';
import { UserModel } from '../../models/auth/user';
import logger from '../../utils/logger/logger';
import {
  createConcertReviewSchema,
  updateConcertReviewSchema,
  getConcertReviewsQuerySchema,
  objectIdSchema,
} from '../../utils/validation/concertReview/concertReviewValidation';
import {
  IConcertReview,
  ICreateConcertReviewInput,
  IUpdateConcertReviewInput,
  IConcertReviewFilter,
  IPaginationOptions,
  IPaginatedConcertReviews,
} from '../../types/concertReview/concertReviewTypes';
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
  ForbiddenError,
} from '../../utils/errors/customErrors';
import { ErrorCodes } from '../../utils/errors/errorCodes';

export class ConcertReviewService {
  private userModel = new UserModel();

  /**
   * 콘서트 리뷰 생성
   */
  async createReview(userId: string, data: unknown): Promise<IConcertReview> {
    try {
      // 1. Validation
      const validatedData = createConcertReviewSchema.parse(data);

      const concertReviewModel = getConcertReviewModel();
      const concertModel = getConcertModel();

      // 2. 콘서트 존재 여부 확인
      const concert = await concertModel.findById(validatedData.concertId);
      if (!concert) {
        throw new NotFoundError(
          '존재하지 않는 콘서트입니다.',
          ErrorCodes.CONCERT_NOT_FOUND,
        );
      }

      // 3. 사용자 정보 조회
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundError(
          '사용자 정보를 찾을 수 없습니다.',
          ErrorCodes.USER_NOT_FOUND,
        );
      }

      // 4. 중복 리뷰 확인 (한 사용자가 같은 콘서트에 여러 리뷰 작성 가능하도록 허용)
      // 필요시 중복 체크 로직 추가 가능

      // 5. 콘서트 날짜 추출 (첫 번째 날짜 사용)
      const concertDate =
        concert.datetime && concert.datetime.length > 0
          ? concert.datetime[0]
          : new Date();

      // 6. 콘서트 장소 추출 (첫 번째 장소 사용)
      const venue =
        concert.location && concert.location.length > 0
          ? concert.location[0]
          : '';

      // 7. 리뷰 데이터 구성
      const reviewInput: ICreateConcertReviewInput = {
        userId,
        username: user.username || user.email || 'Anonymous',
        profileImage: user.profileImage,
        concertId: validatedData.concertId,
        concertTitle: concert.title,
        posterImage: concert.posterImage,
        venue,
        date: concertDate,
        images: validatedData.images || [],
        content: validatedData.content,
        tags: validatedData.tags || [],
        hashtags: validatedData.hashtags || [],
        isPublic:
          validatedData.isPublic !== undefined ? validatedData.isPublic : true,
      };

      // 8. 리뷰 생성
      const result = await concertReviewModel.create(reviewInput);

      // 9. 생성된 리뷰 조회
      const createdReview = await concertReviewModel.findById(
        result.insertedId,
      );
      if (!createdReview) {
        throw new InternalServerError(
          '리뷰 생성에 실패했습니다.',
          ErrorCodes.INTERNAL_SERVER_ERROR,
        );
      }

      logger.info(
        `콘서트 리뷰 생성 완료: ${result.insertedId.toString()}, User: ${userId}`,
      );

      return createdReview;
    } catch (error: unknown) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof InternalServerError
      ) {
        throw error;
      }

      logger.error('콘서트 리뷰 생성 중 오류 발생:', error);
      throw new InternalServerError(
        '콘서트 리뷰 생성 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 콘서트 리뷰 수정
   */
  async updateReview(
    reviewId: string,
    userId: string,
    data: unknown,
  ): Promise<IConcertReview> {
    try {
      // 1. Validation
      objectIdSchema.parse(reviewId);
      const validatedData = updateConcertReviewSchema.parse(data);

      const concertReviewModel = getConcertReviewModel();

      // 2. 리뷰 존재 여부 및 권한 확인
      const existingReview = await concertReviewModel.findById(reviewId);
      if (!existingReview) {
        throw new NotFoundError(
          '존재하지 않는 리뷰입니다.',
          ErrorCodes.REVIEW_NOT_FOUND,
        );
      }

      // 3. 작성자 본인 확인
      if (existingReview.user.id !== userId) {
        throw new ForbiddenError(
          '리뷰를 수정할 권한이 없습니다.',
          ErrorCodes.FORBIDDEN,
        );
      }

      // 4. 업데이트 데이터 구성
      const updateInput: IUpdateConcertReviewInput = {};

      if (validatedData.images !== undefined) {
        updateInput.images = validatedData.images;
      }
      if (validatedData.content !== undefined) {
        updateInput.content = validatedData.content;
      }
      if (validatedData.tags !== undefined) {
        updateInput.tags = validatedData.tags;
      }
      if (validatedData.hashtags !== undefined) {
        updateInput.hashtags = validatedData.hashtags;
      }
      if (validatedData.isPublic !== undefined) {
        updateInput.isPublic = validatedData.isPublic;
      }

      // 5. 리뷰 업데이트
      await concertReviewModel.update(reviewId, updateInput);

      // 6. 업데이트된 리뷰 조회
      const updatedReview = await concertReviewModel.findById(reviewId);
      if (!updatedReview) {
        throw new InternalServerError(
          '리뷰 업데이트 후 조회에 실패했습니다.',
          ErrorCodes.INTERNAL_SERVER_ERROR,
        );
      }

      logger.info(`콘서트 리뷰 수정 완료: ${reviewId}, User: ${userId}`);

      return updatedReview;
    } catch (error: unknown) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ForbiddenError ||
        error instanceof InternalServerError
      ) {
        throw error;
      }

      logger.error('콘서트 리뷰 수정 중 오류 발생:', error);
      throw new InternalServerError(
        '콘서트 리뷰 수정 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 콘서트 리뷰 삭제
   */
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    try {
      // 1. Validation
      objectIdSchema.parse(reviewId);

      const concertReviewModel = getConcertReviewModel();

      // 2. 리뷰 존재 여부 및 권한 확인
      const existingReview = await concertReviewModel.findById(reviewId);
      if (!existingReview) {
        throw new NotFoundError(
          '존재하지 않는 리뷰입니다.',
          ErrorCodes.REVIEW_NOT_FOUND,
        );
      }

      // 3. 작성자 본인 확인
      if (existingReview.user.id !== userId) {
        throw new ForbiddenError(
          '리뷰를 삭제할 권한이 없습니다.',
          ErrorCodes.FORBIDDEN,
        );
      }

      // 4. 리뷰 삭제
      await concertReviewModel.delete(reviewId);

      logger.info(`콘서트 리뷰 삭제 완료: ${reviewId}, User: ${userId}`);
    } catch (error: unknown) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      logger.error('콘서트 리뷰 삭제 중 오류 발생:', error);
      throw new InternalServerError(
        '콘서트 리뷰 삭제 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 콘서트 리뷰 단건 조회
   */
  async getReviewById(reviewId: string): Promise<IConcertReview> {
    try {
      // 1. Validation
      objectIdSchema.parse(reviewId);

      const concertReviewModel = getConcertReviewModel();

      // 2. 리뷰 조회
      const review = await concertReviewModel.findById(reviewId);
      if (!review) {
        throw new NotFoundError(
          '존재하지 않는 리뷰입니다.',
          ErrorCodes.REVIEW_NOT_FOUND,
        );
      }

      return review;
    } catch (error: unknown) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      logger.error('콘서트 리뷰 조회 중 오류 발생:', error);
      throw new InternalServerError(
        '콘서트 리뷰 조회 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 콘서트 리뷰 목록 조회 (페이지네이션)
   */
  async getReviews(query: unknown): Promise<IPaginatedConcertReviews> {
    try {
      // 1. Query Validation
      const validatedQuery = getConcertReviewsQuerySchema.parse(query);

      const concertReviewModel = getConcertReviewModel();

      // 2. 필터 구성
      const filter: IConcertReviewFilter = {};

      if (validatedQuery.userId) {
        filter.userId = validatedQuery.userId;
      }
      if (validatedQuery.concertId) {
        filter.concertId = validatedQuery.concertId;
      }
      if (validatedQuery.isPublic !== undefined) {
        filter.isPublic = validatedQuery.isPublic;
      }
      if (validatedQuery.hashtags) {
        filter.hashtags = validatedQuery.hashtags;
      }
      if (validatedQuery.tags) {
        filter.tags = validatedQuery.tags;
      }

      // 3. 페이지네이션 옵션 구성
      const paginationOptions: IPaginationOptions = {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        sortBy: validatedQuery.sortBy,
        sortOrder: validatedQuery.sortOrder,
      };

      // 4. 리뷰 조회
      const result = await concertReviewModel.findWithPagination(
        filter,
        paginationOptions,
      );

      return result;
    } catch (error: unknown) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      logger.error('콘서트 리뷰 목록 조회 중 오류 발생:', error);
      throw new InternalServerError(
        '콘서트 리뷰 목록 조회 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 인기 리뷰 조회 (좋아요 순)
   */
  async getPopularReviews(limit: number = 10): Promise<IConcertReview[]> {
    try {
      const concertReviewModel = getConcertReviewModel();
      return await concertReviewModel.findPopular(limit);
    } catch (error: unknown) {
      logger.error('인기 콘서트 리뷰 조회 중 오류 발생:', error);
      throw new InternalServerError(
        '인기 콘서트 리뷰 조회 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 최근 리뷰 조회
   */
  async getRecentReviews(limit: number = 10): Promise<IConcertReview[]> {
    try {
      const concertReviewModel = getConcertReviewModel();
      return await concertReviewModel.findRecent(limit);
    } catch (error: unknown) {
      logger.error('최근 콘서트 리뷰 조회 중 오류 발생:', error);
      throw new InternalServerError(
        '최근 콘서트 리뷰 조회 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 특정 사용자의 리뷰 수 조회
   */
  async getReviewCountByUser(userId: string): Promise<number> {
    try {
      const concertReviewModel = getConcertReviewModel();
      return await concertReviewModel.countByUser(userId);
    } catch (error: unknown) {
      logger.error('사용자 리뷰 수 조회 중 오류 발생:', error);
      throw new InternalServerError(
        '사용자 리뷰 수 조회 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 특정 콘서트의 리뷰 수 조회
   */
  async getReviewCountByConcert(concertId: string): Promise<number> {
    try {
      const concertReviewModel = getConcertReviewModel();
      return await concertReviewModel.countByConcert(concertId);
    } catch (error: unknown) {
      logger.error('콘서트 리뷰 수 조회 중 오류 발생:', error);
      throw new InternalServerError(
        '콘서트 리뷰 수 조회 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

// Singleton 패턴
let concertReviewService: ConcertReviewService;

export const getConcertReviewService = (): ConcertReviewService => {
  if (!concertReviewService) {
    concertReviewService = new ConcertReviewService();
  }
  return concertReviewService;
};
