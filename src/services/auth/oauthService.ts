import { Request } from 'express';
import {
  UserModel,
  User,
  UserStatus,
  OAuthProvider,
} from '../../models/auth/user.js';
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
   *
   * @description
   * 새로운 OAuth 플로우:
   * 1. oauthProviders 배열에서 해당 제공자의 socialId로 기존 사용자 찾기
   * 2. 이메일로 기존 사용자 찾기 (있으면 OAuth 제공자 추가)
   * 3. 신규 사용자 생성 (status: PENDING_REGISTRATION - 가입대기)
   *
   * @param params - OAuth 프로필 정보
   * @returns User | null
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

      // 1. oauthProviders 배열에서 해당 제공자로 기존 사용자 찾기
      let user = await this.userModel.findByOAuthProvider(provider, socialId);

      if (user) {
        logger.info(
          `Existing user found by OAuth provider: ${user._id?.toHexString() ?? 'unknown'} (${provider})`,
        );
        return user;
      }

      // 2. 이메일로 기존 사용자 찾기 (검증된 이메일만)
      if (email && emailVerified) {
        user = await this.userModel.findByEmail(email);

        if (user) {
          // 기존 계정에 OAuth 제공자 추가 (여러 개 가능)
          const oauthProvider: OAuthProvider = {
            provider,
            socialId,
            email,
            linkedAt: new Date(),
          };

          const updatedUser = await this.userModel.addOAuthProvider(
            user._id!,
            oauthProvider,
          );

          if (!updatedUser) {
            logger.error(`Failed to link ${provider} account to existing user`);
            return null;
          }

          logger.info(
            `✅ Linked ${provider} account to existing user: ${user._id?.toHexString() ?? 'unknown'}`,
          );
          return updatedUser;
        }
      }

      // 3. 신규 사용자 생성 (가입대기 상태)
      const generatedUsername = username || `${provider}_${socialId}`;

      // username 중복 체크
      let finalUsername = generatedUsername;
      const existingUser = await this.userModel.findByUsername(finalUsername);
      if (existingUser) {
        finalUsername = `${generatedUsername}_${Date.now()}`;
      }

      const oauthProvider: OAuthProvider = {
        provider,
        socialId,
        email,
        linkedAt: new Date(),
      };

      const newUser: Partial<User> = {
        email,
        username: finalUsername,
        oauthProviders: [oauthProvider],
        profileImage,
        termsConsents: [], // 약관 동의 없음 (나중에 complete-registration에서 동의)
        // name, birthDate는 null (나중에 입력)
      };

      const createdUser = await this.userModel.createUser(
        newUser as Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'status'>,
      );

      // status를 PENDING_REGISTRATION으로 변경
      const updatedUser = await this.userModel.updateUser(createdUser._id!, {
        $set: { status: UserStatus.PENDING_REGISTRATION },
      });

      logger.info(
        `✅ New user created (PENDING_REGISTRATION): ${createdUser._id?.toHexString() ?? 'unknown'}`,
      );
      return updatedUser || createdUser;
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
