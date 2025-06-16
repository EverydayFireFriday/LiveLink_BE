import express from "express";
import { PasswordService } from "../../services/auth/passwordService";
import { AuthValidator } from "../../validators/auth/authValidator";

export class PasswordController {
  private passwordService: PasswordService;

  constructor() {
    this.passwordService = new PasswordService();
  }

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     summary: 비밀번호 재설정 요청
   *     tags: [Password]
   */
  resetPasswordRequest = async (
    req: express.Request,
    res: express.Response
  ) => {
    const { email } = req.body;

    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      res.status(400).json({ message: emailValidation.message });
      return;
    }

    try {
      const result = await this.passwordService.requestPasswordReset(email);

      if (result.success) {
        res.status(200).json({
          message: result.message,
          ...result.data,
        });
      } else {
        const statusCode = result.message.includes("빈번한")
          ? 429
          : result.message.includes("찾을 수 없습니다")
            ? 404
            : 400;
        res.status(statusCode).json({ message: result.message });
      }
    } catch (error) {
      console.error("비밀번호 재설정 요청 에러:", error);
      res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
  };

  /**
   * @swagger
   * /auth/verify-reset-password:
   *   post:
   *     summary: 비밀번호 재설정 인증 및 새 비밀번호 설정
   *     tags: [Password]
   */
  verifyResetPassword = async (req: express.Request, res: express.Response) => {
    const { email, verificationCode, newPassword } = req.body;

    if (!email || !verificationCode || !newPassword) {
      res.status(400).json({ message: "모든 필드를 입력해주세요." });
      return;
    }

    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      res.status(400).json({ message: emailValidation.message });
      return;
    }

    const codeValidation =
      AuthValidator.validateVerificationCode(verificationCode);
    if (!codeValidation.isValid) {
      res.status(400).json({ message: codeValidation.message });
      return;
    }

    const passwordValidation = AuthValidator.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({ message: passwordValidation.message });
      return;
    }

    try {
      const result = await this.passwordService.verifyAndResetPassword(
        email,
        verificationCode,
        newPassword
      );

      if (result.success) {
        res.status(200).json({ message: result.message });
      } else {
        const statusCode = result.message.includes("만료")
          ? 410
          : result.message.includes("일치하지")
            ? 401
            : 400;
        res.status(statusCode).json({ message: result.message });
      }
    } catch (error) {
      console.error("비밀번호 재설정 에러:", error);
      res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
  };

  /**
   * @swagger
   * /auth/change-password:
   *   put:
   *     summary: 비밀번호 변경 (로그인 상태)
   *     tags: [Password]
   */
  changePassword = async (req: express.Request, res: express.Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res
        .status(400)
        .json({ message: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요." });
      return;
    }

    const passwordValidation = AuthValidator.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({ message: `새 ${passwordValidation.message}` });
      return;
    }

    if (currentPassword === newPassword) {
      res
        .status(400)
        .json({ message: "새 비밀번호는 현재 비밀번호와 달라야 합니다." });
      return;
    }

    try {
      const userId = req.session.user!.userId;
      const result = await this.passwordService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      if (result.success) {
        res.status(200).json({ message: result.message });
      } else {
        const statusCode = result.message.includes("일치하지") ? 401 : 400;
        res.status(statusCode).json({ message: result.message });
      }
    } catch (error) {
      console.error("비밀번호 변경 에러:", error);
      res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
  };
}
