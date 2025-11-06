import { Router } from 'express';
import passport from 'passport';
import { env } from '../../config/env/env';
import { defaultLimiter } from '../../middlewares/security/rateLimitMiddleware';
import {
  handleGoogleCallback,
  authenticateWithGoogle,
} from '../../controllers/auth/googleAuthController';

const router = Router();

// 모든 OAuth API에 defaultLimiter 적용
router.use(defaultLimiter);

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Google OAuth 로그인 시작
 *     description: |
 *       Google OAuth 2.0 인증 프로세스를 시작합니다.
 *       이 엔드포인드를 호출하면 사용자는 Google의 로그인 및 동의 화면으로 리디렉션됩니다.
 *       성공적으로 인증하면 Google은 설정된 콜백 URL(/auth/google/callback)로 사용자를 다시 리디렉션합니다.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Google 인증 페이지로 리디렉션됩니다.
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: Google OAuth 인증 페이지의 URL.
 *       500:
 *         description: 서버 내부 오류. Google OAuth 설정이 누락되었거나 Passport 초기화에 실패했습니다.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'

 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth 콜백 처리
 *     description: |
 *       Google이 사용자를 인증한 후 리디렉션하는 엔드포인트입니다.
 *       **이 엔드포인트는 클라이언트가 직접 호출해서는 안 됩니다.**
 *       인증 코드를 받아 사용자의 세션을 설정하고, 최종적으로 프론트엔드 애플리케이션으로 리디렉션합니다.
 *
 *       **플랫폼별 세션 관리:**
 *       - X-Platform 헤더로 플랫폼을 지정할 수 있습니다 (web: 1일, app: 30일)
 *       - 같은 플랫폼에서 새로 로그인하면 이전 세션이 자동으로 로그아웃됩니다.
 *       - ⚠️ **중요**: 이전 기기에는 로그아웃 알림이 전송되지 않습니다.
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: X-Platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [web, app]
 *           default: web
 *         description: |
 *           로그인 플랫폼 지정 (필수 권장)
 *           - web: 웹 플랫폼 (세션 유지: 1일)
 *           - app: 앱 플랫폼 (세션 유지: 30일)
 *           - 미지정 시: WEB 플랫폼으로 기본 설정
 *         example: "app"
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Google에서 반환된 인증 코드.
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: CSRF 공격을 방지하기 위한 상태 값 (필요 시).
 *     responses:
 *       302:
 *         description: 인증 결과에 따라 프론트엔드의 성공 또는 실패 페이지로 리디렉션됩니다.
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: 리디렉션될 프론트엔드 URL. 성공 시 메인 페이지, 실패 시 로그인 오류 페이지.
 *       401:
 *         description: 인증 실패. Passport에서 인증에 실패했을 때 발생합니다.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 내부 오류. 콜백 처리 중 오류가 발생했습니다.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/google',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
  '/google/callback',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  passport.authenticate('google', {
    failureRedirect: `${env.FRONTEND_URL}/login/error`,
    failureMessage: true,
  }),
  handleGoogleCallback,
);

/**
 * @swagger
 * /auth/google/app:
 *   post:
 *     summary: Google OAuth 앱 로그인
 *     description: |
 *       모바일 앱용 Google OAuth 인증 엔드포인트입니다.
 *       앱에서 Google Sign-In SDK로 획득한 ID 토큰을 서버로 전송하여 인증합니다.
 *
 *       **인증 플로우:**
 *       1. 앱에서 Google Sign-In SDK를 사용하여 ID 토큰 획득
 *       2. 획득한 ID 토큰을 이 API로 전송
 *       3. 서버에서 ID 토큰 검증
 *       4. 세션 생성 및 사용자 정보 반환
 *
 *       **플랫폼별 세션 관리:**
 *       - X-Platform 헤더로 플랫폼을 지정할 수 있습니다 (web: 1일, app: 30일)
 *       - 같은 플랫폼에서 새로 로그인하면 이전 세션이 자동으로 로그아웃됩니다.
 *       - ⚠️ **중요**: 이전 기기에는 로그아웃 알림이 전송되지 않습니다.
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: header
 *         name: X-Platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [web, app]
 *           default: app
 *         description: |
 *           로그인 플랫폼 지정 (필수 권장)
 *           - web: 웹 플랫폼 (세션 유지: 1일)
 *           - app: 앱 플랫폼 (세션 유지: 30일)
 *           - 미지정 시: APP 플랫폼으로 기본 설정
 *         example: "app"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: |
 *                   Google Sign-In SDK로 획득한 ID 토큰
 *                   - iOS: GIDSignIn.sharedInstance.currentUser.authentication.idToken
 *                   - Android: GoogleSignInAccount.idToken
 *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
 *           example:
 *             idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4MmU0NTBhMzVhMjA4MWZhYTFkOWFlMjE4MjgzMDIyMmY5NTRiZWUiLCJ0eXAiOiJKV1QifQ..."
 *     responses:
 *       200:
 *         description: 인증 성공
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
 *                   example: "Google authentication successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "60d5ec49f1b2c8b1f8e4c1a1"
 *                         email:
 *                           type: string
 *                           example: "user@example.com"
 *                         username:
 *                           type: string
 *                           example: "John Doe"
 *                         profileImage:
 *                           type: string
 *                           example: "https://lh3.googleusercontent.com/..."
 *                         status:
 *                           type: string
 *                           example: "active"
 *                     session:
 *                       type: object
 *                       properties:
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-12-02T00:00:00.000Z"
 *                     warning:
 *                       type: object
 *                       description: 이전 세션이 종료된 경우에만 포함됨
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: "이전에 로그인된 세션이 로그아웃되었습니다."
 *                         terminatedDevice:
 *                           type: string
 *                           example: "iPhone 15 Pro"
 *             examples:
 *               newLogin:
 *                 summary: 첫 로그인 (이전 세션 없음)
 *                 value:
 *                   success: true
 *                   message: "Google authentication successful"
 *                   data:
 *                     user:
 *                       id: "60d5ec49f1b2c8b1f8e4c1a1"
 *                       email: "user@example.com"
 *                       username: "John Doe"
 *                       profileImage: "https://lh3.googleusercontent.com/..."
 *                       status: "active"
 *                     session:
 *                       expiresAt: "2025-12-02T00:00:00.000Z"
 *               withWarning:
 *                 summary: 이전 세션 종료 경고 포함
 *                 value:
 *                   success: true
 *                   message: "Google authentication successful"
 *                   data:
 *                     user:
 *                       id: "60d5ec49f1b2c8b1f8e4c1a1"
 *                       email: "user@example.com"
 *                       username: "John Doe"
 *                       profileImage: "https://lh3.googleusercontent.com/..."
 *                       status: "active"
 *                     session:
 *                       expiresAt: "2025-12-02T00:00:00.000Z"
 *                     warning:
 *                       message: "이전에 로그인된 세션이 로그아웃되었습니다."
 *                       terminatedDevice: "iPhone 15 Pro"
 *       400:
 *         description: 잘못된 요청 (ID 토큰 누락)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "ID token is required"
 *       401:
 *         description: 인증 실패 (유효하지 않은 ID 토큰)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid Google ID token"
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post('/google/app', authenticateWithGoogle);

export default router;
