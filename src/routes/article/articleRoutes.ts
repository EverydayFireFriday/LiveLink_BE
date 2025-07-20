// routes/article/articleRoutes.ts
import express from "express";
import { ArticleController } from "../../controllers/article";
import {
  requireAuthForWriteOnlyMiddleware,
  requireAuthInProductionMiddleware,
} from "../../middlewares/auth/conditionalAuthMiddleware";

const router = express.Router();
const articleController = new ArticleController();

/**
 * @swagger
 * tags:
 *   name: Article
 *   description: 게시글 관리 API
 */

// 게시글 생성 (개발환경에서는 인증 스킵)
router.post(
  "/",
  requireAuthInProductionMiddleware,
  articleController.createArticle
);

// 발행된 게시글 목록 조회 (인증 없이 조회 가능)
router.get("/", articleController.getPublishedArticles);

// 인기 게시글 조회 (인증 없이 조회 가능)
router.get("/popular", articleController.getPopularArticles);
 
// 작성자별 게시글 조회 (인증 없이 조회 가능)
router.get("/author/:authorId", articleController.getArticlesByAuthor);

// 게시글 상세 조회 (인증 없이 조회 가능, 조회수 증가)
router.get("/:id", articleController.getArticleById);

// 게시글 수정 (개발환경에서는 인증 스킵)
router.put(
  "/:id",
  requireAuthInProductionMiddleware,
  articleController.updateArticle
);

// 게시글 삭제 (개발환경에서는 인증 스킵)
router.delete(
  "/:id",
  requireAuthInProductionMiddleware,
  articleController.deleteArticle
);

export default router;
