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

/**
 * @swagger
 * /article/like/{articleId}:
 *   post:
 *     summary: 게시글 좋아요 추가
 *     description: 게시글에 좋아요를 추가합니다.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string # Changed to string
 *                 example: "60d5ecf0f2c3b7001c8e4d7a"
 *     responses:
 *       201:
 *         description: 좋아요 추가 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "좋아요가 추가되었습니다."
 *                 like:
 *                   $ref: '#/components/schemas/ArticleLike'
 *                 newLikesCount:
 *                   type: integer
 *                   example: 25
 *       400:
 *         description: 이미 좋아요한 게시글
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 게시글 좋아요 추가 (개발환경에서는 인증 스킵)
router.post(
  "/like/:articleId",
  requireAuthInProductionMiddleware,
  articleLikeController.likeArticle
);

/**
 * @swagger
 * /article/like/{articleId}:
 *   delete:
 *     summary: 게시글 좋아요 취소
 *     description: 게시글의 좋아요를 취소합니다.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string # Changed to string
 *                 example: "60d5ecf0f2c3b7001c8e4d7a"
 *     responses:
 *       200:
 *         description: 좋아요 취소 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "좋아요가 취소되었습니다."
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 newLikesCount:
 *                   type: integer
 *                   example: 24
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 좋아요를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 게시글 좋아요 취소 (개발환경에서는 인증 스킵)
router.delete(
  "/like/:articleId",
  requireAuthInProductionMiddleware,
  articleLikeController.unlikeArticle
);

/**
 * @swagger
 * /article/like/toggle/{articleId}:
 *   post:
 *     summary: 게시글 좋아요 토글
 *     description: 좋아요 상태를 토글합니다. (있으면 취소, 없으면 추가)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string # Changed to string
 *                 example: "60d5ecf0f2c3b7001c8e4d7a"
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
 *                   example: "좋아요 상태가 변경되었습니다."
 *                 isLiked:
 *                   type: boolean
 *                   example: true
 *                 newLikesCount:
 *                   type: integer
 *                   example: 25
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
// 게시글 좋아요 토글 (개발환경에서는 인증 스킵)
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
 *     description: 특정 사용자의 게시글 좋아요 상태를 확인합니다.
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
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
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
 *       500:
 *         description: 서버 에러
 */
// 게시글 좋아요 상태 확인 (GET은 인증 없이 가능)
router.get(
  "/like/status/:articleId",
  articleLikeController.getLikeStatus
);

/**
 * @swagger
 * /article/like/users/{articleId}:
 *   get:
 *     summary: 게시글을 좋아요한 사용자 목록
 *     description: 게시글을 좋아요한 사용자들의 목록을 조회합니다.
 *     tags: [Article Like]
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
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
 *         description: 페이지당 사용자 수
 *     responses:
 *       200:
 *         description: 좋아요한 사용자 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "좋아요한 사용자 목록 조회 성공"
 *                 userIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["123", "456", "789"]
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       500:
 *         description: 서버 에러
 */
// 게시글을 좋아요한 사용자 목록 (GET은 인증 없이 가능)
router.get(
  "/like/users/:articleId",
  articleLikeController.getArticleLikers
);

/**
 * @swagger
 * /article/like/user/{userId}:
 *   get:
 *     summary: 사용자가 좋아요한 게시글 목록
 *     description: 특정 사용자가 좋아요한 게시글 ID 목록을 조회합니다.
 *     tags: [Article Like]
 *     security:
 *       - sessionAuth: []
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
 *                 articleIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
// 사용자가 좋아요한 게시글 목록 (개발환경에서는 인증 스킵)
router.get(
  "/like/user/:userId",
  requireAuthInProductionMiddleware,
  articleLikeController.getUserLikedArticles
);

/**
 * @swagger
 * /article/like/status/batch:
 *   post:
 *     summary: 여러 게시글의 좋아요 상태 일괄 조회
 *     description: 여러 게시글에 대한 사용자의 좋아요 상태를 한 번에 조회합니다.
 *     tags: [Article Like]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - article_ids
 *               - user_id
 *             properties:
 *               article_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *               user_id:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: 일괄 좋아요 상태 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "일괄 좋아요 상태 조회 성공"
 *                 likeStatus:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       isLiked:
 *                         type: boolean
 *                       likesCount:
 *                         type: integer
 *                   example:
 *                     "507f1f77bcf86cd799439011":
 *                       isLiked: true
 *                       likesCount: 15
 *                     "507f1f77bcf86cd799439012":
 *                       isLiked: false
 *                       likesCount: 8
 *       401:
 *         description: 로그인 필요
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 에러
 */
// 여러 게시글의 좋아요 상태 일괄 조회 (개발환경에서는 인증 스킵)
router.post(
  "/like/status/batch",
  requireAuthInProductionMiddleware,
  articleLikeController.getBatchLikeStatus
);

export default router;
