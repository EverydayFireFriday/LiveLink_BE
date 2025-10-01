import express from 'express';
import { PasswordService } from '../../services/auth/passwordService';
import { AuthValidator } from '../../utils/validation/auth/authValidator';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';

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
      return ResponseBuilder.badRequest(
        res,
        emailValidation.message || '유효성 검사 실패',
      );
    }

    try {
      const result = await this.passwordService.requestPasswordReset(email);

      if (result.success) {
        return ResponseBuilder.success(res, result.message, result.data);
      } else {
        if (result.message.includes('빈번한')) {
          return ResponseBuilder.tooManyRequests(res, result.message);
        } else if (result.message.includes('찾을 수 없습니다')) {
          return ResponseBuilder.notFound(res, result.message);
        } else {
          return ResponseBuilder.badRequest(res, result.message);
        }
      }
    } catch (error) {
      logger.error('비밀번호 재설정 요청 에러:', error);
      return ResponseBuilder.internalError(res, '서버 에러가 발생했습니다.');
    }
  };

  verifyResetPassword = async (req: express.Request, res: express.Response) => {
    const { email, verificationCode, newPassword } = req.body;

    if (!email || !verificationCode || !newPassword) {
      return ResponseBuilder.badRequest(res, '모든 필드를 입력해주세요.');
    }

    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      return ResponseBuilder.badRequest(
        res,
        emailValidation.message || '유효성 검사 실패',
      );
    }

    const codeValidation =
      AuthValidator.validateVerificationCode(verificationCode);
    if (!codeValidation.isValid) {
      return ResponseBuilder.badRequest(
        res,
        codeValidation.message || '유효성 검사 실패',
      );
    }

    const passwordValidation = AuthValidator.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return ResponseBuilder.badRequest(
        res,
        passwordValidation.message || '유효성 검사 실패',
      );
    }

    try {
      const result = await this.passwordService.verifyAndResetPassword(
        email,
        verificationCode,
        newPassword,
      );

      if (result.success) {
        return ResponseBuilder.success(res, result.message);
      } else {
        if (result.message.includes('만료')) {
          return ResponseBuilder.gone(res, result.message);
        } else if (result.message.includes('일치하지')) {
          return ResponseBuilder.unauthorized(res, result.message);
        } else {
          return ResponseBuilder.badRequest(res, result.message);
        }
      }
    } catch (error) {
      logger.error('비밀번호 재설정 에러:', error);
      return ResponseBuilder.internalError(res, '서버 에러가 발생했습니다.');
    }
  };

  changePassword = async (req: express.Request, res: express.Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ResponseBuilder.badRequest(
        res,
        '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.',
      );
    }

    const passwordValidation = AuthValidator.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return ResponseBuilder.badRequest(
        res,
        `새 ${passwordValidation.message || '유효성 검사 실패'}`,
      );
    }

    if (currentPassword === newPassword) {
      return ResponseBuilder.badRequest(
        res,
        '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
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
          return ResponseBuilder.unauthorized(res, result.message);
        } else {
          return ResponseBuilder.badRequest(res, result.message);
        }
      }
    } catch (error) {
      logger.error('비밀번호 변경 에러:', error);
      return ResponseBuilder.internalError(res, '서버 에러가 발생했습니다.');
    }
  };
}
