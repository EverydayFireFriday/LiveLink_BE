import express from 'express';
import { getConcertReviewLikeService } from '../../services/concertReview/concertReviewLikeService';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export class ConcertReviewLikeController {
  private concertReviewLikeService = getConcertReviewLikeService();

  /**
   * 리뷰에 좋아요 추가
   */
  likeReview = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const { reviewId } = req.params;
      const userId = req.session.user.userId;

      await this.concertReviewLikeService.likeReview(reviewId, userId);

      return ResponseBuilder.created(
        res,
        '리뷰에 좋아요를 추가했습니다.',
        null,
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('리뷰 좋아요 추가 에러:', error);
      throw new InternalServerError(
        '리뷰 좋아요 추가에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 리뷰 좋아요 취소
   */
  unlikeReview = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const { reviewId } = req.params;
      const userId = req.session.user.userId;

      await this.concertReviewLikeService.unlikeReview(reviewId, userId);

      return ResponseBuilder.noContent(res, '리뷰 좋아요를 취소했습니다.');
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('리뷰 좋아요 취소 에러:', error);
      throw new InternalServerError(
        '리뷰 좋아요 취소에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 사용자가 특정 리뷰에 좋아요를 눌렀는지 확인
   */
  checkUserLiked = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const { reviewId } = req.params;
      const userId = req.session.user.userId;

      const liked = await this.concertReviewLikeService.checkUserLiked(
        reviewId,
        userId,
      );

      return ResponseBuilder.success(res, '좋아요 여부 조회 성공', { liked });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('리뷰 좋아요 여부 확인 에러:', error);
      throw new InternalServerError(
        '리뷰 좋아요 여부 확인에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 특정 리뷰의 좋아요 수 조회
   */
  getLikeCount = async (req: express.Request, res: express.Response) => {
    try {
      const { reviewId } = req.params;

      const count = await this.concertReviewLikeService.getLikeCount(reviewId);

      return ResponseBuilder.success(res, '좋아요 수 조회 성공', { count });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('리뷰 좋아요 수 조회 에러:', error);
      throw new InternalServerError(
        '리뷰 좋아요 수 조회에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 사용자가 좋아요한 리뷰 수 조회
   */
  getUserLikeCount = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const userId = req.session.user.userId;

      const count =
        await this.concertReviewLikeService.getUserLikeCount(userId);

      return ResponseBuilder.success(res, '사용자 좋아요 수 조회 성공', {
        count,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('사용자 좋아요 수 조회 에러:', error);
      throw new InternalServerError(
        '사용자 좋아요 수 조회에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };
}

export const concertReviewLikeController = new ConcertReviewLikeController();
