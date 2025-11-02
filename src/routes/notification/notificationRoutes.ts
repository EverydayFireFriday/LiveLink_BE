import express from 'express';
import {
  createScheduledNotification,
  getUserScheduledNotifications,
  getScheduledNotificationById,
  cancelScheduledNotification,
  getNotificationStats,
  bulkCreateScheduledNotifications,
  bulkCancelScheduledNotifications,
} from '../../controllers/notification/notificationController.js';
import {
  getNotificationHistory,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotificationPreferences,
  getNotificationPreferences,
} from '../../controllers/notification/notificationHistoryController.js';
import { requireAuth } from '../../middlewares/auth/authMiddleware.js';
import { defaultLimiter } from '../../middlewares/security/rateLimitMiddleware.js';

const router = express.Router();

// 모든 알림 API에 defaultLimiter 적용 (일반 CRUD)
router.use(defaultLimiter);

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

/**
 * @swagger
 * /notifications/scheduled/bulk:
 *   post:
 *     summary: 예약 알림 일괄 생성
 *     description: |
 *       여러 개의 예약 알림을 한 번에 생성합니다.
 *
 *       **data 필드 사용 시나리오:**
 *       - data 포함: FCM 푸시 알림 클릭 시 특정 동작이 필요한 경우 (예: 특정 화면 이동)
 *       - data 미포함: 단순 알림 표시만 필요한 경우
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
 *               - notifications
 *             properties:
 *               notifications:
 *                 type: array
 *                 description: 생성할 알림 목록
 *                 items:
 *                   type: object
 *                   required:
 *                     - title
 *                     - message
 *                     - scheduledAt
 *                   properties:
 *                     title:
 *                       type: string
 *                       description: 알림 제목
 *                     message:
 *                       type: string
 *                       description: 알림 메시지
 *                     concertId:
 *                       type: string
 *                       description: 공연 ID (선택사항)
 *                     scheduledAt:
 *                       type: string
 *                       format: date-time
 *                       description: 예약 전송 시간
 *                     data:
 *                       type: object
 *                       description: |
 *                         FCM 푸시 알림의 추가 데이터 (선택사항)
 *                         - 알림 클릭 시 앱에서 사용할 커스텀 데이터
 *                         - 예: 특정 화면으로 이동, 추가 정보 표시 등
 *                       additionalProperties:
 *                         type: string
 *           examples:
 *             withData:
 *               summary: data 필드 포함 (알림 클릭 시 동작 정의)
 *               description: FCM data payload를 활용하여 알림 클릭 시 특정 화면으로 이동하거나 추가 동작을 수행해야 하는 경우
 *               value:
 *                 notifications:
 *                   - title: "공연 1시간 전"
 *                     message: "1시간 후 공연이 시작됩니다!"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     scheduledAt: "2025-10-28T10:00:00Z"
 *                     data:
 *                       type: "concert_reminder"
 *                       action: "open_concert_detail"
 *                       screen: "ConcertDetailScreen"
 *                   - title: "공연 30분 전"
 *                     message: "30분 후 공연이 시작됩니다!"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     scheduledAt: "2025-10-28T10:30:00Z"
 *                     data:
 *                       type: "concert_reminder"
 *                       action: "open_concert_detail"
 *                       urgency: "high"
 *                   - title: "공연 10분 전"
 *                     message: "곧 공연이 시작됩니다!"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     scheduledAt: "2025-10-28T10:50:00Z"
 *                     data:
 *                       type: "concert_reminder"
 *                       action: "open_concert_detail"
 *                       urgency: "critical"
 *             withoutData:
 *               summary: data 필드 미포함 (단순 알림만)
 *               description: 단순히 알림 메시지만 표시하면 되는 경우 (추가 동작 불필요)
 *               value:
 *                 notifications:
 *                   - title: "공연 1시간 전"
 *                     message: "1시간 후 공연이 시작됩니다!"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     scheduledAt: "2025-10-28T10:00:00Z"
 *                   - title: "공연 30분 전"
 *                     message: "30분 후 공연이 시작됩니다!"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     scheduledAt: "2025-10-28T10:30:00Z"
 *                   - title: "공연 10분 전"
 *                     message: "곧 공연이 시작됩니다!"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     scheduledAt: "2025-10-28T10:50:00Z"
 *             mixed:
 *               summary: data 필드 혼합 사용
 *               description: 일부 알림은 data 포함, 일부는 미포함 (각 알림별로 필요에 따라 선택)
 *               value:
 *                 notifications:
 *                   - title: "공연 1시간 전"
 *                     message: "1시간 후 공연이 시작됩니다!"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     scheduledAt: "2025-10-28T10:00:00Z"
 *                     data:
 *                       type: "concert_reminder"
 *                       action: "open_concert_detail"
 *                   - title: "공연 30분 전"
 *                     message: "30분 후 공연이 시작됩니다!"
 *                     concertId: "60d5ec49f1b2c8b1f8e4c1a1"
 *                     scheduledAt: "2025-10-28T10:30:00Z"
 *                   - title: "일반 알림"
 *                     message: "단순 알림 메시지입니다"
 *                     scheduledAt: "2025-10-28T11:00:00Z"
 *     responses:
 *       201:
 *         description: 일괄 생성 완료
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
 *                   example: "예약 알림 일괄 생성이 완료되었습니다"
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                       description: 성공적으로 생성된 알림 목록
 *                     failed:
 *                       type: array
 *                       description: 생성 실패한 알림 목록
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           error:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           description: 전체 요청 수
 *                         succeeded:
 *                           type: number
 *                           description: 성공 수
 *                         failed:
 *                           type: number
 *                           description: 실패 수
 *             examples:
 *               withData:
 *                 summary: data 필드 포함된 알림 생성 성공
 *                 value:
 *                   success: true
 *                   message: "예약 알림 일괄 생성이 완료되었습니다"
 *                   data:
 *                     created:
 *                       - _id: "60d5ec49f1b2c8b1f8e4c1a1"
 *                         userId: "60d5ec49f1b2c8b1f8e4c1a2"
 *                         concertId: "60d5ec49f1b2c8b1f8e4c1a3"
 *                         title: "공연 1시간 전"
 *                         message: "1시간 후 공연이 시작됩니다!"
 *                         scheduledAt: "2025-10-28T10:00:00Z"
 *                         status: "pending"
 *                         data:
 *                           type: "concert_reminder"
 *                           action: "open_concert_detail"
 *                           screen: "ConcertDetailScreen"
 *                         createdAt: "2025-10-27T09:00:00Z"
 *                         updatedAt: "2025-10-27T09:00:00Z"
 *                       - _id: "60d5ec49f1b2c8b1f8e4c1b1"
 *                         userId: "60d5ec49f1b2c8b1f8e4c1a2"
 *                         concertId: "60d5ec49f1b2c8b1f8e4c1a3"
 *                         title: "공연 30분 전"
 *                         message: "30분 후 공연이 시작됩니다!"
 *                         scheduledAt: "2025-10-28T10:30:00Z"
 *                         status: "pending"
 *                         data:
 *                           type: "concert_reminder"
 *                           action: "open_concert_detail"
 *                           urgency: "high"
 *                         createdAt: "2025-10-27T09:00:00Z"
 *                         updatedAt: "2025-10-27T09:00:00Z"
 *                     failed: []
 *                     summary:
 *                       total: 2
 *                       succeeded: 2
 *                       failed: 0
 *               withoutData:
 *                 summary: data 필드 없는 알림 생성 성공
 *                 value:
 *                   success: true
 *                   message: "예약 알림 일괄 생성이 완료되었습니다"
 *                   data:
 *                     created:
 *                       - _id: "60d5ec49f1b2c8b1f8e4c1a1"
 *                         userId: "60d5ec49f1b2c8b1f8e4c1a2"
 *                         concertId: "60d5ec49f1b2c8b1f8e4c1a3"
 *                         title: "공연 1시간 전"
 *                         message: "1시간 후 공연이 시작됩니다!"
 *                         scheduledAt: "2025-10-28T10:00:00Z"
 *                         status: "pending"
 *                         createdAt: "2025-10-27T09:00:00Z"
 *                         updatedAt: "2025-10-27T09:00:00Z"
 *                       - _id: "60d5ec49f1b2c8b1f8e4c1b1"
 *                         userId: "60d5ec49f1b2c8b1f8e4c1a2"
 *                         concertId: "60d5ec49f1b2c8b1f8e4c1a3"
 *                         title: "공연 30분 전"
 *                         message: "30분 후 공연이 시작됩니다!"
 *                         scheduledAt: "2025-10-28T10:30:00Z"
 *                         status: "pending"
 *                         createdAt: "2025-10-27T09:00:00Z"
 *                         updatedAt: "2025-10-27T09:00:00Z"
 *                     failed: []
 *                     summary:
 *                       total: 2
 *                       succeeded: 2
 *                       failed: 0
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 */
router.post('/scheduled/bulk', requireAuth, bulkCreateScheduledNotifications);

/**
 * @swagger
 * /notifications/scheduled/bulk:
 *   delete:
 *     summary: 예약 알림 일괄 취소
 *     description: 여러 개의 예약 알림을 한 번에 취소합니다
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
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 description: 취소할 알림 ID 목록
 *                 items:
 *                   type: string
 *           example:
 *             notificationIds:
 *               - "60d5ec49f1b2c8b1f8e4c1a1"
 *               - "60d5ec49f1b2c8b1f8e4c1a2"
 *               - "60d5ec49f1b2c8b1f8e4c1a3"
 *     responses:
 *       200:
 *         description: 일괄 취소 완료
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
 *                   example: "예약 알림 일괄 취소가 완료되었습니다"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cancelled:
 *                       type: array
 *                       description: 성공적으로 취소된 알림 목록
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                     failed:
 *                       type: array
 *                       description: 취소 실패한 알림 목록
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           error:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           description: 전체 요청 수
 *                         succeeded:
 *                           type: number
 *                           description: 성공 수
 *                         failed:
 *                           type: number
 *                           description: 실패 수
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 */
router.delete('/scheduled/bulk', requireAuth, bulkCancelScheduledNotifications);

/**
 * @swagger
 * /notifications/history:
 *   get:
 *     summary: 알림 이력 조회
 *     description: 사용자의 알림 이력을 조회합니다 (티켓 오픈 알림 등)
 *     tags:
 *       - Notifications
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: 읽음 상태 필터 (true=읽음, false=안읽음)
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
 *         description: 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/history', requireAuth, getNotificationHistory);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: 읽지 않은 알림 개수 조회
 *     description: 사용자의 읽지 않은 알림 개수를 조회합니다
 *     tags:
 *       - Notifications
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/unread-count', requireAuth, getUnreadCount);

/**
 * @swagger
 * /notifications/history/{id}/read:
 *   put:
 *     summary: 알림을 읽음으로 표시
 *     description: 특정 알림을 읽음으로 표시합니다
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
 *         description: 읽음 처리 성공
 *       400:
 *         description: 이미 읽은 알림
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 알림을 찾을 수 없음
 */
router.put('/history/:id/read', requireAuth, markNotificationAsRead);

/**
 * @swagger
 * /notifications/history/read-all:
 *   put:
 *     summary: 모든 알림을 읽음으로 표시
 *     description: 사용자의 모든 알림을 읽음으로 표시합니다
 *     tags:
 *       - Notifications
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 모든 알림 읽음 처리 성공
 *       401:
 *         description: 인증 필요
 */
router.put('/history/read-all', requireAuth, markAllNotificationsAsRead);

/**
 * @swagger
 * /notifications/preferences:
 *   get:
 *     summary: 알림 설정 조회
 *     description: 사용자의 알림 설정을 조회합니다
 *     tags:
 *       - Notifications
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/preferences', requireAuth, getNotificationPreferences);

/**
 * @swagger
 * /notifications/preferences:
 *   put:
 *     summary: 알림 설정 업데이트
 *     description: 사용자의 알림 설정을 업데이트합니다
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
 *               - ticketOpenNotification
 *               - notifyBefore
 *             properties:
 *               ticketOpenNotification:
 *                 type: boolean
 *                 description: 티켓 오픈 알림 수신 여부
 *               notifyBefore:
 *                 type: array
 *                 description: 알림 받을 시간 (분 단위, 10/30/60만 가능)
 *                 items:
 *                   type: integer
 *                   enum: [10, 30, 60]
 *           example:
 *             ticketOpenNotification: true
 *             notifyBefore: [10, 30, 60]
 *     responses:
 *       200:
 *         description: 업데이트 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 */
router.put('/preferences', requireAuth, updateNotificationPreferences);

export default router;
