import { Router } from 'express';
import passport from 'passport';
import { env } from '../../config/env/env';
import { defaultLimiter } from '../../middlewares/security/rateLimitMiddleware';

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
 *     tags: [Auth]
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
router.get('/apple', passport.authenticate('apple'));

router.post(
  '/apple/callback',
  passport.authenticate('apple', {
    failureRedirect: `${env.FRONTEND_URL}/login/error`,
    failureMessage: true,
  }),
  async (req, res) => {
    // 인증 성공 시, 세션에 사용자 정보 저장
    if (req.user) {
      const { AuthService } = await import('../../services/auth/authService');
      const authService = new AuthService();
      const sessionData = authService.createSessionData(req.user as any);
      req.session.user = sessionData;

      // UserSession 생성 (멀티 디바이스 지원)
      try {
        const { UserSessionModel } = await import(
          '../../models/auth/userSession'
        );
        const { DeviceDetector } = await import(
          '../../utils/device/deviceDetector'
        );
        const { getSessionMaxAge } = await import('../../config/env/env');
        const { redisClient } = (await import('../../app')) as any;

        const userSessionModel = new UserSessionModel();
        const deviceInfo = DeviceDetector.detectDevice(req);
        const user = req.user as any;

        // 같은 플랫폼의 기존 세션 삭제 (웹 1개 + 앱 1개 = 총 2개만 유지)
        const existingSessions = await userSessionModel.findByUserId(user._id);
        const samePlatformSessions = existingSessions.filter(
          (session) => session.deviceInfo.platform === deviceInfo.platform,
        );

        if (samePlatformSessions.length > 0) {
          // MongoDB와 Redis에서 같은 플랫폼의 모든 세션 삭제
          for (const session of samePlatformSessions) {
            await userSessionModel.deleteSession(session.sessionId);
            if (redisClient.status === 'ready') {
              await redisClient.del(`app:sess:${session.sessionId}`);
            }
          }
        }

        // 플랫폼에 따른 세션 만료 시간 계산 (APP=30일, WEB=1일)
        const sessionMaxAge = getSessionMaxAge(deviceInfo.platform);
        const expiresAt = new Date(Date.now() + sessionMaxAge);

        // Express 세션 쿠키의 maxAge도 플랫폼에 맞게 설정
        req.session.cookie.maxAge = sessionMaxAge;

        // UserSession 생성
        await userSessionModel.createSession(
          user._id,
          req.sessionID,
          deviceInfo,
          expiresAt,
        );
      } catch (sessionError) {
        // UserSession 생성 실패는 로그만 남기고 로그인은 계속 진행
        console.error('[Session] Failed to create UserSession:', sessionError);
      }
    }
    // 프론트엔드 홈으로 리디렉션
    res.redirect(env.FRONTEND_URL);
  },
);

export default router;
