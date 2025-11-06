import appleSignin from 'apple-signin-auth';
import logger from '../../utils/logger/logger.js';
import { User } from '../../models/auth/user.js';
import { OAuthService } from './oauthService.js';

/**
 * Apple ID Token 검증 결과
 */
export interface AppleTokenPayload {
  sub: string; // Apple User ID
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
}

/**
 * Apple OAuth Service for Mobile App
 * 모바일 앱용 애플 OAuth 서비스
 */
export class AppleAuthService {
  private oauthService: OAuthService;

  constructor() {
    this.oauthService = new OAuthService();
  }

  /**
   * Verify Apple ID Token
   * 애플 ID 토큰 검증
   *
   * @description
   * Apple의 공개 키를 사용하여 ID 토큰(JWT)을 검증합니다.
   * - 토큰 서명 검증
   * - 발급자(issuer) 확인: https://appleid.apple.com
   * - 대상(audience) 확인: APPLE_CLIENT_ID와 일치해야 함
   * - 만료 시간 확인
   */
  async verifyIdToken(idToken: string): Promise<AppleTokenPayload | null> {
    try {
      if (!process.env.APPLE_CLIENT_ID) {
        logger.error('APPLE_CLIENT_ID is not configured');
        return null;
      }

      // Apple ID 토큰 검증
      const appleIdTokenPayload = await appleSignin.verifyIdToken(idToken, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false, // 만료 시간 확인
      });

      return {
        sub: appleIdTokenPayload.sub,
        email: appleIdTokenPayload.email,
        email_verified: appleIdTokenPayload.email_verified === 'true',
        is_private_email: appleIdTokenPayload.is_private_email === 'true',
      };
    } catch (error) {
      logger.error('Error verifying Apple ID token:', error);
      return null;
    }
  }

  /**
   * Authenticate user with Apple ID Token
   * 애플 ID 토큰으로 사용자 인증
   */
  async authenticateWithIdToken(idToken: string): Promise<User | null> {
    try {
      // 1. ID 토큰 검증
      const payload = await this.verifyIdToken(idToken);
      if (!payload) {
        logger.error('Invalid Apple ID token');
        return null;
      }

      // 2. OAuthService를 사용하여 사용자 찾기 또는 생성
      const user = await this.oauthService.findOrCreateUser({
        provider: 'apple',
        socialId: payload.sub,
        email: payload.email,
        username: payload.email ? payload.email.split('@')[0] : undefined,
        emailVerified: payload.email_verified,
      });

      return user;
    } catch (error) {
      logger.error('Error authenticating with Apple ID token:', error);
      return null;
    }
  }
}
