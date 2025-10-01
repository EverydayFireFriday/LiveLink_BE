import express from 'express';
import { getArticleService } from '../../services/article';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';

export class ArticleController {
  private articleService = getArticleService();

  // 🛡️ 세션 검증 헬퍼 메서드
  private validateSession(
    req: express.Request,
    res: express.Response,
  ): boolean {
    if (!req.session?.user?.userId) {
      ResponseBuilder.unauthorized(res, '로그인이 필요합니다.');
      return false;
    }
    return true;
  }

  createArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const article = await this.articleService.createArticle(req.body);

      return ResponseBuilder.created(
        res,
        '게시글이 성공적으로 생성되었습니다.',
        { article },
      );
    } catch (error: unknown) {
      logger.error('게시글 생성 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('유효성 검사')) {
          return ResponseBuilder.badRequest(res, error.message);
        } else if (error.message.includes('존재하지 않는')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '게시글 생성에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
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
      logger.error('게시글 조회 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '게시글 조회에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
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
      logger.error('게시글 목록 조회 에러:', error);
      return ResponseBuilder.internalError(
        res,
        '게시글 목록 조회에 실패했습니다.',
      );
    }
  };

  updateArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { id } = req.params;
      const article = await this.articleService.updateArticle(id, req.body);

      return ResponseBuilder.success(
        res,
        '게시글이 성공적으로 수정되었습니다.',
        { article },
      );
    } catch (error: unknown) {
      logger.error('게시글 수정 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('유효성 검사')) {
          return ResponseBuilder.badRequest(res, error.message);
        } else if (error.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '게시글 수정에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
      );
    }
  };

  deleteArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { id } = req.params;
      await this.articleService.deleteArticle(id);

      return ResponseBuilder.noContent(
        res,
        '게시글이 성공적으로 삭제되었습니다.',
      );
    } catch (error: unknown) {
      logger.error('게시글 삭제 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '게시글 삭제에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
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
      logger.error('작성자별 게시글 조회 에러:', error);
      return ResponseBuilder.internalError(
        res,
        '작성자별 게시글 조회에 실패했습니다.',
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
      logger.error('인기 게시글 조회 에러:', error);
      return ResponseBuilder.internalError(
        res,
        '인기 게시글 조회에 실패했습니다.',
      );
    }
  };
}
