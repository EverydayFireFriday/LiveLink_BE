import { Router } from 'express';
import passport from 'passport';
import { env } from '../../config/env/env';
import { defaultLimiter } from '../../middlewares/security/rateLimitMiddleware';
import {
  handleAppleCallback,
  authenticateWithApple,
} from '../../controllers/auth/appleAuthController';

const router = Router();

// 모든 OAuth API에 defaultLimiter 적용
router.use(defaultLimiter);

/**
 * @swagger
 * /auth/apple:
 *   get:
 *     summary: Apple OAuth 로그인 시작
 *     description: |
 *       Apple OAuth 2.0 인증 프로세스를 시작합니다.
 *       이 엔드포인드를 호출하면 사용자는 Apple의 로그인 및 동의 화면으로 리디렉션됩니다.
 *       성공적으로 인증하면 Apple은 설정된 콜백 URL(/auth/apple/callback)로 사용자를 다시 리디렉션합니다.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Apple 인증 페이지로 리디렉션됩니다.
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: Apple OAuth 인증 페이지의 URL.
 *       500:
 *         description: 서버 내부 오류. Apple OAuth 설정이 누락되었거나 Passport 초기화에 실패했습니다.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/apple/callback:
 *   post:
 *     summary: Apple OAuth 콜백 처리
 *     description: |
 *       Apple이 사용자를 인증한 후 리디렉션하는 엔드포인트입니다.
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
 *           - web : 웹 플랫폼 (세션 유지: 1일)
 *           - app : 앱 플랫폼 (세션 유지: 30일)
 *           - 미지정 시: WEB 플랫폼으로 기본 설정
 *         example: "app"
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
router.get('/apple', passport.authenticate('apple'));

router.post(
  '/apple/callback',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  passport.authenticate('apple', {
    failureRedirect: `${env.FRONTEND_URL}/login/error`,
    failureMessage: true,
  }),
  handleAppleCallback,
);

/**
 * @swagger
 * /auth/apple/app:
 *   post:
 *     summary: Apple OAuth 앱 로그인
 *     description: |
 *       모바일 앱용 Apple OAuth 인증 엔드포인트입니다.
 *       앱에서 Apple Sign-In으로 획득한 ID 토큰을 서버로 전송하여 인증합니다.
 *
 *       **인증 플로우:**
 *       1. 앱에서 Apple Sign-In을 사용하여 ID 토큰 획득
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
 *                 description: Apple Sign-In으로 획득한 ID 토큰
 *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
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
 *                   example: "Apple authentication successful"
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
 *                           example: null
 *                         provider:
 *                           type: string
 *                           example: "apple"
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
 *                   example: "Invalid Apple ID token"
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
router.post('/apple/app', authenticateWithApple);

export default router;
