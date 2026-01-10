import { ObjectId } from 'mongodb';
import { getConcertReviewLikeModel } from '../../models/concertReview/concertReviewLike';
import { getConcertReviewModel } from '../../models/concertReview/concertReview';
import logger from '../../utils/logger/logger';
import { objectIdSchema } from '../../utils/validation/concertReview/concertReviewValidation';
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
  ConflictError,
} from '../../utils/errors/customErrors';
import { ErrorCodes } from '../../utils/errors/errorCodes';

export class ConcertReviewLikeService {
  /**
   * 리뷰에 좋아요 추가
   */
  async likeReview(reviewId: string, userId: string): Promise<void> {
    try {
      // 1. Validation
      objectIdSchema.parse(reviewId);

      const concertReviewLikeModel = getConcertReviewLikeModel();
      const concertReviewModel = getConcertReviewModel();

      // 2. 리뷰 존재 여부 확인
      const review = await concertReviewModel.findById(reviewId);
      if (!review) {
        throw new NotFoundError(
          '존재하지 않는 리뷰입니다.',
          ErrorCodes.REVIEW_NOT_FOUND,
        );
      }

      // 3. 이미 좋아요를 눌렀는지 확인
      const alreadyLiked = await concertReviewLikeModel.exists(
        reviewId,
        userId,
      );
      if (alreadyLiked) {
        throw new ConflictError(
          '이미 좋아요를 누른 리뷰입니다.',
          ErrorCodes.ALREADY_LIKED,
        );
      }

      // 4. 좋아요 추가
      await concertReviewLikeModel.create(reviewId, userId);

      // 5. 리뷰의 좋아요 수 증가
      await concertReviewModel.incrementLikeCount(reviewId);

      logger.info(`리뷰 좋아요 추가: reviewId=${reviewId}, userId=${userId}`);
    } catch (error: unknown) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError
      ) {
        throw error;
      }

      logger.error('리뷰 좋아요 추가 중 오류 발생:', error);
      throw new InternalServerError(
        '리뷰 좋아요 추가 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 리뷰 좋아요 취소
   */
  async unlikeReview(reviewId: string, userId: string): Promise<void> {
    try {
      // 1. Validation
      objectIdSchema.parse(reviewId);

      const concertReviewLikeModel = getConcertReviewLikeModel();
      const concertReviewModel = getConcertReviewModel();

      // 2. 리뷰 존재 여부 확인
      const review = await concertReviewModel.findById(reviewId);
      if (!review) {
        throw new NotFoundError(
          '존재하지 않는 리뷰입니다.',
          ErrorCodes.REVIEW_NOT_FOUND,
        );
      }

      // 3. 좋아요를 눌렀는지 확인
      const liked = await concertReviewLikeModel.exists(reviewId, userId);
      if (!liked) {
        throw new NotFoundError(
          '좋아요를 누르지 않은 리뷰입니다.',
          ErrorCodes.LIKE_NOT_FOUND,
        );
      }

      // 4. 좋아요 삭제
      await concertReviewLikeModel.delete(reviewId, userId);

      // 5. 리뷰의 좋아요 수 감소
      await concertReviewModel.decrementLikeCount(reviewId);

      logger.info(`리뷰 좋아요 취소: reviewId=${reviewId}, userId=${userId}`);
    } catch (error: unknown) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      logger.error('리뷰 좋아요 취소 중 오류 발생:', error);
      throw new InternalServerError(
        '리뷰 좋아요 취소 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 사용자가 특정 리뷰에 좋아요를 눌렀는지 확인
   */
  async checkUserLiked(reviewId: string, userId: string): Promise<boolean> {
    try {
      // 1. Validation
      objectIdSchema.parse(reviewId);

      const concertReviewLikeModel = getConcertReviewLikeModel();

      // 2. 좋아요 여부 확인
      return await concertReviewLikeModel.exists(reviewId, userId);
    } catch (error: unknown) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      logger.error('리뷰 좋아요 여부 확인 중 오류 발생:', error);
      throw new InternalServerError(
        '리뷰 좋아요 여부 확인 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 특정 리뷰의 좋아요 수 조회
   */
  async getLikeCount(reviewId: string): Promise<number> {
    try {
      // 1. Validation
      objectIdSchema.parse(reviewId);

      const concertReviewLikeModel = getConcertReviewLikeModel();

      // 2. 좋아요 수 조회
      return await concertReviewLikeModel.countByReview(reviewId);
    } catch (error: unknown) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      logger.error('리뷰 좋아요 수 조회 중 오류 발생:', error);
      throw new InternalServerError(
        '리뷰 좋아요 수 조회 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 사용자가 좋아요한 리뷰 ID 목록 조회
   */
  async getUserLikedReviewIds(
    userId: string,
    skip: number = 0,
    limit: number = 20,
  ): Promise<ObjectId[]> {
    try {
      const concertReviewLikeModel = getConcertReviewLikeModel();

      return await concertReviewLikeModel.findReviewIdsByUser(
        userId,
        skip,
        limit,
      );
    } catch (error: unknown) {
      logger.error('사용자 좋아요 리뷰 목록 조회 중 오류 발생:', error);
      throw new InternalServerError(
        '사용자 좋아요 리뷰 목록 조회 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 사용자가 좋아요한 리뷰 수 조회
   */
  async getUserLikeCount(userId: string): Promise<number> {
    try {
      const concertReviewLikeModel = getConcertReviewLikeModel();

      return await concertReviewLikeModel.countByUser(userId);
    } catch (error: unknown) {
      logger.error('사용자 좋아요 수 조회 중 오류 발생:', error);
      throw new InternalServerError(
        '사용자 좋아요 수 조회 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 여러 리뷰에 대해 사용자가 좋아요를 눌렀는지 일괄 확인
   */
  async checkMultipleReviewsLiked(
    reviewIds: (string | ObjectId)[],
    userId: string,
  ): Promise<Map<string, boolean>> {
    try {
      const concertReviewLikeModel = getConcertReviewLikeModel();

      return await concertReviewLikeModel.checkMultipleReviews(
        reviewIds,
        userId,
      );
    } catch (error: unknown) {
      logger.error('여러 리뷰 좋아요 여부 확인 중 오류 발생:', error);
      throw new InternalServerError(
        '여러 리뷰 좋아요 여부 확인 중 오류가 발생했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

// Singleton 패턴
let concertReviewLikeService: ConcertReviewLikeService;

export const getConcertReviewLikeService = (): ConcertReviewLikeService => {
  if (!concertReviewLikeService) {
    concertReviewLikeService = new ConcertReviewLikeService();
  }
  return concertReviewLikeService;
};
