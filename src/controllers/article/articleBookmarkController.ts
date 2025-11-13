import express from 'express';
import { getArticleBookmarkService } from '../../services/article';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export class ArticleBookmarkController {
  private articleBookmarkService = getArticleBookmarkService();

  bookmarkArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

      const { articleId } = req.params;
      const { user_id } = req.body;

      const bookmark = await this.articleBookmarkService.bookmarkArticle({
        article_id: articleId,
        user_id,
      });

      return ResponseBuilder.created(res, '북마크가 추가되었습니다.', {
        bookmark,
      });
    } catch (error: unknown) {
      logger.error('게시글 북마크 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('이미 북마크한')) {
          throw new BadRequestError(
            error.message,
            ErrorCodes.ARTICLE_BOOKMARK_ALREADY_EXISTS,
          );
        } else if (error.message.includes('찾을 수 없습니다')) {
          throw new NotFoundError(
            error.message,
            ErrorCodes.ARTICLE_NOT_FOUND,
          );
        } else if (error.message.includes('유효성 검사')) {
          throw new BadRequestError(
            error.message,
            ErrorCodes.VAL_INVALID_INPUT,
          );
        }
      }

      throw new InternalServerError(
        '북마크 추가에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  unbookmarkArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

      const { articleId } = req.params;
      const userId = req.session.user.userId;

      const result = await this.articleBookmarkService.unbookmarkArticle({
        article_id: articleId,
        user_id: userId,
      });

      return ResponseBuilder.success(res, '북마크가 삭제되었습니다.', {
        success: result.success,
      });
    } catch (error: unknown) {
      logger.error('게시글 북마크 삭제 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          throw new NotFoundError(
            error.message,
            ErrorCodes.ARTICLE_BOOKMARK_NOT_FOUND,
          );
        }
      }

      throw new InternalServerError(
        '북마크 삭제에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  toggleBookmark = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleBookmarkService.toggleBookmark(
        articleId,
        user_id.toString(),
      );

      return ResponseBuilder.success(res, '북마크 상태가 변경되었습니다.', {
        isBookmarked: result.isBookmarked,
      });
    } catch (error) {
      logger.error('북마크 토글 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new InternalServerError(
        '북마크 토글에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getBookmarkStatus = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

      const { articleId } = req.params;
      const { user_id } = req.query;

      const result = await this.articleBookmarkService.checkBookmarkStatus(
        articleId,
        user_id as string,
      );

      return ResponseBuilder.success(res, '북마크 상태 조회 성공', {
        isBookmarked: result.isBookmarked,
      });
    } catch (error) {
      logger.error('북마크 상태 조회 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new InternalServerError(
        '북마크 상태 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getBookmarkCount = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const bookmarkCount =
        await this.articleBookmarkService.getBookmarkCount(articleId);

      return ResponseBuilder.success(res, '북마크 수 조회 성공', {
        bookmarkCount,
      });
    } catch (error) {
      logger.error('북마크 수 조회 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new InternalServerError(
        '북마크 수 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getUserBookmarks = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

      const { userId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleBookmarkService.getUserBookmarks(
        userId,
        { page, limit },
      );

      return ResponseBuilder.paginated(
        res,
        '사용자 북마크 목록 조회 성공',
        result.bookmarks,
        {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      );
    } catch (error) {
      logger.error('사용자 북마크 조회 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new InternalServerError(
        '사용자 북마크 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getUserBookmarkStats = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

      const { userId } = req.params;
      const stats =
        await this.articleBookmarkService.getUserBookmarkStats(userId);

      return ResponseBuilder.success(res, '사용자 북마크 통계 조회 성공', {
        stats,
      });
    } catch (error) {
      logger.error('사용자 북마크 통계 조회 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new InternalServerError(
        '사용자 북마크 통계 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getPopularBookmarkedArticles = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);
      const days = safeParseInt(req.query.days, 30);

      const result =
        await this.articleBookmarkService.getPopularBookmarkedArticles({
          page,
          limit,
          days,
        });

      return ResponseBuilder.paginated(
        res,
        '인기 북마크 게시글 조회 성공',
        result.articles,
        {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      );
    } catch (error) {
      logger.error('인기 북마크 게시글 조회 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new InternalServerError(
        '인기 북마크 게시글 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getBatchBookmarkStatus = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

      const { article_ids, user_id } = req.body;

      if (!Array.isArray(article_ids) || !user_id) {
        throw new BadRequestError(
          '올바르지 않은 요청 데이터입니다.',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }

      const result =
        await this.articleBookmarkService.checkMultipleBookmarkStatus(
          article_ids,
          user_id,
        );

      // Map을 Object로 변환
      const bookmarkStatus: Record<string, boolean> = {};
      result.forEach((value, key) => {
        bookmarkStatus[key] = value;
      });

      return ResponseBuilder.success(res, '일괄 북마크 상태 조회 성공', {
        bookmarkStatus,
      });
    } catch (error) {
      logger.error('일괄 북마크 상태 조회 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new InternalServerError(
        '일괄 북마크 상태 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };
}
