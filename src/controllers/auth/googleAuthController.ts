import { Request, Response } from 'express';
import { GoogleAuthService } from '../../services/auth/googleAuthService.js';
import { AuthService } from '../../services/auth/authService.js';
import { OAuthService } from '../../services/auth/oauthService.js';
import { User } from '../../models/auth/user.js';
import logger from '../../utils/logger/logger.js';
import { env } from '../../config/env/env.js';

/**
 * Google OAuth Controller
 * 구글 OAuth 컨트롤러
 */

/**
 * Handle Google OAuth Callback (for Web)
 * 구글 OAuth 콜백 핸들러 (웹용)
 *
 * GET /auth/google/callback
 */
export const handleGoogleCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.redirect(`${env.FRONTEND_URL}/login/error`);
      return;
    }

    // 1. 세션 생성
    const authService = new AuthService();
    const user = req.user as User;
    const sessionData = authService.createSessionData(user);
    req.session.user = sessionData;

    // 2. UserSession 생성 및 관리
    const oauthService = new OAuthService();
    const { redisClient } = (await import('../../app')) as {
      redisClient: { status: string; del: (key: string) => Promise<number> };
    };

    const sessionResult = await oauthService.manageSession({
      req,
      userId: user._id!.toHexString(),
      redisClient,
    });

    // 3. 프론트엔드 홈으로 리디렉션 (이전 세션 경고 포함)
    let redirectUrl = env.FRONTEND_URL;
    if (sessionResult.previousSessionTerminated) {
      const platformName =
        sessionResult.terminatedPlatform === 'web' ? '웹' : '앱';
      const params = new URLSearchParams({
        sessionWarning: 'true',
        message: `이전에 로그인된 ${platformName} 세션이 로그아웃되었습니다.`,
        terminatedDevice: sessionResult.terminatedDeviceName,
      });
      redirectUrl = `${env.FRONTEND_URL}?${params.toString()}`;
    }
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Error in Google OAuth callback:', error);
    res.redirect(`${env.FRONTEND_URL}/login/error`);
  }
};

/**
 * Authenticate with Google ID Token (for Mobile App)
 * 구글 ID 토큰으로 인증 (모바일 앱용)
 *
 * POST /auth/google/app
 */
export const authenticateWithGoogle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { idToken } = req.body;

    // 1. ID 토큰 유효성 검사
    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'ID token is required',
      });
      return;
    }

    // 2. Google ID 토큰 검증 및 사용자 인증
    const googleAuthService = new GoogleAuthService();
    const user = await googleAuthService.authenticateWithIdToken(idToken);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid Google ID token',
      });
      return;
    }

    // 3. 세션 생성
    const authService = new AuthService();
    const sessionData = authService.createSessionData(user);
    req.session.user = sessionData;

    // 4. UserSession 생성 및 관리
    const oauthService = new OAuthService();
    const { redisClient } = (await import('../../app')) as {
      redisClient: { status: string; del: (key: string) => Promise<number> };
    };

    const sessionResult = await oauthService.manageSession({
      req,
      userId: user._id!.toHexString(),
      redisClient,
    });

    // 5. 응답
    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: {
          id: user._id?.toHexString(),
          email: user.email,
          username: user.username,
          profileImage: user.profileImage,
          provider: user.provider,
        },
        session: {
          expiresAt: sessionResult.expiresAt.toISOString(),
        },
        ...(sessionResult.previousSessionTerminated && {
          warning: {
            message: '이전에 로그인된 세션이 로그아웃되었습니다.',
            terminatedDevice: sessionResult.terminatedDeviceName,
          },
        }),
      },
    });
  } catch (error) {
    logger.error('Error in Google authentication:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
