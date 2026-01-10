import express from 'express';
import { concertReviewLikeController } from '../../controllers/concertReview/concertReviewLikeController';
import { requireAuth } from '../../middlewares/auth/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: ConcertReviewLike
 *   description: 콘서트 리뷰 좋아요 관리 API
 */

/**
 * @swagger
 * /concert-review/{reviewId}/like:
 *   post:
 *     summary: 리뷰에 좋아요 추가
 *     description: 콘서트 리뷰에 좋아요를 추가합니다.
 *     tags: [ConcertReviewLike]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: 리뷰 ID
 *     responses:
 *       201:
 *         description: 좋아요 추가 성공
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 리뷰를 찾을 수 없음
 *       409:
 *         description: 이미 좋아요를 누른 리뷰
 *       500:
 *         description: 서버 에러
 */
router.post(
  '/:reviewId/like',
  requireAuth,
  concertReviewLikeController.likeReview,
);

/**
 * @swagger
 * /concert-review/{reviewId}/like:
 *   delete:
 *     summary: 리뷰 좋아요 취소
 *     description: 콘서트 리뷰의 좋아요를 취소합니다.
 *     tags: [ConcertReviewLike]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: 리뷰 ID
 *     responses:
 *       204:
 *         description: 좋아요 취소 성공
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 리뷰 또는 좋아요를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.delete(
  '/:reviewId/like',
  requireAuth,
  concertReviewLikeController.unlikeReview,
);

/**
 * @swagger
 * /concert-review/{reviewId}/like/check:
 *   get:
 *     summary: 사용자가 리뷰에 좋아요를 눌렀는지 확인
 *     description: 현재 로그인한 사용자가 특정 리뷰에 좋아요를 눌렀는지 확인합니다.
 *     tags: [ConcertReviewLike]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: 리뷰 ID
 *     responses:
 *       200:
 *         description: 좋아요 여부 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
router.get(
  '/:reviewId/like/check',
  requireAuth,
  concertReviewLikeController.checkUserLiked,
);

/**
 * @swagger
 * /concert-review/{reviewId}/like/count:
 *   get:
 *     summary: 리뷰의 좋아요 수 조회
 *     description: 특정 리뷰의 좋아요 수를 조회합니다.
 *     tags: [ConcertReviewLike]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: 리뷰 ID
 *     responses:
 *       200:
 *         description: 좋아요 수 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 42
 *       500:
 *         description: 서버 에러
 */
router.get('/:reviewId/like/count', concertReviewLikeController.getLikeCount);

/**
 * @swagger
 * /concert-review/like/user/count:
 *   get:
 *     summary: 사용자가 좋아요한 리뷰 수 조회
 *     description: 현재 로그인한 사용자가 좋아요한 리뷰 수를 조회합니다.
 *     tags: [ConcertReviewLike]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 사용자 좋아요 수 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 15
 *       401:
 *         description: 로그인 필요
 *       500:
 *         description: 서버 에러
 */
router.get(
  '/like/user/count',
  requireAuth,
  concertReviewLikeController.getUserLikeCount,
);

export default router;
