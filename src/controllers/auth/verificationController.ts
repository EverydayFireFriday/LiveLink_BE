import express from "express";
import { VerificationService } from "../../services/auth/verificationService";
import { AuthValidator } from "../../utils/validation/auth/authValidator";
import logger from "../../utils/logger";


export class VerificationController {
  private verificationService: VerificationService;

  constructor() {
    this.verificationService = new VerificationService();
  }

  getVerificationStatus = async (
    req: express.Request,
    res: express.Response
  ) => {
    const { email, type } = req.body;

    if (!email || !type) {
      res.status(400).json({ message: "이메일과 인증 유형을 입력해주세요." });
      return;
    }

    try {
      const redisKey = `verification:${type}:${email}`;
      const storedCode =
        await this.verificationService.getVerificationCode(redisKey);
      const ttl = await this.verificationService.getTTL(redisKey);

      if (!storedCode || ttl <= 0) {
        res.status(404).json({
          message: "활성화된 인증 코드가 없습니다.",
          exists: false,
        });
        return;
      }

      res.status(200).json({
        message: "인증 코드가 활성화되어 있습니다.",
        exists: true,
        timeRemaining: ttl,
        timeRemainingText: `${Math.floor(ttl / 60)}분 ${ttl % 60}초`,
        type: storedCode.type,
        createdAt: storedCode.createdAt,
        hasUserData:
          type === "email_verification" ? !!storedCode.userData : false,
      });
    } catch (error) {
      logger.error("인증 코드 상태 확인 에러:", error);
      res.status(500).json({ message: "인증 코드 상태 확인 실패" });
    }
  };

  cancelVerification = async (req: express.Request, res: express.Response) => {
    const { email, type } = req.body;

    if (!email || !type) {
      res.status(400).json({ message: "이메일과 인증 유형을 입력해주세요." });
      return;
    }

    if (!["password_reset", "email_verification"].includes(type)) {
      res.status(400).json({ message: "올바르지 않은 인증 유형입니다." });
      return;
    }

    try {
      const redisKey = `verification:${type}:${email}`;
      const storedCode =
        await this.verificationService.getVerificationCode(redisKey);

      if (!storedCode) {
        res.status(404).json({
          message: "취소할 인증 프로세스가 없습니다.",
          exists: false,
        });
        return;
      }

      await this.verificationService.deleteVerificationCode(redisKey);

      res.status(200).json({
        message: "인증 프로세스가 성공적으로 취소되었습니다.",
        email,
        type,
      });
    } catch (error) {
      logger.error("인증 프로세스 취소 에러:", error);
      res.status(500).json({ message: "인증 프로세스 취소 실패" });
    }
  };
}
