import express from 'express';
import { VerificationService } from '../../services/auth/verificationService';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';

export class VerificationController {
  private verificationService: VerificationService;

  constructor() {
    this.verificationService = new VerificationService();
  }

  getVerificationStatus = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const { email, type } = req.body;

    if (!email || !type) {
      return ResponseBuilder.badRequest(
        res,
        '이메일과 인증 유형을 입력해주세요.',
      );
    }

    try {
      const redisKey = `verification:${type}:${email}`;
      const storedCode =
        await this.verificationService.getVerificationCode(redisKey);
      const ttl = await this.verificationService.getTTL(redisKey);

      if (!storedCode || ttl <= 0) {
        return ResponseBuilder.notFound(res, '활성화된 인증 코드가 없습니다.');
      }

      return ResponseBuilder.success(res, '인증 코드가 활성화되어 있습니다.', {
        exists: true,
        timeRemaining: ttl,
        timeRemainingText: `${Math.floor(ttl / 60)}분 ${ttl % 60}초`,
        type: storedCode.type,
        createdAt: storedCode.createdAt,
        hasUserData:
          type === 'email_verification' ? !!storedCode.userData : false,
      });
    } catch (error) {
      logger.error('인증 코드 상태 확인 에러:', error);
      return ResponseBuilder.internalError(res, '인증 코드 상태 확인 실패');
    }
  };

  cancelVerification = async (req: express.Request, res: express.Response) => {
    const { email, type } = req.body;

    if (!email || !type) {
      return ResponseBuilder.badRequest(
        res,
        '이메일과 인증 유형을 입력해주세요.',
      );
    }

    if (!['password_reset', 'email_verification'].includes(type)) {
      return ResponseBuilder.badRequest(res, '올바르지 않은 인증 유형입니다.');
    }

    try {
      const redisKey = `verification:${type}:${email}`;
      const storedCode =
        await this.verificationService.getVerificationCode(redisKey);

      if (!storedCode) {
        return ResponseBuilder.notFound(
          res,
          '취소할 인증 프로세스가 없습니다.',
        );
      }

      await this.verificationService.deleteVerificationCode(redisKey);

      return ResponseBuilder.success(
        res,
        '인증 프로세스가 성공적으로 취소되었습니다.',
        {
          email,
          type,
        },
      );
    } catch (error) {
      logger.error('인증 프로세스 취소 에러:', error);
      return ResponseBuilder.internalError(res, '인증 프로세스 취소 실패');
    }
  };
}
