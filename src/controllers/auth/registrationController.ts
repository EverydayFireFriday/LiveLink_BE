import express from "express";
import { AuthService } from "../../services/auth/authService";
import { UserService } from "../../services/auth/userService";
import { VerificationService } from "../../services/auth/verificationService";
import { EmailService } from "../../utils/emailService";
import { AuthValidator } from "../../utils/validation/auth/authValidator";
import { UserValidator } from "../../utils/validation/auth/userValidator";
import logger from "../../utils/logger";


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

  /**
   * @swagger
   * /auth/register-request:
   *   post:
   *     summary: 회원가입 이메일 인증 요청
   *     description: 회원가입을 위한 이메일 인증 코드를 전송합니다. 사용자명이 제공되지 않으면 자동으로 생성됩니다.
   *     tags: [Registration]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 사용자 이메일 주소
   *                 example: "user@example.com"
   *               username:
   *                 type: string
   *                 description: 사용자명 (선택사항, 비어있으면 자동 생성)
   *                 example: "내별명"
   *                 minLength: 2
   *                 maxLength: 20
   *               password:
   *                 type: string
   *                 description: 비밀번호
   *                 example: "password123!"
   *                 minLength: 8
   *               profileImage:
   *                 type: string
   *                 description: 프로필 이미지 URL (선택사항)
   *                 example: "https://example.com/profile.jpg"
   *     responses:
   *       200:
   *         description: 인증 코드 전송 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "회원가입 인증 코드가 이메일로 전송되었습니다."
   *                 email:
   *                   type: string
   *                   description: 인증 코드가 전송된 이메일
   *                 username:
   *                   type: string
   *                   description: 최종 확정된 사용자명
   *                 usernameGenerated:
   *                   type: boolean
   *                   description: 사용자명이 자동 생성되었는지 여부
   *                 redisKey:
   *                   type: string
   *                   description: Redis 키 (내부 사용)
   *                 expiresIn:
   *                   type: string
   *                   example: "3분"
   *                   description: 인증 코드 유효 시간
   *       400:
   *         description: 잘못된 요청
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   examples:
   *                     invalid_email:
   *                       value: "올바른 이메일 주소를 입력해주세요."
   *                     invalid_password:
   *                       value: "비밀번호는 8자 이상이어야 합니다."
   *                     email_exists:
   *                       value: "이미 사용 중인 이메일입니다."
   *                     username_exists:
   *                       value: "이미 사용 중인 별명입니다."
   *                 suggestion:
   *                   type: string
   *                   description: 사용자명 중복 시 제안 메시지
   *                   example: "자동 생성을 원하시면 별명을 비워두세요."
   *       429:
   *         description: 요청 제한 초과
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "너무 빈번한 요청입니다. 1분 후에 다시 시도해주세요."
   *                 retryAfter:
   *                   type: number
   *                   example: 60
   *                   description: 재시도 가능한 시간(초)
   *       500:
   *         description: 서버 에러
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   examples:
   *                     email_failed:
   *                       value: "이메일 전송에 실패했습니다. 다시 시도해주세요."
   *                     server_error:
   *                       value: "이메일 전송 실패"
   *                 error:
   *                   type: string
   *                   description: 상세 에러 정보
   */
  registerRequest = async (req: express.Request, res: express.Response) => {
    const { email, username, password, profileImage } = req.body;

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

  /**
   * @swagger
   * /auth/verify-register:
   *   post:
   *     summary: 회원가입 이메일 인증 완료
   *     description: 이메일로 받은 인증 코드를 확인하여 회원가입을 완료합니다.
   *     tags: [Registration]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - verificationCode
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 인증받을 이메일 주소
   *                 example: "user@example.com"
   *               verificationCode:
   *                 type: string
   *                 description: 이메일로 받은 인증 코드
   *                 example: "123456"
   *     responses:
   *       201:
   *         description: 회원가입 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "이메일 인증이 완료되어 회원가입이 성공했습니다!"
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: 새로 생성된 사용자 ID
   *                     email:
   *                       type: string
   *                       description: 사용자 이메일
   *                     username:
   *                       type: string
   *                       description: 사용자명
   *                     profileImage:
   *                       type: string
   *                       description: 프로필 이미지 URL
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                       description: 계정 생성일
   *       400:
   *         description: 잘못된 요청
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   examples:
   *                     missing_fields:
   *                       value: "이메일과 인증 코드를 입력해주세요."
   *                     no_user_data:
   *                       value: "사용자 데이터가 없습니다. 다시 회원가입을 시도해주세요."
   *                     email_exists:
   *                       value: "이미 사용 중인 이메일입니다."
   *       401:
   *         description: 인증 코드 불일치
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "인증 코드가 일치하지 않습니다."
   *       410:
   *         description: 인증 코드 만료
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "인증 코드가 만료되었거나 존재하지 않습니다."
   *       500:
   *         description: 서버 에러
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "서버 에러로 회원가입 실패"
   */
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
      });

      // 인증 코드 삭제
      await this.verificationService.deleteVerificationCode(redisKey);

      // 환영 이메일 전송 (비동기)
      setImmediate(async () => {
        try {
          await this.emailService.sendWelcomeEmail({
            username: newUser.username,
            email: newUser.email,
          });
        } catch (emailError) {
          logger.error("환영 이메일 전송 실패:", emailError);
        }
      });

      res.status(201).json({
        message: "이메일 인증이 완료되어 회원가입이 성공했습니다!",
        user: {
          id: newUser._id,
          email: newUser.email,
          username: newUser.username,
          profileImage: newUser.profileImage,
          createdAt: newUser.createdAt,
        },
      });
    } catch (error: any) {
      logger.error("회원가입 인증 완료 에러:", error);
      res.status(500).json({ message: "서버 에러로 회원가입 실패" });
    }
  };

  /**
   * @swagger
   * /auth/generate-username:
   *   get:
   *     summary: 사용자명 자동 생성
   *     description: 이메일 주소를 기반으로 사용 가능한 사용자명을 자동 생성합니다.
   *     tags: [Registration]
   *     parameters:
   *       - in: query
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *           format: email
   *         description: 기준이 될 이메일 주소
   *         example: "user@example.com"
   *       - in: query
   *         name: base
   *         schema:
   *           type: string
   *         description: 기본값으로 사용할 문자열 (선택사항)
   *         example: "nickname"
   *     responses:
   *       200:
   *         description: 사용자명 생성 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용자명이 성공적으로 생성되었습니다."
   *                 username:
   *                   type: string
   *                   description: 생성된 사용자명
   *                   example: "user123"
   *                 available:
   *                   type: boolean
   *                   example: true
   *                   description: 사용 가능 여부
   *                 generatedFrom:
   *                   type: string
   *                   description: 생성 기준
   *                   examples:
   *                     from_email:
   *                       value: "이메일: user@example.com"
   *                     from_base:
   *                       value: "기본값: nickname"
   *       400:
   *         description: 잘못된 요청
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   examples:
   *                     missing_email:
   *                       value: "이메일을 입력해주세요."
   *                     invalid_email:
   *                       value: "올바른 이메일 주소를 입력해주세요."
   *       500:
   *         description: 서버 에러
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용자명 생성 실패"
   */
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

  /**
   * @swagger
   * /auth/check-username:
   *   post:
   *     summary: 사용자명 중복 확인
   *     description: 입력한 사용자명이 사용 가능한지 확인합니다.
   *     tags: [Registration]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *             properties:
   *               username:
   *                 type: string
   *                 description: 확인할 사용자명
   *                 example: "내별명"
   *                 minLength: 2
   *                 maxLength: 20
   *     responses:
   *       200:
   *         description: 사용 가능한 사용자명
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용 가능한 별명입니다."
   *                 available:
   *                   type: boolean
   *                   example: true
   *       400:
   *         description: 사용자명 유효성 검증 실패 또는 중복
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   examples:
   *                     invalid_format:
   *                       value: "사용자명은 2-20자의 한글, 영문, 숫자만 가능합니다."
   *                     already_taken:
   *                       value: "이미 사용 중인 별명입니다."
   *                 available:
   *                   type: boolean
   *                   example: false
   *       500:
   *         description: 서버 에러
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "별명 중복 확인 실패"
   */
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
