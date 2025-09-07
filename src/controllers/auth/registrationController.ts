import express from "express";
import { AuthService } from "../../services/auth/authService";
import { UserService } from "../../services/auth/userService";
import { VerificationService } from "../../services/auth/verificationService";
import { EmailService } from "../../utils/emailService";
import { AuthValidator } from "../../utils/validation/auth/authValidator";
import { UserValidator } from "../../utils/validation/auth/userValidator";
import logger from "../../utils/logger";
import { UserStatus } from "../../models/auth/user";
import { CURRENT_TERMS_VERSION } from "../../config/terms/termsAndConditions";


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

  registerRequest = async (req: express.Request, res: express.Response) => {
    const { email, username, password, profileImage, isTermsAgreed } = req.body;

    // 유효성 검증
    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      res.status(400).json({ message: emailValidation.message });
      return;
    }

    const passwordValidation = AuthValidator.validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({ message: passwordValidation.message });
      return;
    }

    const termsValidation = AuthValidator.validateBoolean(isTermsAgreed, 'isTermsAgreed');
    if (!termsValidation.isValid || !isTermsAgreed) {
      res.status(400).json({ message: "서비스 이용약관에 동의해야 합니다." });
      return;
    }

    try {
      // 스팸 방지 체크
      const hasRecentRequest =
        await this.verificationService.checkRecentRequest(
          email,
          "email_verification"
        );
      if (hasRecentRequest) {
        res.status(429).json({
          message: "너무 빈번한 요청입니다. 1분 후에 다시 시도해주세요.",
          retryAfter: 60,
        });
        return;
      }

      // 이메일 중복 확인
      const existingEmail = await this.userService.findByEmail(email);
      if (existingEmail) {
        res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
        return;
      }

      // 사용자명 처리
      let finalUsername: string;
      if (!username || username.trim() === "") {
        finalUsername = await this.userService.generateUsername(email);
      } else {
        const usernameValidation = UserValidator.validateUsername(username);
        if (!usernameValidation.isValid) {
          res.status(400).json({ message: usernameValidation.message });
          return;
        }

        const existingUsername =
          await this.userService.findByUsername(username);
        if (existingUsername) {
          res.status(400).json({
            message: "이미 사용 중인 별명입니다.",
            suggestion: "자동 생성을 원하시면 별명을 비워두세요.",
          });
          return;
        }

        finalUsername = username;
      }

      // 비밀번호 해시화
      const hashedPassword = await this.authService.hashPassword(password);

      // 인증 코드 생성 및 저장
      const verificationCode = this.authService.generateVerificationCode();
      const userData = {
        username: finalUsername,
        passwordHash: hashedPassword,
        profileImage: profileImage || undefined,
        isTermsAgreed: isTermsAgreed,
        termsVersion: CURRENT_TERMS_VERSION, // 약관 버전 추가
      };

      const redisKey = await this.verificationService.saveVerificationCode(
        "email_verification",
        email,
        verificationCode,
        userData
      );

      // 이메일 전송
      const emailResult = await this.emailService.sendRegistrationVerification({
        email,
        username: finalUsername,
        verificationCode,
        createdAt: new Date().toLocaleString("ko-KR"),
      });

      if (!emailResult.success) {
        await this.verificationService.deleteVerificationCode(redisKey);
        res.status(500).json({
          message: "이메일 전송에 실패했습니다. 다시 시도해주세요.",
          error: emailResult.error,
        });
        return;
      }

      res.status(200).json({
        message: "회원가입 인증 코드가 이메일로 전송되었습니다.",
        email,
        username: finalUsername,
        usernameGenerated: !username || username.trim() === "",
        redisKey,
        expiresIn: "3분",
      });
    } catch (error) {
      logger.error("회원가입 인증 이메일 전송 에러:", error);
      res.status(500).json({ message: "이메일 전송 실패" });
    }
  };

  verifyRegister = async (req: express.Request, res: express.Response) => {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      res.status(400).json({ message: "이메일과 인증 코드를 입력해주세요." });
      return;
    }

    try {
      const redisKey = `verification:email_verification:${email}`;
      const storedData =
        await this.verificationService.getVerificationCode(redisKey);

      if (!storedData) {
        res
          .status(410)
          .json({ message: "인증 코드가 만료되었거나 존재하지 않습니다." });
        return;
      }

      if (storedData.code !== verificationCode) {
        res.status(401).json({ message: "인증 코드가 일치하지 않습니다." });
        return;
      }

      if (!storedData.userData) {
        res.status(400).json({
          message: "사용자 데이터가 없습니다. 다시 회원가입을 시도해주세요.",
        });
        return;
      }

      // 중복 재확인
      const existingEmail = await this.userService.findByEmail(email);
      if (existingEmail) {
        await this.verificationService.deleteVerificationCode(redisKey);
        res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
        return;
      }

      // 실제 사용자 생성
      const newUser = await this.userService.createUser({
        email,
        username: storedData.userData.username,
        passwordHash: storedData.userData.passwordHash,
        profileImage: storedData.userData.profileImage,
        isTermsAgreed: storedData.userData.isTermsAgreed,
        termsVersion: storedData.userData.termsVersion, // 약관 버전 추가
      });

      // 사용자 상태를 'active'로 변경
      const updatedUser = await this.userService.updateUser(
        newUser._id!.toString(),
        {
          status: UserStatus.ACTIVE,
        }
      );

      // 인증 코드 삭제
      await this.verificationService.deleteVerificationCode(redisKey);

      // 환영 이메일 전송 (비동기)
      setImmediate(async () => {
        try {
          await this.emailService.sendWelcomeEmail({
            username: (updatedUser || newUser).username,
            email: (updatedUser || newUser).email,
          });
        } catch (emailError) {
          logger.error("환영 이메일 전송 실패:", emailError);
        }
      });

      res.status(201).json({
        message: "이메일 인증이 완료되어 회원가입이 성공했습니다!",
        user: {
          id: (updatedUser || newUser)._id,
          email: (updatedUser || newUser).email,
          username: (updatedUser || newUser).username,
          profileImage: (updatedUser || newUser).profileImage,
          createdAt: (updatedUser || newUser).createdAt,
        },
      });
    } catch (error: any) {
      logger.error("회원가입 인증 완료 에러:", error);
      res.status(500).json({ message: "서버 에러로 회원가입 실패" });
    }
  };

  generateUsername = async (req: express.Request, res: express.Response) => {
    const { email, base } = req.query;

    if (!email || typeof email !== "string") {
      res.status(400).json({ message: "이메일을 입력해주세요." });
      return;
    }

    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      res.status(400).json({ message: emailValidation.message });
      return;
    }

    try {
      const generatedUsername = await this.userService.generateUsername(
        email,
        base ? String(base) : undefined
      );

      res.status(200).json({
        message: "사용자명이 성공적으로 생성되었습니다.",
        username: generatedUsername,
        available: true,
        generatedFrom: base ? `기본값: ${base}` : `이메일: ${email}`,
      });
    } catch (error) {
      logger.error("사용자명 생성 에러:", error);
      res.status(500).json({ message: "사용자명 생성 실패" });
    }
  };

  checkUsername = async (req: express.Request, res: express.Response) => {
    const { username } = req.body;

    const usernameValidation = UserValidator.validateUsername(username);
    if (!usernameValidation.isValid) {
      res.status(400).json({
        message: usernameValidation.message,
        available: false,
      });
      return;
    }

    try {
      const existingUser = await this.userService.findByUsername(username);

      if (existingUser) {
        res.status(400).json({
          message: "이미 사용 중인 별명입니다.",
          available: false,
        });
      } else {
        res.status(200).json({
          message: "사용 가능한 별명입니다.",
          available: true,
        });
      }
    } catch (error) {
      logger.error("별명 중복 확인 에러:", error);
      res.status(500).json({ message: "별명 중복 확인 실패" });
    }
  };
}
