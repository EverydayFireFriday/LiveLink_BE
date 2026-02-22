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
 *                 description: MongoDB ObjectId 형식의 콘서트 ID
 *                 example: "677f2a4b8e9d1a3b4c5e6f7a"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 maxItems: 10
 *                 description: 이미지 URL 배열 (최대 10개)
 *                 example: ["https://i.imgur.com/abc123.jpg", "https://i.imgur.com/def456.jpg"]
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: 리뷰 내용
 *                 example: "오늘 공연 너무 좋았어요! 특히 앵콜 무대가 최고였습니다. 다음에도 꼭 가고 싶어요."
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *                 description: 태그 배열 (최대 10개, 각 50자 이내)
 *                 example: ["발라드", "감성", "힐링"]
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                   pattern: "^#"
 *                 maxItems: 10
 *                 description: 해시태그 배열 (# 포함, 최대 10개)
 *                 example: ["#아이유콘서트", "#HER", "#공연후기"]
 *               isPublic:
 *                 type: boolean
 *                 default: true
 *                 description: 공개 여부
 *                 example: true
 *     responses:
 *       201:
 *         description: 콘서트 리뷰 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "콘서트 리뷰가 성공적으로 생성되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     review:
 *                       type: object
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
 *         description: 사용자 ID로 필터링 (MongoDB ObjectId)
 *         example: "677f2a4b8e9d1a3b4c5e6f7a"
 *       - in: query
 *         name: concertId
 *         schema:
 *           type: string
 *         description: 콘서트 ID로 필터링 (MongoDB ObjectId)
 *         example: "677f2a4b8e9d1a3b4c5e6f7b"
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: 공개 여부로 필터링 (문자열 "true" 또는 "false")
 *         example: "true"
 *       - in: query
 *         name: hashtags
 *         schema:
 *           type: string
 *         description: 해시태그로 필터링 (콤마로 구분, # 포함)
 *         example: "#아이유콘서트,#HER"
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 태그로 필터링 (콤마로 구분)
 *         example: "발라드,감성"
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: 페이지 번호 (문자열)
 *         example: "1"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "20"
 *         description: 페이지당 리뷰 수 (최대 100, 문자열)
 *         example: "20"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, likeCount, updatedAt]
 *           default: createdAt
 *         description: 정렬 기준
 *         example: "createdAt"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 정렬 순서
 *         example: "desc"
 *     responses:
 *       200:
 *         description: 콘서트 리뷰 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "콘서트 리뷰 목록을 성공적으로 조회했습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 8
 *                     limit:
 *                       type: integer
 *                       example: 20
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
 *         example: 10
 *     responses:
 *       200:
 *         description: 인기 콘서트 리뷰 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "인기 콘서트 리뷰를 성공적으로 조회했습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
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
 *         example: 10
 *     responses:
 *       200:
 *         description: 최근 콘서트 리뷰 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "최근 콘서트 리뷰를 성공적으로 조회했습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
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
 *         description: 사용자 ID (MongoDB ObjectId)
 *         example: "677f2a4b8e9d1a3b4c5e6f7a"
 *     responses:
 *       200:
 *         description: 사용자 리뷰 수 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "사용자 리뷰 수를 성공적으로 조회했습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 23
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
 *         description: 콘서트 ID (MongoDB ObjectId)
 *         example: "677f2a4b8e9d1a3b4c5e6f7b"
 *     responses:
 *       200:
 *         description: 콘서트 리뷰 수 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "콘서트 리뷰 수를 성공적으로 조회했습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 156
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
 *         description: 리뷰 ID (MongoDB ObjectId)
 *         example: "677f2a4b8e9d1a3b4c5e6f7c"
 *     responses:
 *       200:
 *         description: 콘서트 리뷰 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "콘서트 리뷰를 성공적으로 조회했습니다."
 *                 data:
 *                   type: object
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
 *         description: 리뷰 ID (MongoDB ObjectId)
 *         example: "677f2a4b8e9d1a3b4c5e6f7c"
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
 *                 description: 이미지 URL 배열 (빈 문자열 자동 필터)
 *                 example: ["https://i.imgur.com/updated123.jpg"]
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: 수정할 리뷰 내용
 *                 example: "수정된 후기입니다. 생각해보니 무대 연출도 정말 멋졌어요!"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *                 description: 태그 배열
 *                 example: ["발라드", "감동"]
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *                 description: 해시태그 배열 (# 포함)
 *                 example: ["#최고의공연", "#감동"]
 *               isPublic:
 *                 type: boolean
 *                 description: 공개 여부
 *                 example: false
 *     responses:
 *       200:
 *         description: 콘서트 리뷰 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "콘서트 리뷰가 성공적으로 수정되었습니다."
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
 *         description: 리뷰 ID (MongoDB ObjectId)
 *         example: "677f2a4b8e9d1a3b4c5e6f7c"
 *     responses:
 *       200:
 *         description: 콘서트 리뷰 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "콘서트 리뷰가 성공적으로 삭제되었습니다."
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
