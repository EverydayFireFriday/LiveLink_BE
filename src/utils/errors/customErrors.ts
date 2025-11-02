/**
 * 커스텀 에러 클래스들
 * HTTP 상태 코드와 함께 의미있는 에러를 전달합니다.
 */

import { ErrorCode, ErrorMessages } from './errorCodes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: ErrorCode;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: ErrorCode,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message || (errorCode ? ErrorMessages[errorCode] : '잘못된 요청입니다.');
    super(finalMessage, 400, errorCode);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message || (errorCode ? ErrorMessages[errorCode] : '인증이 필요합니다.');
    super(finalMessage, 401, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message ||
      (errorCode ? ErrorMessages[errorCode] : '접근 권한이 없습니다.');
    super(finalMessage, 403, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message ||
      (errorCode ? ErrorMessages[errorCode] : '리소스를 찾을 수 없습니다.');
    super(finalMessage, 404, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message ||
      (errorCode ? ErrorMessages[errorCode] : '이미 존재하는 리소스입니다.');
    super(finalMessage, 409, errorCode);
  }
}

export class ValidationError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message ||
      (errorCode ? ErrorMessages[errorCode] : '유효성 검증에 실패했습니다.');
    super(finalMessage, 422, errorCode);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message ||
      (errorCode ? ErrorMessages[errorCode] : '너무 많은 요청이 발생했습니다.');
    super(finalMessage, 429, errorCode);
  }
}

export class InternalServerError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message ||
      (errorCode ? ErrorMessages[errorCode] : '서버 내부 에러가 발생했습니다.');
    super(finalMessage, 500, errorCode);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message ||
      (errorCode ? ErrorMessages[errorCode] : '서비스를 사용할 수 없습니다.');
    super(finalMessage, 503, errorCode);
  }
}

export class DatabaseError extends AppError {
  constructor(message?: string, errorCode?: ErrorCode) {
    const finalMessage =
      message ||
      (errorCode
        ? ErrorMessages[errorCode]
        : '데이터베이스 에러가 발생했습니다.');
    super(finalMessage, 500, errorCode);
  }
}
