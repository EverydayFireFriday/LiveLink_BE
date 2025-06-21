import express from "express";
import { VerificationService } from "../../services/auth/verificationService";
import { AuthValidator } from "../../utils/validation/auth/authValidator";

export class VerificationController {
  private verificationService: VerificationService;

  constructor() {
    this.verificationService = new VerificationService();
  }

  /**
   * @swagger
   * /auth/verification/status:
   *   post:
   *     summary: 인증 코드 상태 확인
   *     description: 특정 이메일과 인증 유형에 대한 활성화된 인증 코드의 상태를 확인합니다.
   *     tags: [Verification]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - type
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 확인할 이메일 주소
   *                 example: "user@example.com"
   *               type:
   *                 type: string
   *                 enum: [password_reset, email_verification]
   *                 description: 인증 유형
   *                 example: "email_verification"
   *     responses:
   *       200:
   *         description: 인증 코드가 활성화되어 있음
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "인증 코드가 활성화되어 있습니다."
   *                 exists:
   *                   type: boolean
   *                   example: true
   *                 timeRemaining:
   *                   type: number
   *                   description: 남은 시간(초)
   *                   example: 180
   *                 timeRemainingText:
   *                   type: string
   *                   description: 남은 시간 텍스트
   *                   example: "3분 0초"
   *                 type:
   *                   type: string
   *                   description: 인증 유형
   *                   example: "email_verification"
   *                 createdAt:
   *                   type: string
   *                   format: date-time
   *                   description: 생성 시간
   *                 hasUserData:
   *                   type: boolean
   *                   description: 사용자 데이터 존재 여부 (회원가입 인증인 경우)
   *                   example: true
   *       400:
   *         description: 잘못된 요청
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "이메일과 인증 유형을 입력해주세요."
   *       404:
   *         description: 활성화된 인증 코드 없음
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "활성화된 인증 코드가 없습니다."
   *                 exists:
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
   *                   example: "인증 코드 상태 확인 실패"
   */
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
      console.error("인증 코드 상태 확인 에러:", error);
      res.status(500).json({ message: "인증 코드 상태 확인 실패" });
    }
  };

  /**
   * @swagger
   * /auth/verification/cancel:
   *   post:
   *     summary: 인증 프로세스 취소
   *     description: 진행 중인 인증 프로세스를 취소하고 관련 데이터를 삭제합니다.
   *     tags: [Verification]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - type
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 취소할 이메일 주소
   *                 example: "user@example.com"
   *               type:
   *                 type: string
   *                 enum: [password_reset, email_verification]
   *                 description: 인증 유형
   *                 example: "email_verification"
   *     responses:
   *       200:
   *         description: 인증 프로세스 취소 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "인증 프로세스가 성공적으로 취소되었습니다."
   *                 email:
   *                   type: string
   *                   description: 취소된 이메일
   *                   example: "user@example.com"
   *                 type:
   *                   type: string
   *                   description: 취소된 인증 유형
   *                   example: "email_verification"
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
   *                       value: "이메일과 인증 유형을 입력해주세요."
   *                     invalid_type:
   *                       value: "올바르지 않은 인증 유형입니다."
   *       404:
   *         description: 취소할 인증 프로세스 없음
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "취소할 인증 프로세스가 없습니다."
   *                 exists:
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
   *                   example: "인증 프로세스 취소 실패"
   */
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
      console.error("인증 프로세스 취소 에러:", error);
      res.status(500).json({ message: "인증 프로세스 취소 실패" });
    }
  };
}
