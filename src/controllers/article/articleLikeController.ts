import express from 'express';
import { getArticleLikeService } from '../../services/article';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';

export class ArticleLikeController {
  private articleLikeService = getArticleLikeService();

  // 🛡️ 세션에서 userId를 가져오고, 없으면 401 응답을 보냅니다.
  private getUserIdFromSession(
    req: express.Request,
    res: express.Response,
  ): string | null {
    const userId = req.session?.user?.userId;
    if (!userId) {
      ResponseBuilder.unauthorized(res, '로그인이 필요합니다.');
      return null;
    }
    return userId;
  }

  toggleLike = async (req: express.Request, res: express.Response) => {
    try {
      const userId = this.getUserIdFromSession(req, res);
      if (!userId) return;

      const { articleId } = req.params;

      const result = await this.articleLikeService.toggleLike(
        articleId,
        userId,
      );

      return ResponseBuilder.success(
        res,
        `좋아요가 ${result.isLiked ? '추가' : '취소'}되었습니다.`,
        {
          isLiked: result.isLiked,
          likesCount: result.newLikesCount,
        },
      );
    } catch (error) {
      logger.error('좋아요 토글 에러:', error);
      if (error instanceof Error) {
        return ResponseBuilder.internalError(
          res,
          '좋아요 토글에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(res, '좋아요 토글에 실패했습니다.');
    }
  };

  getLikeStatus = async (req: express.Request, res: express.Response) => {
    try {
      const userId = this.getUserIdFromSession(req, res);
      if (!userId) return;

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
      logger.error('좋아요 상태 조회 에러:', error);
      if (error instanceof Error) {
        return ResponseBuilder.internalError(
          res,
          '좋아요 상태 조회에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '좋아요 상태 조회에 실패했습니다.',
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
        return ResponseBuilder.badRequest(res, 'User ID is required.');
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
      logger.error('사용자 좋아요 게시글 조회 에러:', error);
      return ResponseBuilder.internalError(
        res,
        '사용자 좋아요 게시글 조회에 실패했습니다.',
      );
    }
  };
}
