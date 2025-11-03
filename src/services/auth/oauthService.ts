import { Request } from 'express';
import { UserModel, User } from '../../models/auth/user.js';
import { UserSessionModel } from '../../models/auth/userSession.js';
import { DeviceDetector } from '../../utils/device/deviceDetector.js';
import { getSessionMaxAge } from '../../config/env/env.js';
import logger from '../../utils/logger/logger.js';

/**
 * OAuth 공통 서비스
 * - 사용자 찾기/생성 로직
 * - 세션 관리 로직
 */
export class OAuthService {
  private userModel: UserModel;
  private userSessionModel: UserSessionModel;

  constructor() {
    this.userModel = new UserModel();
    this.userSessionModel = new UserSessionModel();
  }

  /**
   * OAuth 프로필 정보로 사용자 찾기 또는 생성
   * 1. socialId로 기존 사용자 찾기
   * 2. 이메일로 기존 사용자 찾기 (다른 방식으로 가입했을 경우)
   * 3. 신규 사용자 생성
   */
  async findOrCreateUser(params: {
    provider: 'google' | 'apple';
    socialId: string;
    email?: string;
    username?: string;
    profileImage?: string;
    emailVerified?: boolean;
  }): Promise<User | null> {
    try {
      const {
        provider,
        socialId,
        email,
        username,
        profileImage,
        emailVerified,
      } = params;

      // 1. 소셜 ID로 기존 사용자 찾기
      let user = await this.userModel.findByProviderAndSocialId(
        provider,
        socialId,
      );

      if (user) {
        logger.info(
          `Existing user found: ${user._id?.toHexString() ?? 'unknown'}`,
        );
        return user;
      }

      // 2. 이메일로 기존 사용자 찾기 (다른 방식으로 가입했을 경우)
      if (email && emailVerified) {
        user = await this.userModel.findByEmail(email);

        if (user) {
          // 소셜 정보 업데이트 후 반환
          const updatedUser = await this.userModel.updateUser(user._id!, {
            provider,
            socialId,
          });
          if (!updatedUser) {
            logger.error(`Failed to link ${provider} account`);
            return null;
          }
          logger.info(
            `Linked ${provider} account to existing user: ${user._id?.toHexString() ?? 'unknown'}`,
          );
          return updatedUser;
        }
      }

      // 3. 신규 사용자 생성
      const newUser: Partial<User> = {
        email,
        username: username || `${provider}_${socialId}`,
        provider,
        socialId,
        profileImage,
        termsConsents: [], // OAuth 사용자는 초기에 약관 동의가 없음 (나중에 동의 필요)
      };

      // username 중복 체크
      const existingUser = await this.userModel.findByUsername(
        newUser.username!,
      );
      if (existingUser) {
        newUser.username = `${newUser.username}_${Date.now()}`;
      }

      const createdUser = await this.userModel.createUser(
        newUser as Omit<User, '_id' | 'createdAt' | 'updatedAt'>,
      );

      logger.info(
        `New user created: ${createdUser._id?.toHexString() ?? 'unknown'}`,
      );
      return createdUser;
    } catch (error) {
      logger.error(`Error in findOrCreateUser (${params.provider}):`, error);
      return null;
    }
  }

  /**
   * 세션 관리
   * - 같은 플랫폼의 기존 세션 삭제
   * - 새 세션 생성
   */
  async manageSession(params: {
    req: Request;
    userId: string;
    redisClient?: {
      status: string;
      del: (key: string) => Promise<number>;
    };
  }): Promise<{
    previousSessionTerminated: boolean;
    terminatedDeviceName: string;
    terminatedPlatform: string;
    expiresAt: Date;
  }> {
    const { req, userId, redisClient } = params;

    let previousSessionTerminated = false;
    let terminatedDeviceName = '';
    let terminatedPlatform = '';

    try {
      const deviceInfo = DeviceDetector.detectDevice(req);

      // 같은 플랫폼의 기존 세션 삭제 (웹 1개 + 앱 1개 = 총 2개만 유지)
      const existingSessions = await this.userSessionModel.findByUserId(userId);
      const samePlatformSessions = existingSessions.filter(
        (session) => session.deviceInfo.platform === deviceInfo.platform,
      );

      if (samePlatformSessions.length > 0) {
        previousSessionTerminated = true;
        terminatedDeviceName =
          samePlatformSessions[0].deviceInfo.name || '알 수 없는 기기';
        terminatedPlatform = deviceInfo.platform;

        // MongoDB와 Redis에서 같은 플랫폼의 모든 세션 삭제
        await Promise.all(
          samePlatformSessions.map(async (session) => {
            // MongoDB 삭제
            await this.userSessionModel.deleteSession(session.sessionId);

            // Redis 삭제
            if (redisClient && redisClient.status === 'ready') {
              const redisKey = `app:sess:${session.sessionId}`;
              const deleteResult = await redisClient.del(redisKey);
              if (deleteResult === 1) {
                logger.info(`Redis session deleted: ${redisKey}`);
              } else {
                logger.warn(`Redis session not found: ${redisKey}`);
              }
            } else if (redisClient) {
              logger.warn(
                `Redis client not ready, session: ${session.sessionId}`,
              );
            }
          }),
        );
      }

      // 플랫폼에 따른 세션 만료 시간 계산 (APP=30일, WEB=1일)
      const sessionMaxAge = getSessionMaxAge(deviceInfo.platform);
      const expiresAt = new Date(Date.now() + sessionMaxAge);

      // Express 세션 쿠키의 maxAge도 플랫폼에 맞게 설정
      req.session.cookie.maxAge = sessionMaxAge;

      // UserSession 생성
      await this.userSessionModel.createSession(
        userId,
        req.sessionID,
        deviceInfo,
        expiresAt,
      );

      return {
        previousSessionTerminated,
        terminatedDeviceName,
        terminatedPlatform,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to manage session:', error);

      // 세션 관리 실패는 로그만 남기고 기본값 반환
      const sessionMaxAge = getSessionMaxAge('web');
      return {
        previousSessionTerminated: false,
        terminatedDeviceName: '',
        terminatedPlatform: '',
        expiresAt: new Date(Date.now() + sessionMaxAge),
      };
    }
  }
}
