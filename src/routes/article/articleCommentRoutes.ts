// routes/article/articleCommentRoutes.ts
import express from 'express';
import { ArticleCommentController } from '../../controllers/article';
import { requireAuth } from '../../middlewares/auth/authMiddleware';
import { defaultLimiter } from '../../middlewares/security/rateLimitMiddleware';

const router = express.Router();
const articleCommentController = new ArticleCommentController();

// 모든 댓글 API에 defaultLimiter 적용
router.use(defaultLimiter);

/**
 * @swagger
 * tags:
 *   name: Article Comment
 *   description: 댓글 관리 API
 */

/**
 * @swagger
 * /article/comment/{articleId}:
 *   post:
 *     summary: 댓글 생성
 *     description: 게시글에 새로운 댓글을 작성합니다.
 *     tags: [Article Comment]
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
 *               - author_id
 *               - content
 *             properties:
 *               author_id:
 *                 type: string # Changed to string
 *                 example: "60d5ecf0f2c3b7001c8e4d7a"
 *               content:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "정말 유익한 글이네요! 감사합니다."
 *               parent_id:
 *                 type: string # Changed to string
 *                 description: 대댓글인 경우 부모 댓글 ID
 *                 example: "60d5ecf0f2c3b7001c8e4d7b"
 *     responses:
 *       201:
 *         description: 댓글 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "댓글이 성공적으로 작성되었습니다."
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 게시글 또는 부모 댓글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 댓글 생성 (인증 필요)
router.post(
  '/comment/:articleId',
  requireAuth,
  articleCommentController.createComment,
);

/**
 * @swagger
 * /article/comment/{articleId}:
 *   get:
 *     summary: 게시글의 댓글 목록 조회
 *     description: 게시글의 댓글과 대댓글을 계층형으로 조회합니다.
 *     tags: [Article Comment]
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
 *         description: 페이지당 댓글 수 (최상위 댓글 기준)
 *     responses:
 *       200:
 *         description: 댓글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "댓글 목록 조회 성공"
 *                 comments:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Comment'
 *                       - type: object
 *                         properties:
 *                           replies:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Comment'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 게시글의 댓글 목록 조회 (GET은 인증 없이 가능)
router.get(
  '/comment/:articleId',
  articleCommentController.getCommentsByArticle,
);

/**
 * @swagger
 * /article/comment/count/{articleId}:
 *   get:
 *     summary: 게시글의 댓글 수 조회
 *     description: 특정 게시글의 총 댓글 수를 조회합니다.
 *     tags: [Article Comment]
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 댓글 수 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "댓글 수 조회 성공"
 *                 commentCount:
 *                   type: integer
 *                   example: 42
 *       500:
 *         description: 서버 에러
 */
// 게시글의 댓글 수 조회 (GET은 인증 없이 가능)
router.get(
  '/comment/count/:articleId',
  articleCommentController.getCommentCount,
);

/**
 * @swagger
 * /article/comment/{commentId}:
 *   get:
 *     summary: 댓글 상세 조회
 *     description: 특정 댓글의 상세 정보를 조회합니다.
 *     tags: [Article Comment]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 댓글 ID
 *     responses:
 *       200:
 *         description: 댓글 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "댓글 조회 성공"
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       404:
 *         description: 댓글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 댓글 상세 조회 (GET은 인증 없이 가능)
router.get('/comment/:commentId', articleCommentController.getCommentById);

/**
 * @swagger
 * /article/comment/{commentId}:
 *   put:
 *     summary: 댓글 수정
 *     description: 기존 댓글의 내용을 수정합니다. 작성자만 수정할 수 있습니다.
 *     tags: [Article Comment]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 댓글 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - author_id
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "수정된 댓글 내용입니다."
 *               author_id:
 *                 type: string
 *                 description: 작성자 확인용 ID
 *                 example: "60d5ecf0f2c3b7001c8e4d7a"
 *     responses:
 *       200:
 *         description: 댓글 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "댓글이 성공적으로 수정되었습니다."
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 수정 권한 없음
 *       404:
 *         description: 댓글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 댓글 수정 (인증 필요)
router.put(
  '/comment/:commentId',
  requireAuth,
  articleCommentController.updateComment,
);

/**
 * @swagger
 * /article/comment/{commentId}:
 *   delete:
 *     summary: 댓글 삭제
 *     description: 댓글을 삭제합니다. 작성자만 삭제할 수 있으며, 대댓글도 함께 삭제됩니다.
 *     tags: [Article Comment]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 댓글 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - author_id
 *             properties:
 *               author_id:
 *                 type: string
 *                 description: 작성자 확인용 ID
 *                 example: "60d5ecf0f2c3b7001c8e4d7a"
 *     responses:
 *       200:
 *         description: 댓글 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "댓글이 성공적으로 삭제되었습니다."
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 삭제 권한 없음
 *       404:
 *         description: 댓글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 댓글 삭제 (인증 필요)
router.delete(
  '/comment/:commentId',
  requireAuth,
  articleCommentController.deleteComment,
);

/**
 * @swagger
 * /article/comment/replies/{commentId}:
 *   get:
 *     summary: 댓글의 대댓글 목록 조회
 *     description: 특정 댓글의 대댓글 목록을 조회합니다.
 *     tags: [Article Comment]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 부모 댓글 ID
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
 *         description: 페이지당 대댓글 수
 *     responses:
 *       200:
 *         description: 대댓글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "대댓글 목록 조회 성공"
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       404:
 *         description: 부모 댓글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 댓글의 대댓글 목록 조회 (GET은 인증 없이 가능)
router.get(
  '/comment/replies/:commentId',
  articleCommentController.getRepliesByComment,
);

/**
 * @swagger
 * /article/comment/like/toggle/{commentId}:
 *   post:
 *     summary: 댓글 좋아요 토글
 *     description: 댓글 좋아요 상태를 토글합니다. (있으면 취소, 없으면 추가)
 *     tags: [Article Comment]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 댓글 ID
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
 *                 type: string
 *                 example: "60d5ecf0f2c3b7001c8e4d7a"
 *     responses:
 *       200:
 *         description: 댓글 좋아요 토글 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "댓글 좋아요 상태가 변경되었습니다."
 *                 isLiked:
 *                   type: boolean
 *                   example: true
 *                 newLikesCount:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
// 댓글 좋아요 토글 (인증 필요)
router.post(
  '/comment/like/toggle/:commentId',
  requireAuth,
  articleCommentController.toggleCommentLike,
);

/**
 * @swagger
 * /article/comment/author/{authorId}:
 *   get:
 *     summary: 작성자별 댓글 목록 조회
 *     description: 특정 작성자가 작성한 댓글 목록을 조회합니다.
 *     tags: [Article Comment]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: 작성자 ID
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
 *         description: 페이지당 댓글 수
 *     responses:
 *       200:
 *         description: 작성자별 댓글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "작성자별 댓글 목록 조회 성공"
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
// 작성자별 댓글 목록 조회 (인증 필요)
router.get(
  '/comment/author/:authorId',
  requireAuth,
  articleCommentController.getCommentsByAuthor,
);

export default router;
