// routes/article/articleLikeRoutes.ts
import express from "express";
import { ArticleLikeController } from "../../controllers/article";
import {
  requireAuthForWriteOnlyMiddleware,
  requireAuthInProductionMiddleware,
} from "../../middlewares/auth/conditionalAuthMiddleware";

const router = express.Router();
const articleLikeController = new ArticleLikeController();

/**
 * @swagger
 * tags:
 *   name: Article Like
 *   description: 게시글 좋아요 관리 API
 */

// 게시글 좋아요 추가 (개발환경에서는 인증 스킵)
router.post(
  "/:articleId/like",
  requireAuthInProductionMiddleware,
  articleLikeController.likeArticle
);

// 게시글 좋아요 취소 (개발환경에서는 인증 스킵)
router.delete(
  "/:articleId/like",
  requireAuthInProductionMiddleware,
  articleLikeController.unlikeArticle
);

// 게시글 좋아요 토글 (개발환경에서는 인증 스킵)
router.post(
  "/:articleId/like/toggle",
  requireAuthInProductionMiddleware,
  articleLikeController.toggleLike
);

// 게시글 좋아요 상태 확인 (GET은 인증 없이 가능)
router.get(
  "/:articleId/like/status",
  articleLikeController.getLikeStatus
);

// 게시글을 좋아요한 사용자 목록 (GET은 인증 없이 가능)
router.get(
  "/:articleId/like/users",
  articleLikeController.getArticleLikers
);

// 사용자가 좋아요한 게시글 목록 (개발환경에서는 인증 스킵)
router.get(
  "/like/user/:userId",
  requireAuthInProductionMiddleware,
  articleLikeController.getUserLikedArticles
);

// 여러 게시글의 좋아요 상태 일괄 조회 (개발환경에서는 인증 스킵)
router.post(
  "/like/status/batch",
  requireAuthInProductionMiddleware,
  articleLikeController.getBatchLikeStatus
);

export default router;
