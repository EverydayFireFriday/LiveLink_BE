// routes/article/articleRoutes.ts
import express from 'express';
import { ArticleController } from '../../controllers/article';
import { requireAuth } from '../../middlewares/auth/authMiddleware';
import {
  relaxedLimiter,
  strictLimiter,
} from '../../middlewares/security/rateLimitMiddleware';

const router = express.Router();
const articleController = new ArticleController();

/**
 * @swagger
 * tags:
 *   name: Article
 *   description: 게시글 관리 API
 */

/**
 * @swagger
 * /article:
 *   post:
 *     summary: 게시글 생성
 *     description: 새로운 게시글을 생성합니다.
 *     tags: [Article]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content_url
 *               - author_id
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Next.js 14 새로운 기능 소개"
 *               content_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://storage.example.com/articles/content-123.md"
 *               author_id:
 *                 type: string
 *                 example: "60d5ecf0f2c3b7001c8e4d7a" # Changed to string
 *               category_name: # Changed from category_id
 *                 type: string
 *                 example: "Backend"
 *               tag_names: # Changed from tag_ids
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["TypeScript", "Node.js"]
 *               is_published:
 *                 type: boolean
 *                 default: false
 *                 example: true
 *               published_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:30:00Z"
 *     responses:
 *       201:
 *         description: 게시글 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "게시글이 성공적으로 생성되었습니다."
 *                 article:
 *                   $ref: '#/components/schemas/Article'
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 카테고리를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 게시글 생성 (인증 필요)
router.post('/', strictLimiter, requireAuth, articleController.createArticle);

/**
 * @swagger
 * /article:
 *   get:
 *     summary: 발행된 게시글 목록 조회
 *     description: 발행된 게시글 목록을 페이지네이션과 함께 조회합니다.
 *     tags: [Article]
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
 *         name: category_id
 *         schema:
 *           type: string
 *         description: 카테고리 ID로 필터링
 *       - in: query
 *         name: tag_id
 *         schema:
 *           type: string
 *         description: 태그 ID로 필터링
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 제목/내용 검색어
 *     responses:
 *       200:
 *         description: 게시글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "게시글 목록 조회 성공"
 *                 articles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ArticleListItem'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: 서버 에러
 */
// 발행된 게시글 목록 조회 (인증 없이 조회 가능)
router.get('/', relaxedLimiter, articleController.getPublishedArticles);

/**
 * @swagger
 * /article/popular:
 *   get:
 *     summary: 인기 게시글 목록 조회
 *     description: 좋아요/북마크 수를 기준으로 인기 게시글을 조회합니다.
 *     tags: [Article]
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
 *           default: 7
 *         description: 최근 며칠간의 데이터 기준
 *     responses:
 *       200:
 *         description: 인기 게시글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "인기 게시글 목록 조회 성공"
 *                 articles:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/ArticleListItem'
 *                       - type: object
 *                         properties:
 *                           popularityScore:
 *                             type: integer
 *                             description: 인기도 점수
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: 서버 에러
 */
// 인기 게시글 조회 (인증 없이 조회 가능)
router.get('/popular', relaxedLimiter, articleController.getPopularArticles);

/**
 * @swagger
 * /article/author/{authorId}:
 *   get:
 *     summary: 작성자별 게시글 목록 조회
 *     description: 특정 작성자의 게시글 목록을 조회합니다.
 *     tags: [Article]
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
 *         description: 페이지당 게시글 수
 *       - in: query
 *         name: includeUnpublished
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 미발행 게시글 포함 여부
 *     responses:
 *       200:
 *         description: 작성자별 게시글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "작성자별 게시글 목록 조회 성공"
 *                 articles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ArticleListItem'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: 서버 에러
 */
// 작성자별 게시글 조회 (인증 없이 조회 가능)
router.get(
  '/author/:authorId',
  relaxedLimiter,
  articleController.getArticlesByAuthor,
);

/**
 * @swagger
 * /article/{id}:
 *   get:
 *     summary: 게시글 상세 조회
 *     description: 특정 게시글의 상세 정보를 조회합니다.
 *     tags: [Article]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *       - in: query
 *         name: withTags
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 태그 정보 포함 여부
 *       - in: query
 *         name: withStats
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 통계 정보 포함 여부
 *     responses:
 *       200:
 *         description: 게시글 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "게시글 조회 성공"
 *                 article:
 *                   $ref: '#/components/schemas/ArticleDetail'
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 게시글 상세 조회 (인증 없이 조회 가능, 조회수 증가)
router.get('/:id', relaxedLimiter, articleController.getArticleById);

/**
 * @swagger
 * /article/{id}:
 *   put:
 *     summary: 게시글 수정
 *     description: 기존 게시글을 수정합니다.
 *     tags: [Article]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: "수정된 게시글 제목"
 *               content_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://storage.example.com/articles/updated-content.md"
 *               category_name: # Changed from category_id
 *                 type: string
 *                 example: "Frontend"
 *               tag_names: # Changed from tag_ids
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["JavaScript", "Node.js"]
 *               is_published:
 *                 type: boolean
 *                 example: true
 *               published_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T15:30:00Z"
 *     responses:
 *       200:
 *         description: 게시글 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "게시글이 성공적으로 수정되었습니다."
 *                 article:
 *                   $ref: '#/components/schemas/Article'
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 게시글 수정 (인증 필요)
router.put('/:id', strictLimiter, requireAuth, articleController.updateArticle);

/**
 * @swagger
 * /article/{id}:
 *   delete:
 *     summary: 게시글 삭제
 *     description: 게시글과 관련된 모든 데이터를 삭제합니다.
 *     tags: [Article]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 게시글 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "게시글이 성공적으로 삭제되었습니다."
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 게시글 삭제 (인증 필요)
router.delete(
  '/:id',
  strictLimiter,
  requireAuth,
  articleController.deleteArticle,
);

export default router;
