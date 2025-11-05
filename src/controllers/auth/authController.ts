import express from 'express';
import type { Redis } from 'ioredis';
import { maskEmail, maskEmails } from '../../utils/email/emailMask';
import logger, { maskIpAddress } from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { AuthValidator } from '../../utils/validation/auth/authValidator';

// UserService와 AuthService는 필요할 때 지연 로딩
export class AuthController {
  login = async (req: express.Request, res: express.Response) => {
    const { email, password, force } = req.body as {
      email: string;
      password: string;
      force?: boolean;
    };
    const ip = req.ip ?? '';
    const forceLogin = force === true; // force 파라미터 (기본값: false)

    // 유효성 검증
    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      return ResponseBuilder.badRequest(
        res,
        emailValidation.message || '이메일 형식이 올바르지 않습니다.',
      );
    }

    if (!password) {
      return ResponseBuilder.badRequest(res, '비밀번호를 입력해주세요.');
    }

    const { redisClient } = (await import('../../app')) as {
      redisClient: Redis;
    };
    const { BruteForceProtectionService } = await import(
      '../../services/security'
    );
    const bruteForceService = new BruteForceProtectionService(redisClient);

    const loginKey = email;

    try {
      if (await bruteForceService.isBlocked(loginKey)) {
        const blockTime = await bruteForceService.getBlockTime(loginKey);
        const maskedEmailAddr = maskEmail(email);
        const maskedIp = maskIpAddress(ip);
        const remainingMinutes = Math.ceil(blockTime / 60);
        logger.warn(
          `[Auth] 🚫 BLOCKED login attempt for account: ${maskedEmailAddr} from IP: ${maskedIp} (${remainingMinutes} minutes remaining)`,
        );
        return ResponseBuilder.tooManyRequests(
          res,
          `너무 많은 로그인 시도를 하셨습니다. ${remainingMinutes}분 후에 다시 시도해주세요.`,
        );
      }

      // 지연 로딩으로 서비스 import
      const { AuthService } = await import('../../services/auth/authService');
      const { UserService } = await import('../../services/auth/userService');
      const { UserStatus } = await import('../../models/auth/user');

      const authService = new AuthService();
      const userService = new UserService();

      // 사용자 확인
      const user = await userService.findByEmail(email);
      if (!user) {
        const attempts = await bruteForceService.increment(loginKey);
        const maskedIp = maskIpAddress(ip);
        const maskedEmailAddr = maskEmail(email);
        logger.warn(
          `[Auth] Failed login attempt #${attempts} for account: ${maskedEmailAddr} from IP: ${maskedIp} (user not found)`,
        );
        return ResponseBuilder.unauthorized(
          res,
          '이메일 또는 비밀번호가 일치하지 않습니다.',
        );
      }

      // 사용자 상태 확인
      if (user.status === UserStatus.INACTIVE) {
        return ResponseBuilder.forbidden(
          res,
          '탈퇴한 계정입니다. 계정 복구를 원하시면 고객센터에 문의해주세요.',
        );
      }
      if (user.status === UserStatus.SUSPENDED) {
        return ResponseBuilder.forbidden(
          res,
          '이용이 정지된 계정입니다. 관리자에게 문의해주세요.',
        );
      }
      if (user.status === UserStatus.PENDING_VERIFICATION) {
        return ResponseBuilder.forbidden(
          res,
          '이메일 인증이 필요한 계정입니다.',
        );
      }

      // 비밀번호 확인
      if (!user.passwordHash) {
        return ResponseBuilder.unauthorized(
          res,
          '소셜 로그인 사용자는 비밀번호로 로그인할 수 없습니다.',
        );
      }
      const isPasswordValid = await authService.verifyPassword(
        password,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        const attempts = await bruteForceService.increment(loginKey);
        const maskedIp = maskIpAddress(ip);
        const maskedEmailAddr = maskEmail(user.email);
        logger.warn(
          `[Auth] Failed login attempt #${attempts} for account: ${maskedEmailAddr} from IP: ${maskedIp} (incorrect password)`,
        );
        return ResponseBuilder.unauthorized(
          res,
          '이메일 또는 비밀번호가 일치하지 않습니다.',
        );
      }

      // 로그인 성공 시, 실패 카운터 리셋
      await bruteForceService.reset(loginKey);

      // 기존 세션 확인 (force 파라미터 검증)
      const { UserSessionModel } = await import(
        '../../models/auth/userSession'
      );
      const { DeviceDetector } = await import(
        '../../utils/device/deviceDetector'
      );
      const userSessionModel = new UserSessionModel();
      const deviceInfo = DeviceDetector.detectDevice(req);

      const existingSessions = await userSessionModel.findByUserId(user._id!);
      const samePlatformSessions = existingSessions.filter(
        (session) => session.deviceInfo.platform === deviceInfo.platform,
      );

      // force=false이고 같은 플랫폼의 기존 세션이 있으면 409 Conflict 반환
      if (!forceLogin && samePlatformSessions.length > 0) {
        const existingSession = samePlatformSessions[0];
        const platformName =
          String(deviceInfo.platform) === 'web' ? '웹' : '앱';

        logger.info(
          `[Auth] Login attempt blocked - existing ${deviceInfo.platform} session found for user: ${user.email}`,
        );

        return res.status(409).json({
          success: false,
          message: `이미 다른 기기에서 ${platformName} 로그인이 되어 있습니다.`,
          data: {
            existingSession: {
              deviceName: existingSession.deviceInfo.name,
              platform: existingSession.deviceInfo.platform,
              createdAt: existingSession.createdAt,
              lastActivityAt: existingSession.lastActivityAt,
            },
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 마지막 로그인 시간 업데이트
      await userService.updateUser(user._id!.toString(), {
        updatedAt: new Date(),
      });

      // 세션 고정 공격 방지를 위해 세션 재생성
      const sessionData = authService.createSessionData(user);

      req.session.regenerate(async (err) => {
        if (err) {
          logger.error('세션 재생성 에러:', err);
          return ResponseBuilder.internalError(res, '로그인 실패 (세션 오류)');
        }

        // 재생성된 세션에 사용자 정보 저장
        req.session.user = sessionData;

        // 이전 세션 종료 여부를 저장할 변수 (응답에 포함)
        let previousSessionTerminated = false;
        let terminatedDeviceName = '';
        let terminatedPlatform = '';

        // 디바이스별 세션 쿠키 만료 시간 설정 (UserSession과 동기화)
        // UserSession에 세션 정보 저장 (멀티 디바이스 지원)
        try {
          const { getSessionMaxAge } = await import('../../config/env/env');
          const { redisClient } = (await import('../../app')) as {
            redisClient: Redis;
          };

          // force=true이거나 기존 세션이 없는 경우 세션 생성
          // 같은 플랫폼의 기존 세션 삭제 (웹 1개 + 앱 1개 = 총 2개만 유지)
          if (samePlatformSessions.length > 0) {
            // 이전 세션 정보 저장 (로그인 응답에 포함)
            previousSessionTerminated = true;
            terminatedDeviceName =
              samePlatformSessions[0].deviceInfo.name || '알 수 없는 기기';
            terminatedPlatform = deviceInfo.platform;

            logger.info(
              `[Session] Force login - Deleting ${samePlatformSessions.length} existing ${deviceInfo.platform} session(s) for user: ${user.email}`,
            );


            // MongoDB와 Redis에서 같은 플랫폼의 모든 세션 삭제
            for (const session of samePlatformSessions) {
              // 🔒 STEP 1: Mark session as invalidated FIRST (race condition prevention)
              // This prevents express-session from auto-saving deleted sessions
              if (redisClient.status === 'ready') {
                const invalidationKey = `invalidated:${session.sessionId}`;
                // TTL: 24 hours (longer than max session lifetime)
                await redisClient.setex(invalidationKey, 86400, '1');
                logger.info(
                  `🔒 Session marked as invalidated: ${session.sessionId}`,
                );
              }

              // 🗑️ STEP 2: Delete from MongoDB
              await userSessionModel.deleteSession(session.sessionId);

              // 🗑️ STEP 3: Delete from Redis
              if (redisClient.status === 'ready') {
                const redisKey = `app:sess:${session.sessionId}`;
                const deleteResult = await redisClient.del(redisKey);
                if (deleteResult === 1) {
                  logger.info(`✅ Redis session deleted: ${redisKey}`);
                } else {
                  logger.warn(
                    `⚠️ Redis session not found or already deleted: ${redisKey}`,
                  );
                }
              } else {
                logger.warn(
                  `⚠️ Redis client not ready, skipping Redis deletion for session: ${session.sessionId}`,
                );
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
            user._id!,
            req.sessionID,
            deviceInfo,
            expiresAt,
          );

          const expiresInDays = Math.floor(sessionMaxAge / 1000 / 60 / 60 / 24);
          const expiresInHours = Math.floor(sessionMaxAge / 1000 / 60 / 60);
          const expiryDisplay =
            expiresInDays > 0 ? `${expiresInDays}일` : `${expiresInHours}시간`;

          logger.info(
            `[Session] Created session for user: ${user.email}, platform: ${deviceInfo.platform}, expires in: ${expiryDisplay}`,
          );
        } catch (sessionError) {
          // UserSession 생성 실패는 로그만 남기고 로그인은 계속 진행
          logger.error('[Session] Failed to create UserSession:', sessionError);
        }

        // 로그인 응답 데이터 구성
        const responseData: Record<string, unknown> = {
          user: {
            userId: user._id!.toString(), // ObjectId를 string으로 변환
            email: user.email,
            username: user.username,
            name: user.name,
            birthDate: user.birthDate,
            status: user.status,
            statusReason: user.statusReason,
            profileImage: user.profileImage,
            termsConsents: user.termsConsents || [], // 약관 동의 배열
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            provider: user.provider,
            socialId: user.socialId,
            likedConcerts: user.likedConcerts,
            likedArticles: user.likedArticles,
            fcmToken: user.fcmToken,
            fcmTokenUpdatedAt: user.fcmTokenUpdatedAt,
            notificationPreference: user.notificationPreference,
          },
          sessionId: req.sessionID,
        };

        // 이전 세션이 로그아웃된 경우 경고 메시지 추가
        if (previousSessionTerminated) {
          const platformName = terminatedPlatform === 'web' ? '웹' : '앱';
          responseData.warning = {
            previousSessionTerminated: true,
            message: `이전에 로그인된 ${platformName} 세션이 로그아웃되었습니다.`,
            terminatedDevice: terminatedDeviceName,
          };
        }

        return ResponseBuilder.success(res, '로그인 성공', responseData);
      });
    } catch (error) {
      logger.error('로그인 에러:', error);
      return ResponseBuilder.internalError(res, '서버 에러로 로그인 실패');
    }
  };

  logout = async (req: express.Request, res: express.Response) => {
    const sessionId = req.sessionID;
    const userId = req.session.user?.userId;

    // UserSession에서 해당 세션 삭제
    if (userId) {
      try {
        const { UserSessionModel } = await import(
          '../../models/auth/userSession'
        );
        const userSessionModel = new UserSessionModel();
        await userSessionModel.deleteSession(sessionId);
        logger.info(
          `[Session] Deleted session: ${sessionId} for user: ${userId}`,
        );
      } catch (sessionError) {
        // UserSession 삭제 실패는 로그만 남기고 로그아웃은 계속 진행
        logger.error('[Session] Failed to delete UserSession:', sessionError);
      }
    }

    // Express 세션 삭제
    req.session.destroy((err) => {
      if (err) {
        logger.error('로그아웃 에러:', err);
        return ResponseBuilder.internalError(res, '로그아웃 실패');
      }

      res.clearCookie('connect.sid');
      return ResponseBuilder.success(res, '로그아웃 성공', {
        deletedSessionId: sessionId,
      });
    });
  };

  checkSession = async (req: express.Request, res: express.Response) => {
    if (req.session.user) {
      try {
        // 캐시가 아닌 DB에서 최신 사용자 정보 가져오기 (약관/알림 설정 실시간 반영)
        const { UserService } = await import('../../services/auth/userService');
        const userService = new UserService();
        const userId = req.session.user.userId;

        // DB에서 최신 사용자 정보 조회 (캐시 우회하여 약관/알림 설정 실시간 반영)
        const user = await userService.findById(userId, true);

        if (!user) {
          // 사용자가 삭제되었거나 찾을 수 없는 경우
          return ResponseBuilder.success(res, '세션 확인 성공', {
            loggedIn: false,
            sessionId: req.sessionID,
          });
        }

        // 로그인 API와 동일한 형식으로 사용자 데이터 반환
        return ResponseBuilder.success(res, '세션 확인 성공', {
          loggedIn: true,
          user: {
            userId: user._id!.toString(),
            email: user.email,
            username: user.username,
            name: user.name,
            birthDate: user.birthDate,
            status: user.status,
            statusReason: user.statusReason,
            profileImage: user.profileImage,
            termsConsents: user.termsConsents || [],
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            provider: user.provider,
            socialId: user.socialId,
            likedConcerts: user.likedConcerts,
            likedArticles: user.likedArticles,
            fcmToken: user.fcmToken,
            fcmTokenUpdatedAt: user.fcmTokenUpdatedAt,
            notificationPreference: user.notificationPreference,
          },
          sessionId: req.sessionID,
        });
      } catch (error) {
        logger.error('[Session] Failed to fetch user data:', error);
        // 에러 발생 시 세션 데이터만 반환
        return ResponseBuilder.success(res, '세션 확인 성공', {
          loggedIn: true,
          user: req.session.user,
          sessionId: req.sessionID,
        });
      }
    } else {
      return ResponseBuilder.success(res, '세션 확인 성공', {
        loggedIn: false,
        sessionId: req.sessionID,
      });
    }
  };

  deleteAccount = async (req: express.Request, res: express.Response) => {
    const { password } = req.body as { password?: string };
    const userId = req.session.user?.userId;

    if (!userId) {
      return ResponseBuilder.unauthorized(res, '인증이 필요합니다.');
    }

    try {
      const { AuthService } = await import('../../services/auth/authService');
      const { UserService } = await import('../../services/auth/userService');
      const authService = new AuthService();
      const userService = new UserService();

      const user = await userService.findById(userId);
      if (!user) {
        return ResponseBuilder.notFound(res, '사용자를 찾을 수 없습니다.');
      }

      // 비밀번호가 설정된 사용자(일반 로그인)는 비밀번호 확인 필요
      if (user.passwordHash) {
        if (!password) {
          return ResponseBuilder.badRequest(res, '비밀번호를 입력해주세요.');
        }

        const isPasswordValid = await authService.verifyPassword(
          password,
          user.passwordHash,
        );
        if (!isPasswordValid) {
          logger.warn(
            `[Auth] Failed account deletion attempt for user: ${user.email} (incorrect password)`,
          );
          return ResponseBuilder.unauthorized(
            res,
            '비밀번호가 일치하지 않습니다.',
          );
        }
      }

      // 회원 탈퇴 처리
      const deleted = await userService.deleteUser(userId);
      if (!deleted) {
        return ResponseBuilder.internalError(
          res,
          '회원 탈퇴 처리에 실패했습니다.',
        );
      }

      logger.info(`[Auth] User account deleted: ${user.email}`);

      // 세션 종료
      req.session.destroy((err) => {
        if (err) {
          logger.error('세션 삭제 에러:', err);
        }
        res.clearCookie('connect.sid');
        return ResponseBuilder.success(res, '회원 탈퇴가 완료되었습니다.');
      });
    } catch (error) {
      logger.error('회원 탈퇴 에러:', error);
      return ResponseBuilder.internalError(
        res,
        '서버 에러로 회원 탈퇴에 실패했습니다.',
      );
    }
  };

  // 이메일 찾기 (이름과 생년월일로)
  findEmail = async (req: express.Request, res: express.Response) => {
    const { name, birthDate } = req.body as {
      name?: string;
      birthDate?: string;
    };

    // 유효성 검증
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ResponseBuilder.badRequest(res, '이름을 입력해주세요.');
    }

    if (!birthDate) {
      return ResponseBuilder.badRequest(res, '생년월일을 입력해주세요.');
    }

    try {
      const { UserModel } = await import('../../models/auth/user');
      const userModel = new UserModel();

      // 먼저 이름으로만 검색해서 데이터 확인
      const usersByName = await userModel.userCollection
        .find({ name: name.trim() })
        .toArray();

      logger.info(
        `[Auth DEBUG] Users found by name "${name.trim()}": ${usersByName.length}`,
      );

      if (usersByName.length > 0) {
        usersByName.forEach((user, index) => {
          const userBirthDate = user.birthDate;
          const birthDateStr =
            userBirthDate instanceof Date
              ? userBirthDate.toISOString()
              : 'NOT A DATE';
          logger.info(
            `[Auth DEBUG] User ${index + 1}: name="${user.name}", birthDate=${String(userBirthDate)} (type: ${typeof userBirthDate}), birthDate ISO: ${birthDateStr}`,
          );
        });
      }

      // 생년월일을 Date 객체로 변환 (UTC 기준)
      let birthDateObj: Date;
      if (typeof birthDate === 'string' && birthDate.includes('T')) {
        // 이미 ISO 형식인 경우
        birthDateObj = new Date(birthDate);
      } else {
        // YYYY-MM-DD 형식인 경우
        birthDateObj = new Date(String(birthDate) + 'T00:00:00.000Z');
      }

      if (isNaN(birthDateObj.getTime())) {
        return ResponseBuilder.badRequest(
          res,
          '올바른 생년월일 형식이 아닙니다. (YYYY-MM-DD)',
        );
      }

      logger.info(
        `[Auth] Searching for email with name: ${name}, birthDate: ${birthDateObj.toISOString()}`,
      );

      // 이름과 생년월일로 사용자 찾기
      const users = await userModel.findByNameAndBirthDate(
        name.trim(),
        birthDateObj,
      );

      logger.info(`[Auth] Email search result: found ${users.length} user(s)`);

      if (users.length === 0) {
        return ResponseBuilder.notFound(
          res,
          '일치하는 계정을 찾을 수 없습니다.',
        );
      }

      // 이메일 주소만 추출
      const emails = users.map((user) => user.email);

      // 이메일 마스킹 처리
      const maskedEmails = maskEmails(emails);

      logger.info(
        `[Auth] Email lookup successful for name: ${name}, found ${users.length} account(s)`,
      );

      return ResponseBuilder.success(
        res,
        `일치하는 계정 ${users.length}개를 찾았습니다.`,
        {
          count: users.length,
          emails: maskedEmails,
        },
      );
    } catch (error) {
      logger.error('이메일 찾기 에러:', error);
      return ResponseBuilder.internalError(
        res,
        '서버 에러로 이메일 찾기에 실패했습니다.',
      );
    }
  };

  /**
   * 활성 세션 목록 조회
   * GET /auth/sessions
   */
  getSessions = async (req: express.Request, res: express.Response) => {
    const userId = req.session.user?.userId;

    if (!userId) {
      return ResponseBuilder.unauthorized(res, '인증이 필요합니다.');
    }

    try {
      const { UserSessionModel } = await import(
        '../../models/auth/userSession'
      );
      const userSessionModel = new UserSessionModel();

      // 사용자의 모든 활성 세션 조회
      const sessions = await userSessionModel.findByUserId(userId);

      // 응답 형식으로 변환
      const sessionResponses = userSessionModel.toSessionResponses(
        sessions,
        req.sessionID,
      );

      return ResponseBuilder.success(res, '활성 세션 목록을 가져왔습니다.', {
        totalSessions: sessions.length,
        sessions: sessionResponses,
      });
    } catch (error) {
      logger.error('[Session] Failed to get sessions:', error);
      return ResponseBuilder.internalError(
        res,
        '서버 에러로 세션 목록 조회에 실패했습니다.',
      );
    }
  };

  /**
   * 특정 세션 강제 종료
   * DELETE /auth/sessions/:sessionId
   */
  deleteSessionById = async (req: express.Request, res: express.Response) => {
    const userId = req.session.user?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      return ResponseBuilder.unauthorized(res, '인증이 필요합니다.');
    }

    if (!sessionId) {
      return ResponseBuilder.badRequest(res, '세션 ID가 필요합니다.');
    }

    // 현재 세션은 삭제할 수 없음 (logout 사용해야 함)
    if (sessionId === req.sessionID) {
      return ResponseBuilder.badRequest(
        res,
        '현재 세션은 이 방법으로 삭제할 수 없습니다. /auth/logout을 사용해주세요.',
      );
    }

    try {
      const { UserSessionModel } = await import(
        '../../models/auth/userSession'
      );
      const { redisClient } = (await import('../../app')) as {
        redisClient: Redis;
      };
      const userSessionModel = new UserSessionModel();

      // 해당 세션이 현재 사용자의 것인지 확인
      const session = await userSessionModel.findBySessionId(sessionId);
      if (!session) {
        return ResponseBuilder.notFound(res, '세션을 찾을 수 없습니다.');
      }

      if (session.userId.toString() !== userId) {
        return ResponseBuilder.forbidden(
          res,
          '다른 사용자의 세션을 삭제할 수 없습니다.',
        );
      }

      // UserSession에서 삭제
      await userSessionModel.deleteSession(sessionId);

      // Redis에서도 세션 삭제
      if (redisClient.status === 'ready') {
        const sessionKey = `app:sess:${sessionId}`;
        await redisClient.del(sessionKey);
      }

      logger.info(`[Session] User ${userId} deleted session: ${sessionId}`);

      return ResponseBuilder.success(res, '세션이 종료되었습니다.', {
        deletedSessionId: sessionId,
      });
    } catch (error) {
      logger.error('[Session] Failed to delete session:', error);
      return ResponseBuilder.internalError(
        res,
        '서버 에러로 세션 삭제에 실패했습니다.',
      );
    }
  };

  /**
   * 모든 세션 로그아웃 (현재 세션 제외)
   * DELETE /auth/sessions/all
   */
  deleteAllSessions = async (req: express.Request, res: express.Response) => {
    const userId = req.session.user?.userId;
    const currentSessionId = req.sessionID;

    if (!userId) {
      return ResponseBuilder.unauthorized(res, '인증이 필요합니다.');
    }

    try {
      const { UserSessionModel } = await import(
        '../../models/auth/userSession'
      );
      const { redisClient } = (await import('../../app')) as {
        redisClient: Redis;
      };
      const userSessionModel = new UserSessionModel();

      // 현재 세션을 제외한 모든 활성 세션 조회
      const sessions = await userSessionModel.findByUserId(userId);
      const otherSessions = sessions.filter(
        (session) => session.sessionId !== currentSessionId,
      );

      logger.info(
        `[Session] Found ${sessions.length} total sessions, ${otherSessions.length} to delete (current: ${currentSessionId})`,
      );

      // Redis에서 각 세션 삭제
      if (redisClient.status === 'ready') {
        const deleteResults = await Promise.all(
          otherSessions.map(async (session) => {
            const key = `app:sess:${session.sessionId}`;
            const result = await redisClient.del(key);
            logger.info(
              `[Session] Redis delete key: ${key}, result: ${result} (1=deleted, 0=not found)`,
            );
            return result;
          }),
        );
        logger.info(
          `[Session] Redis deletion results: ${deleteResults.join(', ')}`,
        );
      } else {
        logger.warn(
          '[Session] Redis client is not open, skipping Redis deletion',
        );
      }

      // UserSession에서 모든 세션 삭제 (현재 세션 제외)
      const deletedCount = await userSessionModel.deleteOtherSessions(
        userId,
        currentSessionId,
      );

      logger.info(
        `[Session] User ${userId} deleted ${deletedCount} other sessions from MongoDB`,
      );

      return ResponseBuilder.success(
        res,
        '다른 모든 세션이 로그아웃되었습니다.',
        {
          deletedCount,
          currentSessionId,
        },
      );
    } catch (error) {
      logger.error('[Session] Failed to delete all sessions:', error);
      return ResponseBuilder.internalError(
        res,
        '서버 에러로 세션 삭제에 실패했습니다.',
      );
    }
  };

  /**
   * Get user statistics
   * 사용자 통계 조회
   *
   * @description
   * 로그인한 사용자의 통계 정보를 반환합니다:
   * - upcomingLikedConcertsCount: 좋아요한 콘서트 중 다가오는 콘서트 개수
   * - totalLikedConcertsCount: 전체 좋아요한 콘서트 개수
   */
  getUserStats = async (req: express.Request, res: express.Response) => {
    try {
      // 세션 확인
      const userId = req.session?.user?.userId;
      if (!userId) {
        return ResponseBuilder.unauthorized(res, '로그인이 필요합니다.');
      }

      // 사용자 통계 조회
      const { UserService } = await import('../../services/auth/userService');
      const userService = new UserService();

      const stats = await userService.getUserStats(userId);

      if (!stats) {
        return ResponseBuilder.notFound(res, '사용자를 찾을 수 없습니다.');
      }

      return ResponseBuilder.success(res, '사용자 통계 조회 성공', stats);
    } catch (error) {
      logger.error('[Auth] Failed to get user stats:', error);
      return ResponseBuilder.internalError(
        res,
        '서버 에러로 통계 조회에 실패했습니다.',
      );
    }
  };
}