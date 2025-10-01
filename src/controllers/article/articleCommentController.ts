import express from 'express';
import { getArticleCommentService } from '../../services/article';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';

export class ArticleCommentController {
  private articleCommentService = getArticleCommentService();

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

  createComment = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      const { author_id, content, parent_id } = req.body;

      const comment = await this.articleCommentService.createComment({
        article_id: articleId,
        author_id,
        content,
        parent_id,
      });

      return ResponseBuilder.created(res, '댓글이 성공적으로 작성되었습니다.', {
        comment,
      });
    } catch (error: unknown) {
      logger.error('댓글 생성 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('유효성 검사')) {
          return ResponseBuilder.badRequest(res, error.message);
        } else if (error.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '댓글 작성에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
      );
    }
  };

  getCommentsByArticle = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      const { articleId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleCommentService.getCommentsByArticle(
        articleId,
        {
          page,
          limit,
        },
      );

      return ResponseBuilder.paginated(
        res,
        '댓글 목록 조회 성공',
        { comments: result.comments },
        {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      );
    } catch (error: unknown) {
      logger.error('댓글 목록 조회 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '댓글 목록 조회에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
      );
    }
  };

  getCommentById = async (req: express.Request, res: express.Response) => {
    try {
      const { commentId } = req.params;
      const comment =
        await this.articleCommentService.getCommentById(commentId);

      return ResponseBuilder.success(res, '댓글 조회 성공', { comment });
    } catch (error: unknown) {
      logger.error('댓글 조회 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '댓글 조회에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
      );
    }
  };

  updateComment = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { commentId } = req.params;
      const { content, author_id } = req.body;

      const comment = await this.articleCommentService.updateComment(
        commentId,
        { content },
        author_id,
      );

      return ResponseBuilder.success(res, '댓글이 성공적으로 수정되었습니다.', {
        comment,
      });
    } catch (error: unknown) {
      logger.error('댓글 수정 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('유효성 검사')) {
          return ResponseBuilder.badRequest(res, error.message);
        } else if (error.message.includes('권한이 없습니다')) {
          return ResponseBuilder.forbidden(res, error.message);
        } else if (error.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '댓글 수정에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
      );
    }
  };

  deleteComment = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { commentId } = req.params;
      const { author_id } = req.body;

      await this.articleCommentService.deleteComment(commentId, author_id);

      return ResponseBuilder.noContent(
        res,
        '댓글이 성공적으로 삭제되었습니다.',
      );
    } catch (error: unknown) {
      logger.error('댓글 삭제 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('권한이 없습니다')) {
          return ResponseBuilder.forbidden(res, error.message);
        } else if (error.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '댓글 삭제에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
      );
    }
  };

  toggleCommentLike = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { commentId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleCommentService.toggleCommentLike(
        commentId,
        user_id,
      );

      return ResponseBuilder.success(
        res,
        '댓글 좋아요 상태가 변경되었습니다.',
        {
          isLiked: result.isLiked,
          newLikesCount: result.newLikesCount,
        },
      );
    } catch (error) {
      logger.error('댓글 좋아요 토글 에러:', error);
      return ResponseBuilder.internalError(
        res,
        '댓글 좋아요 토글에 실패했습니다.',
      );
    }
  };

  getRepliesByComment = async (req: express.Request, res: express.Response) => {
    try {
      const { commentId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleCommentService.getRepliesByComment(
        commentId,
        {
          page,
          limit,
        },
      );

      return ResponseBuilder.paginated(
        res,
        '대댓글 목록 조회 성공',
        { comments: result.comments },
        {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      );
    } catch (error: unknown) {
      logger.error('대댓글 목록 조회 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, error.message);
        }
        return ResponseBuilder.internalError(
          res,
          '대댓글 목록 조회에 실패했습니다.',
          error.message,
        );
      }
      return ResponseBuilder.internalError(
        res,
        '알 수 없는 오류가 발생했습니다.',
      );
    }
  };

  getCommentsByAuthor = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { authorId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleCommentService.getCommentsByAuthor(
        authorId,
        {
          page,
          limit,
        },
      );

      return ResponseBuilder.paginated(
        res,
        '작성자별 댓글 목록 조회 성공',
        { comments: result.comments },
        {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      );
    } catch (error) {
      logger.error('작성자별 댓글 조회 에러:', error);
      return ResponseBuilder.internalError(
        res,
        '작성자별 댓글 조회에 실패했습니다.',
      );
    }
  };

  getCommentCount = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const commentCount =
        await this.articleCommentService.getCommentCount(articleId);

      return ResponseBuilder.success(res, '댓글 수 조회 성공', {
        commentCount,
      });
    } catch (error) {
      logger.error('댓글 수 조회 에러:', error);
      return ResponseBuilder.internalError(res, '댓글 수 조회에 실패했습니다.');
    }
  };
}
