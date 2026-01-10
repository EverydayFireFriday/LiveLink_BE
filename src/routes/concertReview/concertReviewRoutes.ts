import express from 'express';
import { concertReviewController } from '../../controllers/concertReview/concertReviewController';
import { requireAuth } from '../../middlewares/auth/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: ConcertReview
 *   description: 콘서트 리뷰 관리 API
 */

/**
 * @swagger
 * /concert-review:
 *   post:
 *     summary: 콘서트 리뷰 생성
 *     description: 새로운 콘서트 리뷰를 생성합니다.
 *     tags: [ConcertReview]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - concertId
 *               - content
 *             properties:
 *               concertId:
 *                 type: string
 *                 example: "60d5ecf0f2c3b7001c8e4d7a"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 maxItems: 10
 *                 example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "오늘 공연 너무 좋았어요! 특히 앵콜 무대가 최고였습니다."
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 example: ["tag_001", "tag_002"]
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 example: ["#아이유콘서트", "#HER", "#공연후기"]
 *               isPublic:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: 콘서트 리뷰 생성 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.post('/', requireAuth, concertReviewController.createReview);

/**
 * @swagger
 * /concert-review:
 *   get:
 *     summary: 콘서트 리뷰 목록 조회
 *     description: 콘서트 리뷰 목록을 페이지네이션과 함께 조회합니다.
 *     tags: [ConcertReview]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 사용자 ID로 필터링
 *       - in: query
 *         name: concertId
 *         schema:
 *           type: string
 *         description: 콘서트 ID로 필터링
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *         description: 공개 여부로 필터링
 *       - in: query
 *         name: hashtags
 *         schema:
 *           type: string
 *         description: 해시태그로 필터링 (콤마로 구분)
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 태그로 필터링 (콤마로 구분)
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
 *         description: 페이지당 리뷰 수
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, likeCount, updatedAt]
 *           default: createdAt
 *         description: 정렬 기준
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 정렬 순서
 *     responses:
 *       200:
 *         description: 콘서트 리뷰 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get('/', concertReviewController.getReviews);

/**
 * @swagger
 * /concert-review/popular:
 *   get:
 *     summary: 인기 콘서트 리뷰 조회
 *     description: 좋아요 수가 많은 인기 리뷰를 조회합니다.
 *     tags: [ConcertReview]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 조회할 리뷰 수
 *     responses:
 *       200:
 *         description: 인기 콘서트 리뷰 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get('/popular', concertReviewController.getPopularReviews);

/**
 * @swagger
 * /concert-review/recent:
 *   get:
 *     summary: 최근 콘서트 리뷰 조회
 *     description: 최근 작성된 리뷰를 조회합니다.
 *     tags: [ConcertReview]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 조회할 리뷰 수
 *     responses:
 *       200:
 *         description: 최근 콘서트 리뷰 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get('/recent', concertReviewController.getRecentReviews);

/**
 * @swagger
 * /concert-review/user/{userId}/count:
 *   get:
 *     summary: 사용자의 리뷰 수 조회
 *     description: 특정 사용자가 작성한 리뷰 수를 조회합니다.
 *     tags: [ConcertReview]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 사용자 리뷰 수 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get('/user/:userId/count', concertReviewController.getReviewCountByUser);

/**
 * @swagger
 * /concert-review/concert/{concertId}/count:
 *   get:
 *     summary: 콘서트의 리뷰 수 조회
 *     description: 특정 콘서트에 대한 리뷰 수를 조회합니다.
 *     tags: [ConcertReview]
 *     parameters:
 *       - in: path
 *         name: concertId
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ID
 *     responses:
 *       200:
 *         description: 콘서트 리뷰 수 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get(
  '/concert/:concertId/count',
  concertReviewController.getReviewCountByConcert,
);

/**
 * @swagger
 * /concert-review/{id}:
 *   get:
 *     summary: 콘서트 리뷰 단건 조회
 *     description: 특정 콘서트 리뷰를 조회합니다.
 *     tags: [ConcertReview]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 리뷰 ID
 *     responses:
 *       200:
 *         description: 콘서트 리뷰 조회 성공
 *       404:
 *         description: 리뷰를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.get('/:id', concertReviewController.getReviewById);

/**
 * @swagger
 * /concert-review/{id}:
 *   put:
 *     summary: 콘서트 리뷰 수정
 *     description: 작성한 콘서트 리뷰를 수정합니다.
 *     tags: [ConcertReview]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 리뷰 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 maxItems: 10
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 콘서트 리뷰 수정 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 리뷰를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.put('/:id', requireAuth, concertReviewController.updateReview);

/**
 * @swagger
 * /concert-review/{id}:
 *   delete:
 *     summary: 콘서트 리뷰 삭제
 *     description: 작성한 콘서트 리뷰를 삭제합니다.
 *     tags: [ConcertReview]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 리뷰 ID
 *     responses:
 *       204:
 *         description: 콘서트 리뷰 삭제 성공
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 리뷰를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.delete('/:id', requireAuth, concertReviewController.deleteReview);

export default router;
