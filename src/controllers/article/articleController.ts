import express from 'express';
import { getArticleService } from '../../services/article';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export class ArticleController {
  private articleService = getArticleService();

  createArticle = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const article = await this.articleService.createArticle(req.body);

      return ResponseBuilder.created(
        res,
        '게시글이 성공적으로 생성되었습니다.',
        { article },
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('게시글 생성 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('유효성 검사')) {
          throw new BadRequestError(
            error.message,
            ErrorCodes.VAL_INVALID_INPUT,
          );
        } else if (error.message.includes('존재하지 않는')) {
          throw new NotFoundError(error.message, ErrorCodes.ARTICLE_NOT_FOUND);
        }
      }
      throw new InternalServerError(
        '게시글 생성에 실패했습니다.',
        ErrorCodes.ARTICLE_CREATE_FAILED,
      );
    }
  };

  getArticleById = async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const withTags = req.query.withTags !== 'false';
      const withStats = req.query.withStats !== 'false';

      const article = await this.articleService.getArticleById(id, {
        withTags,
        withStats,
      });

      // 조회수 증가
      await this.articleService.incrementViews(id);

      return ResponseBuilder.success(res, '게시글 조회 성공', { article });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('게시글 조회 에러:', error);

      if (
        error instanceof Error &&
        error.message.includes('찾을 수 없습니다')
      ) {
        throw new NotFoundError(error.message, ErrorCodes.ARTICLE_NOT_FOUND);
      }
      throw new InternalServerError(
        '게시글 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getPublishedArticles = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);
      const category_id = req.query.category_id as string;
      const tag_id = req.query.tag_id as string;
      const search = req.query.search as string;

      const result = await this.articleService.getPublishedArticles({
        page,
        limit,
        category_id,
        tag_id,
        search,
      });

      return ResponseBuilder.paginated(
        res,
        '게시글 목록 조회 성공',
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
      logger.error('게시글 목록 조회 에러:', error);
      throw new InternalServerError(
        '게시글 목록 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  updateArticle = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const { id } = req.params;
      const article = await this.articleService.updateArticle(id, req.body);

      return ResponseBuilder.success(
        res,
        '게시글이 성공적으로 수정되었습니다.',
        { article },
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('게시글 수정 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('유효성 검사')) {
          throw new BadRequestError(
            error.message,
            ErrorCodes.VAL_INVALID_INPUT,
          );
        } else if (error.message.includes('찾을 수 없습니다')) {
          throw new NotFoundError(error.message, ErrorCodes.ARTICLE_NOT_FOUND);
        }
      }
      throw new InternalServerError(
        '게시글 수정에 실패했습니다.',
        ErrorCodes.ARTICLE_UPDATE_FAILED,
      );
    }
  };

  deleteArticle = async (req: express.Request, res: express.Response) => {
    // 🛡️ 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
      const { id } = req.params;
      await this.articleService.deleteArticle(id);

      return ResponseBuilder.noContent(
        res,
        '게시글이 성공적으로 삭제되었습니다.',
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('게시글 삭제 에러:', error);

      if (
        error instanceof Error &&
        error.message.includes('찾을 수 없습니다')
      ) {
        throw new NotFoundError(error.message, ErrorCodes.ARTICLE_NOT_FOUND);
      }
      throw new InternalServerError(
        '게시글 삭제에 실패했습니다.',
        ErrorCodes.ARTICLE_DELETE_FAILED,
      );
    }
  };

  getArticlesByAuthor = async (req: express.Request, res: express.Response) => {
    try {
      const { authorId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);
      const includeUnpublished = req.query.includeUnpublished === 'true';

      const result = await this.articleService.getArticlesByAuthor(authorId, {
        page,
        limit,
        includeUnpublished,
      });

      return ResponseBuilder.paginated(
        res,
        '작성자별 게시글 목록 조회 성공',
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
      logger.error('작성자별 게시글 조회 에러:', error);
      throw new InternalServerError(
        '작성자별 게시글 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getPopularArticles = async (req: express.Request, res: express.Response) => {
    try {
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);
      const days = safeParseInt(req.query.days, 7);

      const result = await this.articleService.getPopularArticles({
        page,
        limit,
        days,
      });

      return ResponseBuilder.paginated(
        res,
        '인기 게시글 목록 조회 성공',
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
      logger.error('인기 게시글 조회 에러:', error);
      throw new InternalServerError(
        '인기 게시글 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };
}
