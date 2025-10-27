import express from 'express';
import {
  createScheduledNotification,
  getUserScheduledNotifications,
  getScheduledNotificationById,
  cancelScheduledNotification,
  getNotificationStats,
} from '../../controllers/notification/notificationController.js';
import { requireAuth } from '../../middlewares/auth/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /notifications/scheduled:
 *   post:
 *     summary: 예약 알림 생성
 *     description: 특정 시간에 전송될 알림을 예약합니다
 *     tags:
 *       - Notifications
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
 *               - message
 *               - scheduledAt
 *             properties:
 *               title:
 *                 type: string
 *                 description: 알림 제목
 *                 example: "공연 알림"
 *               message:
 *                 type: string
 *                 description: 알림 메시지
 *                 example: "30분 후 공연이 시작됩니다!"
 *               concertId:
 *                 type: string
 *                 description: 공연 ID (선택사항)
 *                 example: "60d5ec49f1b2c8b1f8e4c1a1"
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: 예약 전송 시간 (ISO 8601 형식)
 *                 example: "2025-10-28T10:00:00Z"
 *               data:
 *                 type: object
 *                 description: |
 *                   FCM 푸시 알림의 추가 데이터 (선택사항)
 *                   - 알림 클릭 시 앱에서 사용할 커스텀 데이터
 *                   - 예: 특정 화면으로 이동, 추가 정보 표시 등
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   type: "concert_reminder"
 *                   action: "open_concert_detail"
 *                   customField: "customValue"
 *           examples:
 *             withData:
 *               summary: data 필드 포함 (알림 클릭 시 특정 동작 필요한 경우)
 *               value:
 *                 title: "공연 알림"
 *                 message: "30분 후 공연이 시작됩니다!"
 *                 concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                 scheduledAt: "2025-10-28T10:00:00Z"
 *                 data:
 *                   type: "concert_reminder"
 *                   action: "open_concert_detail"
 *                   customField: "customValue"
 *             withoutData:
 *               summary: data 필드 없음 (단순 알림만 필요한 경우)
 *               value:
 *                 title: "공연 알림"
 *                 message: "30분 후 공연이 시작됩니다!"
 *                 concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                 scheduledAt: "2025-10-28T10:00:00Z"
 *     responses:
 *       201:
 *         description: 예약 알림 생성 성공
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
 *                   example: "예약 알림이 생성되었습니다"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     userId:
 *                       type: string
 *                     concertId:
 *                       type: string
 *                     title:
 *                       type: string
 *                     message:
 *                       type: string
 *                     scheduledAt:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                       enum: [pending, sent, failed, cancelled]
 *                     data:
 *                       type: object
 *                       description: 있을 수도 있고 없을 수도 있음
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *             examples:
 *               withData:
 *                 summary: data 필드가 있는 경우
 *                 value:
 *                   success: true
 *                   message: "예약 알림이 생성되었습니다"
 *                   data:
 *                     _id: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     userId: "60d5ec49f1b2c8b1f8e4c1a2"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a3"
 *                     title: "공연 알림"
 *                     message: "30분 후 공연이 시작됩니다!"
 *                     scheduledAt: "2025-10-28T10:00:00Z"
 *                     status: "pending"
 *                     data:
 *                       type: "concert_reminder"
 *                       action: "open_concert_detail"
 *                     createdAt: "2025-10-27T09:00:00Z"
 *                     updatedAt: "2025-10-27T09:00:00Z"
 *               withoutData:
 *                 summary: data 필드가 없는 경우
 *                 value:
 *                   success: true
 *                   message: "예약 알림이 생성되었습니다"
 *                   data:
 *                     _id: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     userId: "60d5ec49f1b2c8b1f8e4c1a2"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a3"
 *                     title: "공연 알림"
 *                     message: "30분 후 공연이 시작됩니다!"
 *                     scheduledAt: "2025-10-28T10:00:00Z"
 *                     status: "pending"
 *                     createdAt: "2025-10-27T09:00:00Z"
 *                     updatedAt: "2025-10-27T09:00:00Z"
 *       400:
 *         description: 잘못된 요청 (필수 필드 누락 또는 과거 시간)
 *       401:
 *         description: 인증 필요
 */
router.post('/scheduled', requireAuth, createScheduledNotification);

/**
 * @swagger
 * /notifications/scheduled:
 *   get:
 *     summary: 사용자의 예약 알림 목록 조회
 *     description: 로그인한 사용자의 예약 알림 목록을 조회합니다
 *     tags:
 *       - Notifications
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, failed, cancelled]
 *         description: 알림 상태 필터 (선택사항)
 *     responses:
 *       200:
 *         description: 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/scheduled', requireAuth, getUserScheduledNotifications);

/**
 * @swagger
 * /notifications/scheduled/{id}:
 *   get:
 *     summary: 예약 알림 상세 조회
 *     description: 특정 예약 알림의 상세 정보를 조회합니다
 *     tags:
 *       - Notifications
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 접근 권한 없음
 *       404:
 *         description: 알림을 찾을 수 없음
 */
router.get('/scheduled/:id', requireAuth, getScheduledNotificationById);

/**
 * @swagger
 * /notifications/scheduled/{id}:
 *   delete:
 *     summary: 예약 알림 취소
 *     description: 대기 중인 예약 알림을 취소합니다
 *     tags:
 *       - Notifications
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 취소 성공
 *       400:
 *         description: 취소할 수 없는 상태 (이미 전송됨 등)
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 접근 권한 없음
 *       404:
 *         description: 알림을 찾을 수 없음
 */
router.delete('/scheduled/:id', requireAuth, cancelScheduledNotification);

/**
 * @swagger
 * /notifications/stats:
 *   get:
 *     summary: 알림 통계 조회
 *     description: 사용자의 알림 통계를 조회합니다 (상태별 개수)
 *     tags:
 *       - Notifications
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pending:
 *                   type: number
 *                   description: 대기 중인 알림 수
 *                 sent:
 *                   type: number
 *                   description: 전송 완료된 알림 수
 *                 failed:
 *                   type: number
 *                   description: 실패한 알림 수
 *                 cancelled:
 *                   type: number
 *                   description: 취소된 알림 수
 *                 total:
 *                   type: number
 *                   description: 전체 알림 수
 *       401:
 *         description: 인증 필요
 */
router.get('/stats', requireAuth, getNotificationStats);

export default router;
