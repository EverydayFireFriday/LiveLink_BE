// routes/article/articleLikeRoutes.ts
import express from "express";
import { ArticleLikeController } from "../../controllers/article";
import { requireAuthInProductionMiddleware } from "../../middlewares/auth/conditionalAuthMiddleware";

const router = express.Router();
const articleLikeController = new ArticleLikeController();

/**
 * @swagger
 * tags:
 *   name: Article Like
 *   description: 게시글 좋아요 관리 API
 */

/**
 * @swagger
 * /article/like/toggle/{articleId}:
 *   post:
 *     summary: 게시글 좋아요 토글
 *     description: 좋아요 상태를 토글합니다. (있으면 취소, 없으면 추가). 인증된 사용자의 세션을 기반으로 동작합니다.
 *     tags: [Article Like]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 좋아요 토글 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "좋아요가 추가되었습니다."
 *                 isLiked:
 *                   type: boolean
 *                   example: true
 *                 likesCount:
 *                   type: integer
 *                   example: 25
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 게시글 또는 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.post(
  "/like/toggle/:articleId",
  requireAuthInProductionMiddleware,
  articleLikeController.toggleLike
);

/**
 * @swagger
 * /article/like/status/{articleId}:
 *   get:
 *     summary: 게시글 좋아요 상태 확인
 *     description: 현재 인증된 사용자의 특정 게시글 좋아요 상태를 확인합니다.
 *     tags: [Article Like]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 좋아요 상태 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "좋아요 상태 조회 성공"
 *                 isLiked:
 *                   type: boolean
 *                   example: true
 *                 likesCount:
 *                   type: integer
 *                   example: 25
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.get(
  "/like/status/:articleId",
  requireAuthInProductionMiddleware, // 현재 사용자 상태 조회를 위해 인증 필요
  articleLikeController.getLikeStatus
);

/**
 * @swagger
 * /article/like/user/{userId}:
 *   get:
 *     summary: 사용자가 좋아요한 게시글 목록
 *     description: 특정 사용자가 좋아요한 게시글 목록을 조회합니다.
 *     tags: [Article Like]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 게시글 수
 *     responses:
 *       200:
 *         description: 사용자가 좋아요한 게시글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자가 좋아요한 게시글 목록 조회 성공"
 *                 articles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Article'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       500:
 *         description: 서버 에러
 */
router.get(
  "/like/user/:userId",
  articleLikeController.getUserLikedArticles
);

export default router;