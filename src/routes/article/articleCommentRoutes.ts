// routes/article/articleCommentRoutes.ts
import express from "express";
import { ArticleCommentController } from "../../controllers/article";
import {
  requireAuthForWriteOnlyMiddleware,
  requireAuthInProductionMiddleware,
} from "../../middlewares/auth/conditionalAuthMiddleware";

const router = express.Router();
const articleCommentController = new ArticleCommentController();

/**
 * @swagger
 * tags:
 *   name: Article Comment
 *   description: 댓글 관리 API
 */

// 댓글 생성 (개발환경에서는 인증 스킵)
router.post(
  "/article/:articleId/comment",
  requireAuthInProductionMiddleware,
  articleCommentController.createComment
);

// 게시글의 댓글 목록 조회 (GET은 인증 없이 가능)
router.get(
  "/article/:articleId/comment",
  articleCommentController.getCommentsByArticle
);

// 게시글의 댓글 수 조회 (GET은 인증 없이 가능)
router.get(
  "/article/:articleId/comment/count",
  articleCommentController.getCommentCount
);

// 댓글 상세 조회 (GET은 인증 없이 가능)
router.get("/comment/:commentId", articleCommentController.getCommentById);

// 댓글 수정 (개발환경에서는 인증 스킵)
router.put(
  "/comment/:commentId",
  requireAuthInProductionMiddleware,
  articleCommentController.updateComment
);

// 댓글 삭제 (개발환경에서는 인증 스킵)
router.delete(
  "/comment/:commentId",
  requireAuthInProductionMiddleware,
  articleCommentController.deleteComment
);

// 댓글의 대댓글 목록 조회 (GET은 인증 없이 가능)
router.get(
  "/comment/:commentId/replies",
  articleCommentController.getRepliesByComment
);

// 댓글 좋아요 토글 (개발환경에서는 인증 스킵)
router.post(
  "/comment/:commentId/like/toggle",
  requireAuthInProductionMiddleware,
  articleCommentController.toggleCommentLike
);

// 작성자별 댓글 목록 조회 (개발환경에서는 인증 스킵)
router.get(
  "/comment/author/:authorId",
  requireAuthInProductionMiddleware,
  articleCommentController.getCommentsByAuthor
);

export default router;
