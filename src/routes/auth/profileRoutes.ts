import express from "express";
import { ProfileController } from "../../controllers/auth/profileController";
import { requireAuth, requireAdmin } from "../../middlewares/auth/authMiddleware";

const router = express.Router();
const profileController = new ProfileController();

// 프로필 관련
/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: 프로필 조회
 *     description: 현재 로그인된 사용자의 프로필 정보를 조회합니다.
 *     tags: [Profile]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "프로필 조회 성공"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 사용자 ID
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: 사용자 이메일
 *                     username:
 *                       type: string
 *                       description: 사용자명
 *                     profileImage:
 *                       type: string
 *                       description: 프로필 이미지 URL
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 계정 생성일
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 마지막 업데이트일
 *                 session:
 *                   type: object
 *                   description: 현재 세션 정보
 *                   properties:
 *                     userId:
 *                       type: string
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                     profileImage:
 *                       type: string
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자를 찾을 수 없습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "프로필 조회 실패"
 */
router.get('/profile', requireAuth, profileController.getProfile);
/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: 프로필 업데이트
 *     description: 현재 로그인된 사용자의 프로필 정보를 업데이트합니다.
 *     tags: [Profile]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 description: 새로운 프로필 이미지 URL
 *                 example: "https://example.com/new-profile-image.jpg"
 *     responses:
 *       200:
 *         description: 프로필 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "프로필 업데이트 성공"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 사용자 ID
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: 사용자 이메일
 *                     username:
 *                       type: string
 *                       description: 사용자명
 *                     profileImage:
 *                       type: string
 *                       description: 업데이트된 프로필 이미지 URL
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 업데이트 시간
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자를 찾을 수 없습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "프로필 업데이트 실패"
 */
router.put('/profile', requireAuth, profileController.updateProfile);
/**
 * @swagger
 * /auth/username:
 *   put:
 *     summary: 사용자명 변경
 *     description: 현재 로그인된 사용자의 사용자명을 변경합니다.
 *     tags: [Profile]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newUsername
 *             properties:
 *               newUsername:
 *                 type: string
 *                 description: 새로운 사용자명
 *                 example: "새로운별명"
 *                 minLength: 2
 *                 maxLength: 20
 *     responses:
 *       200:
 *         description: 사용자명 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "별명이 성공적으로 변경되었습니다."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 사용자 ID
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: 사용자 이메일
 *                     username:
 *                       type: string
 *                       description: 변경된 사용자명
 *                     profileImage:
 *                       type: string
 *                       description: 프로필 이미지 URL
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 업데이트 시간
 *                 previousUsername:
 *                   type: string
 *                   description: 이전 사용자명
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     invalid_username:
 *                       value: "사용자명은 2-20자의 한글, 영문, 숫자만 가능합니다."
 *                     same_username:
 *                       value: "현재 별명과 동일합니다."
 *                     duplicate_username:
 *                       value: "이미 사용 중인 별명입니다."
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     user_not_found:
 *                       value: "사용자를 찾을 수 없습니다."
 *                     update_failed:
 *                       value: "사용자 업데이트에 실패했습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "별명 변경 실패"
 */
router.put('/username', requireAuth, profileController.updateUsername);

/**
 * @swagger
 * /auth/fcm-token:
 *   put:
 *     summary: FCM 토큰 등록
 *     description: 푸시 알림을 위한 FCM 토큰을 등록합니다.
 *     tags: [Profile]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging 토큰
 *                 example: "dXJkNGM4ZjY3MzY4NzY4..."
 *     responses:
 *       200:
 *         description: FCM 토큰 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "FCM 토큰이 등록되었습니다."
 *                 fcmTokenRegistered:
 *                   type: boolean
 *                   example: true
 *                 registeredAt:
 *                   type: string
 *                   format: date-time
 *                   description: 토큰 등록 시간
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "FCM 토큰이 필요합니다."
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자를 찾을 수 없습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "FCM 토큰 등록 실패"
 */
router.put('/fcm-token', requireAuth, profileController.updateFCMToken);

// 관리자 전용
/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: 전체 사용자 목록 조회 (관리자용)
 *     description: 전체 사용자 목록을 페이지네이션과 함께 조회합니다. 관리자 권한이 필요합니다.
 *     tags: [Profile]
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
 *         description: 한 페이지당 사용자 수
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: 건너뛸 사용자 수 (오프셋)
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
 *                   type: number
 *                   description: 전체 사용자 수
 *                   example: 150
 *                 currentPage:
 *                   type: number
 *                   description: 현재 페이지 번호
 *                   example: 1
 *                 totalPages:
 *                   type: number
 *                   description: 전체 페이지 수
 *                   example: 3
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 사용자 ID
 *                       email:
 *                         type: string
 *                         format: email
 *                         description: 사용자 이메일
 *                       username:
 *                         type: string
 *                         description: 사용자명
 *                       profileImage:
 *                         type: string
 *                         description: 프로필 이미지 URL
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 계정 생성일
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: 마지막 업데이트일
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자 목록 조회 실패"
 */
router.get('/users', requireAdmin, profileController.getAllUsers);

export default router;
