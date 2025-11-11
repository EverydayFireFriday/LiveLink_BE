import express from 'express';
import { PasswordService } from '../../services/auth/passwordService';
import { AuthValidator } from '../../utils/validation/auth/authValidator';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  TooManyRequestsError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export class PasswordController {
  private passwordService: PasswordService;

  constructor() {
    this.passwordService = new PasswordService();
  }

  resetPasswordRequest = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const { email } = req.body;

    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new BadRequestError(
        emailValidation.message || '유효성 검사 실패',
        ErrorCodes.AUTH_INVALID_EMAIL,
      );
    }

    try {
      const result = await this.passwordService.requestPasswordReset(email);

      if (result.success) {
        return ResponseBuilder.success(res, result.message, result.data);
      } else {
        if (result.message.includes('빈번한')) {
          throw new TooManyRequestsError(
            result.message,
            ErrorCodes.SYS_RATE_LIMIT_EXCEEDED,
          );
        } else if (result.message.includes('찾을 수 없습니다')) {
          throw new NotFoundError(
            result.message,
            ErrorCodes.AUTH_USER_NOT_FOUND,
          );
        } else {
          throw new BadRequestError(
            result.message,
            ErrorCodes.VAL_INVALID_INPUT,
          );
        }
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('비밀번호 재설정 요청 에러:', error);
      throw new InternalServerError(
        '서버 에러가 발생했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  // 1단계: 인증 코드 검증
  verifyResetCode = async (req: express.Request, res: express.Response) => {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      throw new BadRequestError(
        '이메일과 인증 코드를 입력해주세요.',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new BadRequestError(
        emailValidation.message || '유효성 검사 실패',
        ErrorCodes.AUTH_INVALID_EMAIL,
      );
    }

    const codeValidation =
      AuthValidator.validateVerificationCode(verificationCode);
    if (!codeValidation.isValid) {
      throw new BadRequestError(
        codeValidation.message || '유효성 검사 실패',
        ErrorCodes.VAL_INVALID_FORMAT,
      );
    }

    try {
      const result = await this.passwordService.verifyResetCode(
        email,
        verificationCode,
      );

      if (result.success) {
        return ResponseBuilder.success(res, result.message, result.data);
      } else {
        if (result.message.includes('만료')) {
          throw new UnauthorizedError(
            result.message,
            ErrorCodes.AUTH_VERIFICATION_CODE_EXPIRED,
          );
        } else if (result.message.includes('일치하지')) {
          throw new UnauthorizedError(
            result.message,
            ErrorCodes.AUTH_INVALID_VERIFICATION_CODE,
          );
        } else {
          throw new BadRequestError(
            result.message,
            ErrorCodes.VAL_INVALID_INPUT,
          );
        }
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('인증 코드 검증 에러:', error);
      throw new InternalServerError(
        '서버 에러가 발생했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  // 2단계: 새 비밀번호 설정
  resetPasswordWithToken = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      throw new BadRequestError(
        '모든 필드를 입력해주세요.',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new BadRequestError(
        emailValidation.message || '유효성 검사 실패',
        ErrorCodes.AUTH_INVALID_EMAIL,
      );
    }

    const passwordValidation = AuthValidator.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestError(
        passwordValidation.message || '유효성 검사 실패',
        ErrorCodes.AUTH_INVALID_PASSWORD,
      );
    }

    try {
      const result = await this.passwordService.resetPasswordWithToken(
        email,
        resetToken,
        newPassword,
      );

      if (result.success) {
        return ResponseBuilder.success(res, result.message);
      } else {
        if (result.message.includes('만료')) {
          throw new UnauthorizedError(
            result.message,
            ErrorCodes.AUTH_TOKEN_EXPIRED,
          );
        } else if (result.message.includes('유효하지')) {
          throw new UnauthorizedError(
            result.message,
            ErrorCodes.AUTH_INVALID_TOKEN,
          );
        } else {
          throw new BadRequestError(
            result.message,
            ErrorCodes.VAL_INVALID_INPUT,
          );
        }
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('비밀번호 재설정 에러:', error);
      throw new InternalServerError(
        '서버 에러가 발생했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  changePassword = async (req: express.Request, res: express.Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError(
        '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    const passwordValidation = AuthValidator.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestError(
        `새 ${passwordValidation.message || '유효성 검사 실패'}`,
        ErrorCodes.AUTH_INVALID_PASSWORD,
      );
    }

    if (currentPassword === newPassword) {
      throw new BadRequestError(
        '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
        ErrorCodes.AUTH_PASSWORD_MISMATCH,
      );
    }

    try {
      const userId = req.session.user!.userId;
      const result = await this.passwordService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      if (result.success) {
        return ResponseBuilder.success(res, result.message);
      } else {
        if (result.message.includes('일치하지')) {
          throw new UnauthorizedError(
            result.message,
            ErrorCodes.AUTH_INVALID_PASSWORD,
          );
        } else {
          throw new BadRequestError(
            result.message,
            ErrorCodes.VAL_INVALID_INPUT,
          );
        }
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('비밀번호 변경 에러:', error);
      throw new InternalServerError(
        '서버 에러가 발생했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };
}
