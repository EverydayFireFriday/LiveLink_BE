import { Router } from 'express';
import passport from 'passport';
import { env } from '../../config/env/env';

const router = Router();

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
 *     tags: [Auth]
 *     parameters:
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
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
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
    }
    // 프론트엔드 홈으로 리디렉션
    res.redirect(env.FRONTEND_URL);
  },
);

export default router;
