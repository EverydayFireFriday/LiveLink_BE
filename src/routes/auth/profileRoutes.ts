import express from 'express';
import { ProfileController } from '../../controllers/auth/profileController';
import {
  getMyTermsConsent,
  updateTermsConsent,
} from '../../controllers/terms/termsConsentController';
import {
  requireAuth,
  requireAdmin,
} from '../../middlewares/auth/authMiddleware';
import {
  relaxedLimiter,
  defaultLimiter,
  strictLimiter,
} from '../../middlewares/security/rateLimitMiddleware';

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
router.get(
  '/profile',
  relaxedLimiter,
  requireAuth,
  profileController.getProfile,
);
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
router.put(
  '/profile',
  strictLimiter,
  requireAuth,
  profileController.updateProfile,
);
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
router.put(
  '/username',
  strictLimiter,
  requireAuth,
  profileController.updateUsername,
);

/**
 * @swagger
 * /auth/fcm-token:
 *   put:
 *     summary: FCM 토큰 등록
 *     description: 푸시 알림을 위한 FCM 토큰을 등록합니다.
 *     tags: [Notifications]
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
router.put(
  '/fcm-token',
  defaultLimiter,
  requireAuth,
  profileController.updateFCMToken,
);

// 약관 동의 관련
/**
 * @swagger
 * /auth/terms-consent:
 *   get:
 *     summary: 약관 동의 상태 조회
 *     description: 현재 로그인된 사용자의 약관 동의 상태를 조회합니다.
 *     tags: [Profile]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 약관 동의 상태 조회 성공
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
 *                   example: "약관 동의 상태 조회 성공"
 *                 data:
 *                   type: object
 *                   properties:
 *                     terms:
 *                       type: object
 *                       properties:
 *                         isAgreed:
 *                           type: boolean
 *                           description: 이용약관 동의 여부
 *                         version:
 *                           type: string
 *                           description: 동의한 이용약관 버전
 *                         agreedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 동의 시각
 *                         needsUpdate:
 *                           type: boolean
 *                           description: 약관 업데이트 필요 여부
 *                         currentVersion:
 *                           type: string
 *                           description: 현재 최신 약관 버전
 *                     privacy:
 *                       type: object
 *                       properties:
 *                         isAgreed:
 *                           type: boolean
 *                           description: 개인정보처리방침 동의 여부
 *                         version:
 *                           type: string
 *                           description: 동의한 개인정보처리방침 버전
 *                         agreedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 동의 시각
 *                         needsUpdate:
 *                           type: boolean
 *                           description: 약관 업데이트 필요 여부
 *                         currentVersion:
 *                           type: string
 *                           description: 현재 최신 약관 버전
 *                     marketing:
 *                       type: object
 *                       properties:
 *                         isConsented:
 *                           type: boolean
 *                           description: 마케팅 수신 동의 여부
 *                         consentedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 동의 시각
 *                         currentVersion:
 *                           type: string
 *                           description: 현재 최신 마케팅 약관 버전
 *                     requiresAction:
 *                       type: boolean
 *                       description: 사용자 액션 필요 여부 (약관 재동의)
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.get('/terms-consent', relaxedLimiter, requireAuth, getMyTermsConsent);

/**
 * @swagger
 * /auth/terms-consent:
 *   put:
 *     summary: 약관 재동의 (업데이트)
 *     description: 약관이 변경되었을 때 사용자가 재동의하거나, 선택적 동의를 업데이트합니다.
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
 *               - termsConsents
 *             properties:
 *               termsConsents:
 *                 type: array
 *                 description: 업데이트할 약관 동의 목록
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - isAgreed
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [terms, privacy, marketing]
 *                       description: 약관 타입
 *                     isAgreed:
 *                       type: boolean
 *                       description: 동의 여부 (terms, privacy는 false 불가)
 *                     version:
 *                       type: string
 *                       description: 약관 버전 (선택, 없으면 현재 버전 사용)
 *                 example:
 *                   - type: terms
 *                     isAgreed: true
 *                     version: "1.0"
 *                   - type: privacy
 *                     isAgreed: true
 *                     version: "1.0"
 *                   - type: marketing
 *                     isAgreed: false
 *                     version: "1.0"
 *     responses:
 *       200:
 *         description: 약관 동의 업데이트 성공
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
 *                   example: "약관 동의가 업데이트되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     terms:
 *                       type: object
 *                       properties:
 *                         isAgreed:
 *                           type: boolean
 *                         version:
 *                           type: string
 *                         agreedAt:
 *                           type: string
 *                           format: date-time
 *                     privacy:
 *                       type: object
 *                       properties:
 *                         isAgreed:
 *                           type: boolean
 *                         version:
 *                           type: string
 *                         agreedAt:
 *                           type: string
 *                           format: date-time
 *                     marketing:
 *                       type: object
 *                       properties:
 *                         isConsented:
 *                           type: boolean
 *                         consentedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: 잘못된 요청 (필수 약관 미동의, termsConsents 배열 누락)
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.put('/terms-consent', strictLimiter, requireAuth, updateTermsConsent);

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
router.get(
  '/users',
  strictLimiter,
  requireAdmin,
  profileController.getAllUsers,
);

export default router;
