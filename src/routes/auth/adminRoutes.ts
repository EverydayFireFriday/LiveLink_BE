import express from 'express';
import { AdminController } from '../../controllers/auth/adminController';
import {
  requireAdmin,
  checkAdminStatus,
} from '../../middlewares/auth/adminMiddleware';

const router = express.Router();
const adminController = new AdminController();

// 관리자 권한 확인
router.get('/check', checkAdminStatus);

// 사용자 관리
/**
 * @swagger
 * /auth/admin/users:
 *   get:
 *     summary: 전체 사용자 목록 조회 (관리자 전용)
 *     description: 모든 사용자의 목록을 페이지네이션과 함께 조회합니다. 관리자 권한이 필요합니다.
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: 페이지당 사용자 수
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: 건너뛸 사용자 수
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 사용자명 또는 이메일 검색
 *     responses:
 *       200:
 *         description: 사용자 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자 목록 조회 성공"
 *                 totalUsers:
 *                   type: integer
 *                   example: 1250
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 25
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminUserView'
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 관리자 권한 필요
 *       500:
 *         description: 서버 에러
 */
router.get('/users', requireAdmin, adminController.getAllUsers);
/**
 * @swagger
 * /auth/admin/users/{userId}:
 *   get:
 *     summary: 특정 사용자 상세 조회 (관리자 전용)
 *     description: 특정 사용자의 상세 정보를 조회합니다.
 *     tags: [Admin]
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
 *         description: 사용자 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/AdminUserDetail'
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/users/:userId', requireAdmin, adminController.getUserById);
/**
 * @swagger
 * /auth/admin/users/status/{userId}:
 *   patch:
 *     summary: 사용자 상태 변경 (관리자 전용)
 *     description: 사용자 계정을 활성화/비활성화합니다.
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended, deleted]
 *                 example: "suspended"
 *               reason:
 *                 type: string
 *                 example: "스팸 활동 감지"
 *     responses:
 *       200:
 *         description: 사용자 상태 변경 성공
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.patch(
  '/users/status/:userId',
  requireAdmin,
  adminController.updateUserStatus,
);

// 사용자 역할 관리
/**
 * @swagger
 * /auth/admin/users-management:
 *   get:
 *     summary: 사용자 목록 조회 (이메일, 역할 포함) - 관리자 전용
 *     description: 사용자 관리를 위한 목록을 조회합니다. 이메일과 역할 정보를 포함합니다.
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: 페이지당 사용자 수
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: 건너뛸 사용자 수
 *     responses:
 *       200:
 *         description: 사용자 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자 목록 조회 성공"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60d5ec49f1b2c72b8c8e4f1a"
 *                       email:
 *                         type: string
 *                         example: "user@example.com"
 *                       username:
 *                         type: string
 *                         example: "johndoe"
 *                       role:
 *                         type: string
 *                         enum: [user, admin, superadmin]
 *                         example: "user"
 *                       status:
 *                         type: string
 *                         example: "active"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/users-management', requireAdmin, adminController.getUsersForAdmin);

/**
 * @swagger
 * /auth/admin/users/role/{userId}:
 *   patch:
 *     summary: 사용자 역할 변경 (관리자 전용)
 *     description: 특정 사용자의 역할을 변경합니다.
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, superadmin]
 *                 example: "admin"
 *                 description: 변경할 역할
 *     responses:
 *       200:
 *         description: 역할 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자 역할이 변경되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: 올바르지 않은 역할
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.patch(
  '/users/role/:userId',
  requireAdmin,
  adminController.updateUserRole,
);

// 통계 및 대시보드
/**
 * @swagger
 * /auth/admin/stats:
 *   get:
 *     summary: 관리자 대시보드 통계 (관리자 전용)
 *     description: 사용자 통계 및 시스템 현황을 조회합니다.
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 통계 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   $ref: '#/components/schemas/AdminStats'
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/stats', requireAdmin, adminController.getAdminStats);

/**
 * @swagger
 * /auth/admin/stats/cache:
 *   get:
 *     summary: 캐시 메트릭 조회 (관리자 전용)
 *     description: Redis 캐시의 히트율, 응답 시간 등 성능 메트릭을 조회합니다.
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: detailed
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 상세 메트릭 조회 여부 (응답 시간 분석 포함)
 *     responses:
 *       200:
 *         description: 캐시 메트릭 조회 성공
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
 *                   example: "캐시 메트릭 조회 성공"
 *                 data:
 *                   type: object
 *                   properties:
 *                     hits:
 *                       type: integer
 *                       description: 캐시 히트 수
 *                     misses:
 *                       type: integer
 *                       description: 캐시 미스 수
 *                     sets:
 *                       type: integer
 *                       description: 캐시 저장 수
 *                     deletes:
 *                       type: integer
 *                       description: 캐시 삭제 수
 *                     errors:
 *                       type: integer
 *                       description: 에러 발생 수
 *                     totalRequests:
 *                       type: integer
 *                       description: 전체 요청 수
 *                     hitRate:
 *                       type: number
 *                       description: 캐시 히트율 (%)
 *                     avgResponseTime:
 *                       type: number
 *                       description: 평균 응답 시간 (ms)
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 관리자 권한 필요
 *       500:
 *         description: 서버 에러
 */
router.get('/stats/cache', requireAdmin, adminController.getCacheMetrics);

/**
 * @swagger
 * /auth/admin/stats/cache/reset:
 *   post:
 *     summary: 캐시 메트릭 리셋 (관리자 전용)
 *     description: 캐시 메트릭을 초기화합니다.
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 캐시 메트릭 리셋 성공
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 관리자 권한 필요
 *       500:
 *         description: 서버 에러
 */
router.post(
  '/stats/cache/reset',
  requireAdmin,
  adminController.resetCacheMetrics,
);

/**
 * @swagger
 * /auth/admin/stats/daily:
 *   get:
 *     summary: 일일 사용자 통계 조회 (관리자 전용)
 *     description: 특정 날짜의 사용자 활동 통계를 조회합니다. 날짜를 지정하지 않으면 오늘 날짜의 통계를 반환합니다.
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-01-11"
 *         description: 조회할 날짜 (YYYY-MM-DD 형식, 생략 시 오늘 날짜)
 *     responses:
 *       200:
 *         description: 일일 통계 조회 성공
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
 *                   example: "일일 통계 조회 성공"
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2026-01-11"
 *                     stats:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: object
 *                           properties:
 *                             dailyActiveUsers:
 *                               type: integer
 *                               description: 일일 활성 사용자 수 (DAU)
 *                               example: 1523
 *                             newRegistrations:
 *                               type: integer
 *                               description: 일일 신규 가입자 수
 *                               example: 42
 *                         sessions:
 *                           type: object
 *                           properties:
 *                             totalLogins:
 *                               type: integer
 *                               description: 일일 총 로그인 횟수
 *                               example: 2341
 *                         activity:
 *                           type: object
 *                           properties:
 *                             articlesCreated:
 *                               type: integer
 *                               description: 생성된 게시글 수
 *                               example: 187
 *                             commentsCreated:
 *                               type: integer
 *                               description: 생성된 댓글 수
 *                               example: 543
 *                             likesCreated:
 *                               type: integer
 *                               description: 생성된 좋아요 수
 *                               example: 1234
 *                             bookmarksCreated:
 *                               type: integer
 *                               description: 생성된 북마크 수
 *                               example: 321
 *                             reviewsCreated:
 *                               type: integer
 *                               description: 생성된 리뷰 수
 *                               example: 89
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-11T15:30:00.000Z"
 *       400:
 *         description: 잘못된 요청 (날짜 형식 오류, 미래 날짜)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)"
 *                 errorCode:
 *                   type: string
 *       401:
 *         description: 로그인 필요
 *       403:
 *         description: 관리자 권한 필요
 *       500:
 *         description: 서버 에러
 */
router.get('/stats/daily', requireAdmin, adminController.getDailyStats);

export default router;
