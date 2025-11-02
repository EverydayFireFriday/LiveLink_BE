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
   * TODO: Apple ID 토큰 검증 구현 필요
   * - Apple의 공개 키를 사용한 JWT 검증
   * - 또는 apple-auth 라이브러리 사용
   */
  verifyIdToken(_idToken: string): Promise<AppleTokenPayload | null> {
    // TODO: Apple ID 토큰 검증 로직 구현
    // 현재는 임시로 null 반환
    logger.warn('Apple ID token verification not implemented yet');
    return Promise.resolve(null);
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
