import { Request, Response } from 'express';
import { GoogleAuthService } from '../../services/auth/googleAuthService.js';
import { AuthService } from '../../services/auth/authService.js';
import { OAuthService } from '../../services/auth/oauthService.js';
import { User } from '../../models/auth/user.js';
import logger from '../../utils/logger/logger.js';
import { env } from '../../config/env/env.js';
import { ErrorCodes } from '../../utils/errors/errorCodes.js';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  InternalServerError,
} from '../../utils/errors/customErrors.js';

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
    const sessionData = authService.createSessionData(user, 'google');
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
      throw new BadRequestError(
        'ID token is required',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    // 2. Google ID 토큰 검증 및 사용자 인증
    const googleAuthService = new GoogleAuthService();
    const user = await googleAuthService.authenticateWithIdToken(idToken);

    if (!user) {
      throw new UnauthorizedError(
        'Invalid Google ID token',
        ErrorCodes.AUTH_INVALID_ID_TOKEN,
      );
    }

    // 3. 세션 생성
    const authService = new AuthService();
    const sessionData = authService.createSessionData(user, 'google');
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
          status: user.status,
          oauthProviders: user.oauthProviders || [], // OAuth 프로바이더 정보
          loginProvider: 'google' as const, // 로그인한 provider
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
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error in Google authentication:', error);
    throw new InternalServerError(
      'Internal server error',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};
