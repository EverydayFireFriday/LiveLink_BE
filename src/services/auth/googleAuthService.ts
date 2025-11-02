import { OAuth2Client } from 'google-auth-library';
import logger from '../../utils/logger/logger.js';
import { User } from '../../models/auth/user.js';
import { OAuthService } from './oauthService.js';

/**
 * Google ID Token 검증 결과
 */
export interface GoogleTokenPayload {
  sub: string; // Google User ID
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Google OAuth Service for Mobile App
 * 모바일 앱용 구글 OAuth 서비스
 */
export class GoogleAuthService {
  private client: OAuth2Client;
  private oauthService: OAuthService;

  constructor() {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    this.oauthService = new OAuthService();
  }

  /**
   * Verify Google ID Token
   * 구글 ID 토큰 검증
   */
  async verifyIdToken(idToken: string): Promise<GoogleTokenPayload | null> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        logger.error('Failed to get payload from ID token');
        return null;
      }

      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        name: payload.name,
        picture: payload.picture,
        given_name: payload.given_name,
        family_name: payload.family_name,
      };
    } catch (error) {
      logger.error('Error verifying Google ID token:', error);
      return null;
    }
  }

  /**
   * Authenticate user with Google ID Token
   * 구글 ID 토큰으로 사용자 인증
   */
  async authenticateWithIdToken(idToken: string): Promise<User | null> {
    try {
      // 1. ID 토큰 검증
      const payload = await this.verifyIdToken(idToken);
      if (!payload) {
        logger.error('Invalid Google ID token');
        return null;
      }

      // 2. OAuthService를 사용하여 사용자 찾기 또는 생성
      const user = await this.oauthService.findOrCreateUser({
        provider: 'google',
        socialId: payload.sub,
        email: payload.email,
        username: payload.name,
        profileImage: payload.picture,
        emailVerified: payload.email_verified,
      });

      return user;
    } catch (error) {
      logger.error('Error authenticating with Google ID token:', error);
      return null;
    }
  }
}
