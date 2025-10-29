// routes/article/articleBookmarkRoutes.ts
import express from 'express';
import { ArticleBookmarkController } from '../../controllers/article';
import { requireAuthInProductionMiddleware } from '../../middlewares/auth/conditionalAuthMiddleware';
import { defaultLimiter } from '../../middlewares/security/rateLimitMiddleware';

const router = express.Router();
const articleBookmarkController = new ArticleBookmarkController();

// 모든 북마크 API에 defaultLimiter 적용
router.use(defaultLimiter);

/**
 * @swagger
 * tags:
 *   name: Article Bookmark
 *   description: 게시글 북마크 관리 API
 */

/**
 * @swagger
 * /article/bookmark/{articleId}:
 *   post:
 *     summary: 게시글 북마크 추가
 *     description: 게시글을 북마크에 추가합니다.
 *     tags: [Article Bookmark]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: 세션 기반 인증으로 사용자 식별. 본문은 필요하지 않습니다.
 *     responses:
 *       201:
 *         description: 북마크 추가 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "북마크가 추가되었습니다."
 *                 bookmark:
 *                   $ref: '#/components/schemas/ArticleBookmark'
 *       400:
 *         description: 이미 북마크한 게시글
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 게시글 북마크 추가 (개발환경에서는 인증 스킵)
router.post(
  '/bookmark/:articleId',
  requireAuthInProductionMiddleware,
  articleBookmarkController.bookmarkArticle,
);

/**
 * @swagger
 * /article/bookmark/{articleId}:
 *   delete:
 *     summary: 게시글 북마크 삭제
 *     description: 게시글을 북마크에서 제거합니다.
 *     tags: [Article Bookmark]
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
 *         description: 북마크 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "북마크가 삭제되었습니다."
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 북마크를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 게시글 북마크 삭제 (개발환경에서는 인증 스킵)
router.delete(
  '/bookmark/:articleId',
  requireAuthInProductionMiddleware,
  articleBookmarkController.unbookmarkArticle,
);

/**
 * @swagger
 * /article/bookmark/toggle/{articleId}:
 *   post:
 *     summary: 게시글 북마크 토글
 *     description: 북마크 상태를 토글합니다. (있으면 삭제, 없으면 추가)
 *     tags: [Article Bookmark]
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
 *         description: 북마크 토글 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "북마크 상태가 변경되었습니다."
 *                 isBookmarked:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
// 게시글 북마크 토글 (개발환경에서는 인증 스킵)
router.post(
  '/bookmark/toggle/:articleId',
  requireAuthInProductionMiddleware,
  articleBookmarkController.toggleBookmark,
);

/**
 * @swagger
 * /article/bookmark/status/{articleId}:
 *   get:
 *     summary: 게시글 북마크 상태 확인
 *     description: 특정 사용자의 게시글 북마크 상태를 확인합니다.
 *     tags: [Article Bookmark]
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
 *         description: 북마크 상태 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "북마크 상태 조회 성공"
 *                 isBookmarked:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
// 게시글 북마크 상태 확인 (GET은 인증 없이 가능)
router.get(
  '/bookmark/status/:articleId',
  articleBookmarkController.getBookmarkStatus,
);

/**
 * @swagger
 * /article/bookmark/count/{articleId}:
 *   get:
 *     summary: 게시글의 북마크 수 조회
 *     description: 특정 게시글의 총 북마크 수를 조회합니다.
 *     tags: [Article Bookmark]
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 북마크 수 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "북마크 수 조회 성공"
 *                 bookmarkCount:
 *                   type: integer
 *                   example: 25
 *       500:
 *         description: 서버 에러
 */
// 게시글의 북마크 수 조회 (GET은 인증 없이 가능)
router.get(
  '/bookmark/count/:articleId',
  articleBookmarkController.getBookmarkCount,
);

/**
 * @swagger
 * /article/bookmark/user/{userId}:
 *   get:
 *     summary: 사용자의 북마크 목록 조회
 *     description: 특정 사용자가 북마크한 게시글 목록을 조회합니다.
 *     tags: [Article Bookmark]
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
 *         description: 페이지당 북마크 수
 *     responses:
 *       200:
 *         description: 사용자 북마크 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자 북마크 목록 조회 성공"
 *                 bookmarks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ArticleBookmark'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
// 사용자의 북마크 목록 조회 (개발환경에서는 인증 스킵)
router.get(
  '/bookmark/user/:userId',
  requireAuthInProductionMiddleware,
  articleBookmarkController.getUserBookmarks,
);

/**
 * @swagger
 * /article/bookmark/user/stats/{userId}:
 *   get:
 *     summary: 사용자의 북마크 통계
 *     description: 사용자의 북마크 관련 통계 정보를 조회합니다.
 *     tags: [Article Bookmark]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 사용자 북마크 통계 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자 북마크 통계 조회 성공"
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalBookmarks:
 *                       type: integer
 *                       example: 42
 *                       description: 총 북마크 수
 *                     recentBookmarks:
 *                       type: integer
 *                       example: 5
 *                       description: 최근 30일간 북마크 수
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
// 사용자의 북마크 통계 (개발환경에서는 인증 스킵)
router.get(
  '/bookmark/user/stats/:userId',
  requireAuthInProductionMiddleware,
  articleBookmarkController.getUserBookmarkStats,
);

/**
 * @swagger
 * /article/bookmark/popular:
 *   get:
 *     summary: 인기 북마크 게시글 조회
 *     description: 북마크 수를 기준으로 인기 게시글을 조회합니다.
 *     tags: [Article Bookmark]
 *     parameters:
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
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 30
 *         description: 최근 며칠간의 데이터 기준
 *     responses:
 *       200:
 *         description: 인기 북마크 게시글 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "인기 북마크 게시글 조회 성공"
 *                 articles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bookmarkCount:
 *                         type: integer
 *                         description: 북마크 수
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: 서버 에러
 */
// 인기 북마크 게시글 조회 (GET은 인증 없이 가능)
router.get(
  '/bookmark/popular',
  articleBookmarkController.getPopularBookmarkedArticles,
);

/**
 * @swagger
 * /article/bookmark/status/batch:
 *   post:
 *     summary: 여러 게시글의 북마크 상태 일괄 조회
 *     description: 여러 게시글에 대한 사용자의 북마크 상태를 한 번에 조회합니다.
 *     tags: [Article Bookmark]
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
 *                 example: "60d5ecf0f2c3b7001c8e4d7a"
 *     responses:
 *       200:
 *         description: 일괄 북마크 상태 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "일괄 북마크 상태 조회 성공"
 *                 bookmarkStatus:
 *                   type: object
 *                   additionalProperties:
 *                     type: boolean
 *                   example:
 *                     "507f1f77bcf86cd799439011": true
 *                     "507f1f77bcf86cd799439012": false
 *       401:
 *         description: 로그인 필요
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 에러
 */
// 여러 게시글의 북마크 상태 일괄 조회 (개발환경에서는 인증 스킵)
router.post(
  '/bookmark/status/batch',
  requireAuthInProductionMiddleware,
  articleBookmarkController.getBatchBookmarkStatus,
);

export default router;
