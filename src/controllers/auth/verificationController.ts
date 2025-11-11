import express from 'express';
import { VerificationService } from '../../services/auth/verificationService';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../../utils/errors/customErrors';

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
      throw new BadRequestError(
        '이메일과 인증 유형을 입력해주세요.',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    try {
      const redisKey = `verification:${type}:${email}`;
      const storedCode =
        await this.verificationService.getVerificationCode(redisKey);
      const ttl = await this.verificationService.getTTL(redisKey);

      if (!storedCode || ttl <= 0) {
        throw new NotFoundError(
          '활성화된 인증 코드가 없습니다.',
          ErrorCodes.AUTH_VERIFICATION_CODE_EXPIRED,
        );
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
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('인증 코드 상태 확인 에러:', error);
      throw new InternalServerError(
        '인증 코드 상태 확인 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  cancelVerification = async (req: express.Request, res: express.Response) => {
    const { email, type } = req.body;

    if (!email || !type) {
      throw new BadRequestError(
        '이메일과 인증 유형을 입력해주세요.',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    if (!['password_reset', 'email_verification'].includes(type)) {
      throw new BadRequestError(
        '올바르지 않은 인증 유형입니다.',
        ErrorCodes.VAL_INVALID_ENUM,
      );
    }

    try {
      const redisKey = `verification:${type}:${email}`;
      const storedCode =
        await this.verificationService.getVerificationCode(redisKey);

      if (!storedCode) {
        throw new NotFoundError(
          '취소할 인증 프로세스가 없습니다.',
          ErrorCodes.AUTH_VERIFICATION_NOT_FOUND,
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
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('인증 프로세스 취소 에러:', error);
      throw new InternalServerError(
        '인증 프로세스 취소 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };
}
