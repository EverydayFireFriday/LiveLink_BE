import express from 'express';
import { getArticleCommentService } from '../../services/article';
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

export class ArticleCommentController {
  private articleCommentService = getArticleCommentService();

  createComment = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

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

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('유효성 검사')) {
          throw new BadRequestError(
            error.message,
            ErrorCodes.VAL_INVALID_INPUT,
          );
        } else if (error.message.includes('찾을 수 없습니다')) {
          if (error.message.includes('게시글')) {
            throw new NotFoundError(
              error.message,
              ErrorCodes.ARTICLE_NOT_FOUND,
            );
          } else if (error.message.includes('상위 댓글')) {
            throw new NotFoundError(
              error.message,
              ErrorCodes.COMMENT_PARENT_NOT_FOUND,
            );
          }
          throw new NotFoundError(error.message, ErrorCodes.COMMENT_NOT_FOUND);
        }
      }

      throw new InternalServerError(
        '댓글 작성에 실패했습니다.',
        ErrorCodes.COMMENT_CREATE_FAILED,
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

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          throw new NotFoundError(
            error.message,
            ErrorCodes.ARTICLE_NOT_FOUND,
          );
        }
      }

      throw new InternalServerError(
        '댓글 목록 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
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

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          throw new NotFoundError(error.message, ErrorCodes.COMMENT_NOT_FOUND);
        }
      }

      throw new InternalServerError(
        '댓글 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  updateComment = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

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

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('유효성 검사')) {
          throw new BadRequestError(
            error.message,
            ErrorCodes.VAL_INVALID_INPUT,
          );
        } else if (error.message.includes('권한이 없습니다')) {
          throw new ForbiddenError(
            error.message,
            ErrorCodes.COMMENT_NO_PERMISSION,
          );
        } else if (error.message.includes('찾을 수 없습니다')) {
          throw new NotFoundError(error.message, ErrorCodes.COMMENT_NOT_FOUND);
        }
      }

      throw new InternalServerError(
        '댓글 수정에 실패했습니다.',
        ErrorCodes.COMMENT_UPDATE_FAILED,
      );
    }
  };

  deleteComment = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

      const { commentId } = req.params;
      const { author_id } = req.body;

      await this.articleCommentService.deleteComment(commentId, author_id);

      return ResponseBuilder.noContent(
        res,
        '댓글이 성공적으로 삭제되었습니다.',
      );
    } catch (error: unknown) {
      logger.error('댓글 삭제 에러:', error);

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('권한이 없습니다')) {
          throw new ForbiddenError(
            error.message,
            ErrorCodes.COMMENT_NO_PERMISSION,
          );
        } else if (error.message.includes('찾을 수 없습니다')) {
          throw new NotFoundError(error.message, ErrorCodes.COMMENT_NOT_FOUND);
        }
      }

      throw new InternalServerError(
        '댓글 삭제에 실패했습니다.',
        ErrorCodes.COMMENT_DELETE_FAILED,
      );
    }
  };

  toggleCommentLike = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 검증
      if (!req.session?.user?.userId) {
        throw new UnauthorizedError(
          '로그인이 필요합니다.',
          ErrorCodes.AUTH_UNAUTHORIZED,
        );
      }

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

      if (error instanceof AppError) {
        throw error;
      }

      throw new InternalServerError(
        '댓글 좋아요 토글에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
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

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          throw new NotFoundError(error.message, ErrorCodes.COMMENT_NOT_FOUND);
        }
      }

      throw new InternalServerError(
        '대댓글 목록 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getCommentsByAuthor = async (req: express.Request, res: express.Response) => {
    // 세션 검증
    if (!req.session?.user?.userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다.',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    try {
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
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('작성자별 댓글 조회 에러:', error);
      throw new InternalServerError(
        '작성자별 댓글 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
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
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('댓글 수 조회 에러:', error);
      throw new InternalServerError(
        '댓글 수 조회에 실패했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };
}
