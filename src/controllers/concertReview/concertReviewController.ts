import express from 'express';
import { getConcertReviewService } from '../../services/concertReview/concertReviewService';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export class ConcertReviewController {
  private concertReviewService = getConcertReviewService();

  /**
   * 콘서트 리뷰 생성
   */
  createReview = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const userId = req.session.user.userId;
      const review = await this.concertReviewService.createReview(
        userId,
        req.body,
      );

      return ResponseBuilder.created(
        res,
        '콘서트 리뷰가 성공적으로 생성되었습니다.',
        { review },
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('콘서트 리뷰 생성 에러:', error);
      throw new InternalServerError(
        '콘서트 리뷰 생성에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 콘서트 리뷰 수정
   */
  updateReview = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const { id } = req.params;
      const userId = req.session.user.userId;
      const review = await this.concertReviewService.updateReview(
        id,
        userId,
        req.body,
      );

      return ResponseBuilder.success(
        res,
        '콘서트 리뷰가 성공적으로 수정되었습니다.',
        { review },
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('콘서트 리뷰 수정 에러:', error);
      throw new InternalServerError(
        '콘서트 리뷰 수정에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 콘서트 리뷰 삭제
   */
  deleteReview = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const { id } = req.params;
      const userId = req.session.user.userId;
      await this.concertReviewService.deleteReview(id, userId);

      return ResponseBuilder.noContent(
        res,
        '콘서트 리뷰가 성공적으로 삭제되었습니다.',
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('콘서트 리뷰 삭제 에러:', error);
      throw new InternalServerError(
        '콘서트 리뷰 삭제에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 콘서트 리뷰 단건 조회
   */
  getReviewById = async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const review = await this.concertReviewService.getReviewById(id);

      return ResponseBuilder.success(res, '콘서트 리뷰 조회 성공', { review });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('콘서트 리뷰 조회 에러:', error);
      throw new InternalServerError(
        '콘서트 리뷰 조회에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 콘서트 리뷰 목록 조회 (페이지네이션)
   */
  getReviews = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.concertReviewService.getReviews(req.query);

      return ResponseBuilder.paginated(
        res,
        '콘서트 리뷰 목록 조회 성공',
        { reviews: result.reviews },
        {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('콘서트 리뷰 목록 조회 에러:', error);
      throw new InternalServerError(
        '콘서트 리뷰 목록 조회에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 인기 리뷰 조회 (좋아요 순)
   */
  getPopularReviews = async (req: express.Request, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const reviews = await this.concertReviewService.getPopularReviews(limit);

      return ResponseBuilder.success(res, '인기 콘서트 리뷰 조회 성공', {
        reviews,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('인기 콘서트 리뷰 조회 에러:', error);
      throw new InternalServerError(
        '인기 콘서트 리뷰 조회에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 최근 리뷰 조회
   */
  getRecentReviews = async (req: express.Request, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const reviews = await this.concertReviewService.getRecentReviews(limit);

      return ResponseBuilder.success(res, '최근 콘서트 리뷰 조회 성공', {
        reviews,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('최근 콘서트 리뷰 조회 에러:', error);
      throw new InternalServerError(
        '최근 콘서트 리뷰 조회에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 특정 사용자의 리뷰 수 조회
   */
  getReviewCountByUser = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      const { userId } = req.params;
      const count =
        await this.concertReviewService.getReviewCountByUser(userId);

      return ResponseBuilder.success(res, '사용자 리뷰 수 조회 성공', {
        count,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('사용자 리뷰 수 조회 에러:', error);
      throw new InternalServerError(
        '사용자 리뷰 수 조회에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };

  /**
   * 특정 콘서트의 리뷰 수 조회
   */
  getReviewCountByConcert = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      const { concertId } = req.params;
      const count =
        await this.concertReviewService.getReviewCountByConcert(concertId);

      return ResponseBuilder.success(res, '콘서트 리뷰 수 조회 성공', {
        count,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('콘서트 리뷰 수 조회 에러:', error);
      throw new InternalServerError(
        '콘서트 리뷰 수 조회에 실패했습니다.',
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }
  };
}

export const concertReviewController = new ConcertReviewController();
