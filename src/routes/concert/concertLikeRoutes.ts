import express from 'express';
import {
  getLikeStatus,
  addLike,
  removeLike,
  getLikedConcerts,
} from '../../controllers/concert/concertLikeController';
import {
  requireAuth,
  requireAdmin,
} from '../../middlewares/auth/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * /concert/liked:
 *   get:
 *     summary: 사용자가 좋아요한 콘서트 목록 조회
 *     description: 로그인된 사용자가 좋아요한 콘서트 목록을 페이지네이션과 함께 조회합니다.
 *     tags: [Concerts - Like]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 좋아요한 콘서트 목록 조회 성공
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 에러
 */
router.get('/liked', requireAuth, getLikedConcerts);

/**
 * @swagger
 * /concert/like/status/{id}:
 *   get:
 *     summary: 콘서트 좋아요 상태 확인
 *     description: 로그인된 사용자의 특정 콘서트에 대한 좋아요 상태를 확인합니다.
 *     tags: [Concerts - Like]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *         example: concert_1703123456789_abc123
 *     responses:
 *       200:
 *         description: 좋아요 상태 조회 성공
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.get('/like/status/:id', requireAuth, getLikeStatus);

/**
 * @swagger
 * /concert/like/{id}:
 *   post:
 *     summary: 콘서트 좋아요 추가
 *     description: 로그인된 사용자가 특정 콘서트에 좋아요를 추가합니다.
 *     tags: [Concerts - Like]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *         example: concert_1703123456789_abc123
 *     responses:
 *       200:
 *         description: 좋아요 추가 성공
 *       400:
 *         description: 이미 좋아요한 콘서트
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.post('/like/:id', requireAuth, addLike);

/**
 * @swagger
 * /concert/like/{id}:
 *   delete:
 *     summary: 콘서트 좋아요 삭제
 *     description: 로그인된 사용자가 특정 콘서트의 좋아요를 삭제합니다.
 *     tags: [Concerts - Like]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *         example: concert_1703123456789_abc123
 *     responses:
 *       200:
 *         description: 좋아요 삭제 성공
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.delete('/like/:id', requireAuth, removeLike);

export default router;
