import express from 'express';
import { AuthService } from '../../services/auth/authService';
import { UserService } from '../../services/auth/userService';
import { VerificationService } from '../../services/auth/verificationService';
import { EmailService } from '../../utils/email/emailService';
import { AuthValidator } from '../../utils/validation/auth/authValidator';
import { UserValidator } from '../../utils/validation/auth/userValidator';
import logger from '../../utils/logger/logger';
import { UserStatus, TermsConsent } from '../../models/auth/user';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  CURRENT_MARKETING_VERSION,
} from '../../config/terms';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import crypto from 'crypto';
import {
  SendVerificationEmailRequest,
  VerifyEmailRequest,
  CompleteRegistrationRequest,
} from '../../types/auth/authTypes';

export class RegistrationController {
  private authService: AuthService;
  private userService: UserService;
  private verificationService: VerificationService;
  private emailService: EmailService;

  constructor() {
    this.authService = new AuthService();
    this.userService = new UserService();
    this.verificationService = new VerificationService();
    this.emailService = new EmailService();
  }

  generateUsername = async (req: express.Request, res: express.Response) => {
    const { email, base } = req.query;

    if (!email || typeof email !== 'string') {
      return ResponseBuilder.badRequest(res, '이메일을 입력해주세요.');
    }

    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      return ResponseBuilder.badRequest(
        res,
        emailValidation.message || '유효성 검사 실패',
      );
    }

    try {
      const baseString = typeof base === 'string' ? base : undefined;
      const generatedUsername = await this.userService.generateUsername(
        email,
        baseString,
      );

      return ResponseBuilder.success(
        res,
        '사용자명이 성공적으로 생성되었습니다.',
        {
          username: generatedUsername,
          available: true,
          generatedFrom: baseString
            ? `기본값: ${baseString}`
            : `이메일: ${email}`,
        },
      );
    } catch (error) {
      logger.error('사용자명 생성 에러:', error);
      return ResponseBuilder.internalError(res, '사용자명 생성 실패');
    }
  };

  checkUsername = async (req: express.Request, res: express.Response) => {
    const { username } = req.body as { username: string };

    const usernameValidation = UserValidator.validateUsername(username);
    if (!usernameValidation.isValid) {
      return ResponseBuilder.badRequest(
        res,
        usernameValidation.message || '별명 형식이 올바르지 않습니다.',
      );
    }

    try {
      const existingUser = await this.userService.findByUsername(username);

      if (existingUser) {
        return ResponseBuilder.conflict(res, '이미 사용 중인 별명입니다.');
      } else {
        return ResponseBuilder.success(res, '사용 가능한 별명입니다.', {
          available: true,
        });
      }
    } catch (error) {
      logger.error('별명 중복 확인 에러:', error);
      return ResponseBuilder.internalError(res, '별명 중복 확인 실패');
    }
  };

  /**
   * 1단계: 이메일 인증 코드 발송
   * 이메일만 받아서 인증 코드를 발송합니다.
   */
  sendVerificationEmail = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const { email } = req.body as SendVerificationEmailRequest;

    // 이메일 유효성 검증
    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      return ResponseBuilder.badRequest(
        res,
        emailValidation.message || '유효하지 않은 이메일 형식입니다.',
      );
    }

    try {
      // 스팸 방지 체크
      const hasRecentRequest =
        await this.verificationService.checkRecentRequest(
          email,
          'email_verification',
        );
      if (hasRecentRequest) {
        return ResponseBuilder.tooManyRequests(
          res,
          '너무 빈번한 요청입니다. 1분 후에 다시 시도해주세요.',
        );
      }

      // 이메일 중복 확인
      const existingEmail = await this.userService.findByEmail(email);
      if (existingEmail) {
        return ResponseBuilder.conflict(res, '이미 사용 중인 이메일입니다.');
      }

      // 인증 코드 생성
      const verificationCode = this.authService.generateVerificationCode();

      // Redis에 인증 코드 저장 (3분 TTL, userData 없이)
      const redisKey = await this.verificationService.saveVerificationCode(
        'email_verification',
        email,
        verificationCode,
      );

      // 이메일 전송
      const emailResult = await this.emailService.sendRegistrationVerification({
        email,
        username: email.split('@')[0], // 임시로 이메일 앞부분 사용
        verificationCode,
        createdAt: new Date().toLocaleString('ko-KR'),
      });

      if (!emailResult.success) {
        await this.verificationService.deleteVerificationCode(redisKey);
        return ResponseBuilder.internalError(
          res,
          '이메일 전송에 실패했습니다. 다시 시도해주세요.',
          String(emailResult.error),
        );
      }

      return ResponseBuilder.success(
        res,
        '인증 코드가 이메일로 전송되었습니다.',
        {
          email,
          expiresIn: '3분',
        },
      );
    } catch (error) {
      logger.error('이메일 인증 코드 전송 에러:', error);
      return ResponseBuilder.internalError(res, '이메일 전송 실패');
    }
  };

  /**
   * 2단계: 이메일 인증 확인
   * 인증 코드를 확인하고, 인증 완료 토큰을 발급합니다.
   */
  verifyEmail = async (req: express.Request, res: express.Response) => {
    const { email, verificationCode } = req.body as VerifyEmailRequest;

    if (!email || !verificationCode) {
      return ResponseBuilder.badRequest(
        res,
        '이메일과 인증 코드를 입력해주세요.',
      );
    }

    try {
      const redisKey = `verification:email_verification:${email}`;
      const storedData =
        await this.verificationService.getVerificationCode(redisKey);

      if (!storedData) {
        return ResponseBuilder.gone(
          res,
          '인증 코드가 만료되었거나 존재하지 않습니다.',
        );
      }

      if (storedData.code !== verificationCode) {
        return ResponseBuilder.unauthorized(
          res,
          '인증 코드가 일치하지 않습니다.',
        );
      }

      // 인증 코드 검증 성공 → 기존 인증 코드 삭제
      await this.verificationService.deleteVerificationCode(redisKey);

      // 인증 완료 토큰 생성 (10분 유효)
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Redis에 인증 완료 토큰 저장 (10분 TTL)
      await this.verificationService.saveEmailVerificationToken(
        verificationToken,
        email,
      );

      return ResponseBuilder.success(res, '이메일 인증이 완료되었습니다.', {
        verificationToken,
        email,
        expiresIn: '10분',
      });
    } catch (error: unknown) {
      logger.error('이메일 인증 확인 에러:', error);
      return ResponseBuilder.internalError(res, '이메일 인증 실패');
    }
  };

  /**
   * 3단계: 회원가입 완료
   * 인증 완료 토큰과 나머지 회원 정보를 받아서 회원가입을 완료합니다.
   */
  completeRegistration = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const {
      verificationToken,
      password,
      name,
      birthDate,
      username,
      profileImage,
      termsConsents,
    } = req.body as CompleteRegistrationRequest;

    // 요청 본문 로그 (민감한 정보는 마스킹)
    logger.info(
      '[Registration] Complete registration request received: ' +
        JSON.stringify({
          hasVerificationToken: !!verificationToken,
          hasPassword: !!password,
          name: name || 'missing',
          birthDate: birthDate || 'missing',
          username: username || 'not provided',
          hasProfileImage: !!profileImage,
          termsConsents: termsConsents || 'missing',
        }),
    );

    // 필수 필드 검증
    if (
      !verificationToken ||
      !password ||
      !name ||
      !birthDate ||
      !termsConsents ||
      !Array.isArray(termsConsents)
    ) {
      const missingFields = [];
      if (!verificationToken) missingFields.push('verificationToken');
      if (!password) missingFields.push('password');
      if (!name) missingFields.push('name');
      if (!birthDate) missingFields.push('birthDate');
      if (!termsConsents) missingFields.push('termsConsents');
      if (termsConsents && !Array.isArray(termsConsents))
        missingFields.push('termsConsents must be array');

      logger.warn(
        '[Registration] Missing required fields: ' +
          JSON.stringify({ missingFields }),
      );
      return ResponseBuilder.badRequest(res, '필수 정보가 누락되었습니다.');
    }

    // 유효성 검증
    const passwordValidation = AuthValidator.validatePassword(password);
    if (!passwordValidation.isValid) {
      logger.warn(
        '[Registration] Password validation failed: ' +
          JSON.stringify({
            message: passwordValidation.message,
          }),
      );
      return ResponseBuilder.badRequest(
        res,
        passwordValidation.message || '유효성 검사 실패',
      );
    }

    const nameValidation = UserValidator.validateName(name);
    if (!nameValidation.isValid) {
      logger.warn(
        '[Registration] Name validation failed: ' +
          JSON.stringify({
            name,
            message: nameValidation.message,
          }),
      );
      return ResponseBuilder.badRequest(
        res,
        nameValidation.message || '이름 형식이 올바르지 않습니다.',
      );
    }

    const birthDateValidation = UserValidator.validateBirthDate(birthDate);
    if (!birthDateValidation.isValid) {
      logger.warn(
        '[Registration] BirthDate validation failed: ' +
          JSON.stringify({
            birthDate,
            message: birthDateValidation.message,
          }),
      );
      return ResponseBuilder.badRequest(
        res,
        birthDateValidation.message || '생년월일 형식이 올바르지 않습니다.',
      );
    }

    // 약관 동의 검증
    const termsConsent = termsConsents.find((c) => c.type === 'terms');
    const privacyConsent = termsConsents.find((c) => c.type === 'privacy');

    if (!termsConsent || !termsConsent.isAgreed) {
      logger.warn('[Registration] Terms consent not agreed');
      return ResponseBuilder.badRequest(
        res,
        '서비스 이용약관에 동의해야 합니다.',
      );
    }

    if (!privacyConsent || !privacyConsent.isAgreed) {
      logger.warn('[Registration] Privacy policy consent not agreed');
      return ResponseBuilder.badRequest(
        res,
        '개인정보처리방침에 동의해야 합니다.',
      );
    }

    try {
      // 인증 완료 토큰 확인
      const tokenData =
        await this.verificationService.getEmailVerificationToken(
          verificationToken,
        );

      if (!tokenData || !tokenData.verified) {
        logger.warn('[Registration] Invalid or expired verification token');
        return ResponseBuilder.unauthorized(
          res,
          '유효하지 않거나 만료된 인증 토큰입니다.',
        );
      }

      const email = tokenData.email;
      logger.info(
        '[Registration] Email from verification token: ' +
          JSON.stringify({ email }),
      );

      // 이메일 중복 재확인 (race condition 방지)
      const existingEmail = await this.userService.findByEmail(email);
      if (existingEmail) {
        await this.verificationService.deleteEmailVerificationToken(
          verificationToken,
        );
        logger.warn(
          '[Registration] Email already in use: ' + JSON.stringify({ email }),
        );
        return ResponseBuilder.conflict(res, '이미 사용 중인 이메일입니다.');
      }

      // 사용자명 처리
      let finalUsername: string;
      if (!username || username.trim() === '') {
        finalUsername = await this.userService.generateUsername(email);
        logger.info(
          '[Registration] Generated username: ' +
            JSON.stringify({ finalUsername }),
        );
      } else {
        const usernameValidation = UserValidator.validateUsername(username);
        if (!usernameValidation.isValid) {
          logger.warn(
            '[Registration] Username validation failed: ' +
              JSON.stringify({
                username,
                message: usernameValidation.message,
              }),
          );
          return ResponseBuilder.badRequest(
            res,
            usernameValidation.message || '별명 형식이 올바르지 않습니다.',
          );
        }

        const existingUsername =
          await this.userService.findByUsername(username);
        if (existingUsername) {
          logger.warn(
            '[Registration] Username already in use: ' +
              JSON.stringify({ username }),
          );
          return ResponseBuilder.conflict(
            res,
            '이미 사용 중인 별명입니다. 자동 생성을 원하시면 별명을 비워두세요.',
          );
        }

        finalUsername = username;
      }

      // 비밀번호 해시화
      const hashedPassword = await this.authService.hashPassword(password);

      // 동의 시각 기록
      const now = new Date();

      // 약관 동의 배열 처리 - 버전 및 동의 시각 추가
      const processedTermsConsents: TermsConsent[] = termsConsents.map((c) => {
        let version = c.version;
        if (!version) {
          // 버전이 없으면 현재 버전 사용
          if (c.type === 'terms') {
            version = CURRENT_TERMS_VERSION;
          } else if (c.type === 'privacy') {
            version = CURRENT_PRIVACY_VERSION;
          } else if (c.type === 'marketing') {
            version = CURRENT_MARKETING_VERSION;
          } else {
            version = '1.0.0'; // 기본값
          }
        }

        return {
          type: c.type,
          isAgreed: c.isAgreed,
          version,
          agreedAt: c.isAgreed ? now : undefined,
        };
      });

      // 실제 사용자 생성
      const newUser = await this.userService.createUser({
        email,
        username: finalUsername,
        passwordHash: hashedPassword,
        name: name.trim(),
        birthDate: new Date(birthDate),
        profileImage: profileImage || undefined,
        termsConsents: processedTermsConsents,
        notificationPreference: {
          ticketOpenNotification: [10, 30, 60, 1440],
          concertStartNotification: [60, 180, 1440],
        },
      });

      // 사용자 상태를 'active'로 변경
      const updatedUser = await this.userService.updateUser(
        newUser._id!.toString(),
        {
          status: UserStatus.ACTIVE,
        },
      );

      // 인증 완료 토큰 삭제
      await this.verificationService.deleteEmailVerificationToken(
        verificationToken,
      );

      logger.info(
        '[Registration] User successfully registered: ' +
          JSON.stringify({
            email,
            username: finalUsername,
            userId: (updatedUser || newUser)._id,
          }),
      );

      // 환영 이메일 전송 (비동기)
      setImmediate(() => {
        void (async () => {
          try {
            await this.emailService.sendWelcomeEmail({
              username: (updatedUser || newUser).username,
              email: (updatedUser || newUser).email,
            });
          } catch (emailError) {
            logger.error('환영 이메일 전송 실패:', emailError);
          }
        })();
      });

      return ResponseBuilder.created(res, '회원가입이 완료되었습니다!', {
        user: {
          id: (updatedUser || newUser)._id,
          email: (updatedUser || newUser).email,
          username: (updatedUser || newUser).username,
          name: (updatedUser || newUser).name,
          birthDate: (updatedUser || newUser).birthDate,
          profileImage: (updatedUser || newUser).profileImage,
          termsConsents: (updatedUser || newUser).termsConsents,
          createdAt: (updatedUser || newUser).createdAt,
        },
      });
    } catch (error: unknown) {
      logger.error(
        '[Registration] Complete registration error: ' +
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }),
      );
      return ResponseBuilder.internalError(res, '서버 에러로 회원가입 실패');
    }
  };
}
