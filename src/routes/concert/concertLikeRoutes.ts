import express from 'express';
import {
  getLikeStatus,
  addLike,
  removeLike,
  getLikedConcerts,
  getLikedConcertsByMonth,
} from '../../controllers/concert/concertLikeController';
import { requireAuth } from '../../middlewares/auth/authMiddleware';

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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, likes, created, upcoming_soon, ticket_soon]
 *           default: date
 *         description: |
 *           정렬 기준
 *           - date: 날짜순 (공연 날짜 빠른 순)
 *           - likes: 좋아요순 (좋아요 많은 순)
 *           - created: 생성순 (최근 등록순)
 *           - upcoming_soon: 공연 임박순 (공연 날짜가 가장 가까운 순)
 *           - ticket_soon: 예매 임박순 (티켓 오픈 날짜가 가장 가까운 순)
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
 * /concert/liked/monthly:
 *   get:
 *     summary: 특정 월에 좋아요한 콘서트 목록 조회
 *     description: |
 *       로그인된 사용자가 좋아요한 콘서트 중 특정 월에 공연이 있는 콘서트 목록을 조회합니다.
 *       해당 월에 공연 날짜가 포함된 좋아요한 콘서트만 반환됩니다.
 *     tags: [Concerts - Like]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: 조회할 년도
 *         example: 2025
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: 조회할 월 (1-12)
 *         example: 10
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, likes, created, upcoming_soon, ticket_soon]
 *           default: date
 *         description: |
 *           정렬 기준
 *           - date: 날짜순 (공연 날짜 빠른 순)
 *           - likes: 좋아요순 (좋아요 많은 순)
 *           - created: 생성순 (최근 등록순)
 *           - upcoming_soon: 공연 임박순 (공연 날짜가 가장 가까운 순)
 *           - ticket_soon: 예매 임박순 (티켓 오픈 날짜가 가장 가까운 순)
 *     responses:
 *       200:
 *         description: 월별 좋아요한 콘서트 목록 조회 성공
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
 *                   example: "2025년 10월 좋아요한 콘서트 목록 조회 성공"
 *                 data:
 *                   type: object
 *                   properties:
 *                     concerts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 2
 *                         totalConcerts:
 *                           type: integer
 *                           example: 25
 *                         limit:
 *                           type: integer
 *                           example: 20
 *       400:
 *         description: 잘못된 요청 (필수 파라미터 누락 또는 잘못된 월)
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 에러
 */
router.get('/liked/monthly', requireAuth, getLikedConcertsByMonth);

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
