import express from 'express';
import { AuthValidator } from '../../utils/validation/auth/authValidator';
import logger, { maskIpAddress } from '../../utils/logger/logger';

// UserService와 AuthService는 필요할 때 지연 로딩
export class AuthController {
  login = async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;
    const ip = req.ip ?? '';

    // 유효성 검증
    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ message: emailValidation.message });
    }

    if (!password) {
      return res.status(400).json({ message: '비밀번호를 입력해주세요.' });
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
        return res.status(429).json({
          message: `너무 많은 로그인 시도를 하셨습니다. ${Math.ceil(
            blockTime / 60,
          )}분 후에 다시 시도해주세요.`,
        });
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
        return res
          .status(401)
          .json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
      }

      // 사용자 상태 확인
      if (user.status === UserStatus.INACTIVE) {
        return res.status(403).json({
          message:
            '탈퇴한 계정입니다. 계정 복구를 원하시면 고객센터에 문의해주세요.',
        });
      }
      if (user.status === UserStatus.SUSPENDED) {
        return res.status(403).json({
          message: '이용이 정지된 계정입니다. 관리자에게 문의해주세요.',
        });
      }
      if (user.status === UserStatus.PENDING_VERIFICATION) {
        return res
          .status(403)
          .json({ message: '이메일 인증이 필요한 계정입니다.' });
      }

      // 비밀번호 확인
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
        return res
          .status(401)
          .json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
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
          return res.status(500).json({ message: '로그인 실패 (세션 오류)' });
        }

        // 재생성된 세션에 사용자 정보 저장
        req.session.user = sessionData;

        res.status(200).json({
          message: '로그인 성공',
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
      res.status(500).json({ message: '서버 에러로 로그인 실패' });
    }
  };

  logout = (req: express.Request, res: express.Response) => {
    const sessionId = req.sessionID;

    req.session.destroy((err) => {
      if (err) {
        logger.error('로그아웃 에러:', err);
        res.status(500).json({ message: '로그아웃 실패' });
        return;
      }

      res.clearCookie('connect.sid');
      res.status(200).json({
        message: '로그아웃 성공',
        deletedSessionId: sessionId,
      });
    });
  };

  checkSession = (req: express.Request, res: express.Response) => {
    if (req.session.user) {
      res.status(200).json({
        loggedIn: true,
        user: req.session.user,
        sessionId: req.sessionID,
      });
    } else {
      res.status(200).json({
        loggedIn: false,
        sessionId: req.sessionID,
      });
    }
  };
}
