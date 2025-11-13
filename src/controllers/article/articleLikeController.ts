import express from 'express';
import { getArticleLikeService } from '../../services/article';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  BadRequestError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export class ArticleLikeController {
  private articleLikeService = getArticleLikeService();

  toggleLike = async (req: express.Request, res: express.Response) => {
    const userId = req.session?.user?.userId;
    if (!userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const { articleId } = req.params;

      const result = await this.articleLikeService.toggleLike(
        articleId,
        userId,
      );

      // 세션 업데이트: 좋아요 토글 후 최신 likedArticles 반영
      const { UserService } = await import('../../services/auth/userService');
      const { cacheManager } = await import('../../utils/cache/cacheManager');
      const userService = new UserService();

      // 캐시 무효화 후 최신 데이터 조회
      const cacheKey = `user:${userId}`;
      await cacheManager.del(cacheKey);
      const updatedUser = await userService.findById(userId);

      if (updatedUser && req.session.user) {
        req.session.user = {
          ...req.session.user,
          likedArticles: (updatedUser.likedArticles || []).map((id) =>
            String(id),
          ),
        } as typeof req.session.user;
      }

      return ResponseBuilder.success(
        res,
        `좋아요가 ${result.isLiked ? '추가' : '취소'}되었습니다.`,
        {
          isLiked: result.isLiked,
          likesCount: result.newLikesCount,
        },
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('좋아요 토글 에러:', error);
      throw new InternalServerError(
        '좋아요 토글에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getLikeStatus = async (req: express.Request, res: express.Response) => {
    const userId = req.session?.user?.userId;
    if (!userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const { articleId } = req.params;

      const result = await this.articleLikeService.checkLikeStatus(
        articleId,
        userId,
      );

      return ResponseBuilder.success(res, '좋아요 상태 조회 성공', {
        isLiked: result.isLiked,
        likesCount: result.likesCount,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('좋아요 상태 조회 에러:', error);
      throw new InternalServerError(
        '좋아요 상태 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getUserLikedArticles = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      // 다른 사용자의 좋아요 목록을 볼 수 있도록 param에서 userId를 받음
      const { userId } = req.params;
      if (!userId) {
        throw new BadRequestError(
          'User ID is required.',
          ErrorCodes.VAL_MISSING_FIELD,
        );
      }

      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleLikeService.getUserLikedArticles(
        userId,
        { page, limit },
      );

      return ResponseBuilder.paginated(
        res,
        '사용자가 좋아요한 게시글 목록 조회 성공',
        { articles: result.articles },
        {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('사용자 좋아요 게시글 조회 에러:', error);
      throw new InternalServerError(
        '사용자 좋아요 게시글 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };
}
