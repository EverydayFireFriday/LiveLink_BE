import express from 'express';
import { AuthValidator } from '../../utils/validation/auth/authValidator';
import logger, { maskIpAddress } from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { maskEmails } from '../../utils/email/emailMask';

// UserService와 AuthService는 필요할 때 지연 로딩
export class AuthController {
  login = async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;
    const ip = req.ip ?? '';

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

    const { redisClient } = await import('../../app');
    const { BruteForceProtectionService } = await import(
      '../../services/security'
    );
    const bruteForceService = new BruteForceProtectionService(redisClient);

    const loginKey = email;

    try {
      if (await bruteForceService.isBlocked(loginKey)) {
        const blockTime = await bruteForceService.getBlockTime(loginKey);
        logger.warn(`[Auth] Blocked login attempt for account: ${loginKey}`);
        return ResponseBuilder.tooManyRequests(
          res,
          `너무 많은 로그인 시도를 하셨습니다. ${Math.ceil(
            blockTime / 60,
          )}분 후에 다시 시도해주세요.`,
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
        logger.warn(
          `[Auth] Failed login attempt #${attempts} for account: ${email} from IP: ${maskedIp} (user not found)`,
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
        logger.warn(
          `[Auth] Failed login attempt #${attempts} for account: ${user.email} from IP: ${maskedIp} (incorrect password)`,
        );
        return ResponseBuilder.unauthorized(
          res,
          '이메일 또는 비밀번호가 일치하지 않습니다.',
        );
      }

      // 로그인 성공 시, 실패 카운터 리셋
      await bruteForceService.reset(loginKey);

      // 마지막 로그인 시간 업데이트
      await userService.updateUser(user._id!.toString(), {
        updatedAt: new Date(),
      });

      // 세션 고정 공격 방지를 위해 세션 재생성
      const sessionData = authService.createSessionData(user);

      req.session.regenerate((err) => {
        if (err) {
          logger.error('세션 재생성 에러:', err);
          return ResponseBuilder.internalError(res, '로그인 실패 (세션 오류)');
        }

        // 재생성된 세션에 사용자 정보 저장
        req.session.user = sessionData;

        return ResponseBuilder.success(res, '로그인 성공', {
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            profileImage: user.profileImage,
          },
          sessionId: req.sessionID,
        });
      });
    } catch (error) {
      logger.error('로그인 에러:', error);
      return ResponseBuilder.internalError(res, '서버 에러로 로그인 실패');
    }
  };

  logout = (req: express.Request, res: express.Response) => {
    const sessionId = req.sessionID;

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

  checkSession = (req: express.Request, res: express.Response) => {
    if (req.session.user) {
      return ResponseBuilder.success(res, '세션 확인 성공', {
        loggedIn: true,
        user: req.session.user,
        sessionId: req.sessionID,
      });
    } else {
      return ResponseBuilder.success(res, '세션 확인 성공', {
        loggedIn: false,
        sessionId: req.sessionID,
      });
    }
  };

  deleteAccount = async (req: express.Request, res: express.Response) => {
    const { password } = req.body;
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
    const { name, birthDate } = req.body;

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
          logger.info(
            `[Auth DEBUG] User ${index + 1}: name="${user.name}", birthDate=${user.birthDate} (type: ${typeof user.birthDate}), birthDate ISO: ${user.birthDate instanceof Date ? user.birthDate.toISOString() : 'NOT A DATE'}`,
          );
        });
      }

      // 생년월일을 Date 객체로 변환 (UTC 기준)
      let birthDateObj: Date;
      if (birthDate.includes('T')) {
        // 이미 ISO 형식인 경우
        birthDateObj = new Date(birthDate);
      } else {
        // YYYY-MM-DD 형식인 경우
        birthDateObj = new Date(birthDate + 'T00:00:00.000Z');
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

      logger.info(
        `[Auth] Email search result: found ${users.length} user(s)`,
      );

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
}
