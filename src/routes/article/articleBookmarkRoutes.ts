// routes/article/articleBookmarkRoutes.ts
import express from "express";
import { ArticleBookmarkController } from "../../controllers/article";
import {
  requireAuthForWriteOnlyMiddleware,
  requireAuthInProductionMiddleware,
} from "../../middlewares/auth/conditionalAuthMiddleware";

const router = express.Router();
const articleBookmarkController = new ArticleBookmarkController();

/**
 * @swagger
 * tags:
 *   name: Article Bookmark
 *   description: 게시글 북마크 관리 API
 */

// 게시글 북마크 추가 (개발환경에서는 인증 스킵)
router.post(
  "/bookmark/:articleId",
  requireAuthInProductionMiddleware,
  articleBookmarkController.bookmarkArticle
);

// 게시글 북마크 삭제 (개발환경에서는 인증 스킵)
router.delete(
  "/bookmark/:articleId",
  requireAuthInProductionMiddleware,
  articleBookmarkController.unbookmarkArticle
);

// 게시글 북마크 토글 (개발환경에서는 인증 스킵)
router.post(
  "/bookmark/toggle/:articleId",
  requireAuthInProductionMiddleware,
  articleBookmarkController.toggleBookmark
);

// 게시글 북마크 상태 확인 (GET은 인증 없이 가능)
router.get(
  "/bookmark/status/:articleId",
  articleBookmarkController.getBookmarkStatus
);

// 게시글의 북마크 수 조회 (GET은 인증 없이 가능)
router.get(
  "/bookmark/count/:articleId",
  articleBookmarkController.getBookmarkCount
);

// 사용자의 북마크 목록 조회 (개발환경에서는 인증 스킵)
router.get(
  "/bookmark/user/:userId",
  requireAuthInProductionMiddleware,
  articleBookmarkController.getUserBookmarks
);

// 사용자의 북마크 통계 (개발환경에서는 인증 스킵)
router.get(
  "/bookmark/user/stats/:userId",
  requireAuthInProductionMiddleware,
  articleBookmarkController.getUserBookmarkStats
);

// 인기 북마크 게시글 조회 (GET은 인증 없이 가능)
router.get(
  "/bookmark/popular",
  articleBookmarkController.getPopularBookmarkedArticles
);

// 여러 게시글의 북마크 상태 일괄 조회 (개발환경에서는 인증 스킵)
router.post(
  "/bookmark/status/batch",
  requireAuthInProductionMiddleware,
  articleBookmarkController.getBatchBookmarkStatus
);

export default router;
