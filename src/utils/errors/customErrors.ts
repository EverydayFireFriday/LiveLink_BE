/**
 * 커스텀 에러 클래스들
 * 에러 처리 표준화 및 디버깅 향상을 위함
 */

export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, errorCode: string, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    
    // Error.captureStackTrace가 존재하는 경우에만 호출
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BaseError);
    }
    
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = "리소스를 찾을 수 없습니다.", errorCode: string = "NOT_FOUND") {
    super(message, 404, errorCode);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string = "입력값이 유효하지 않습니다.", errorCode: string = "VALIDATION_ERROR") {
    super(message, 400, errorCode);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = "리소스 충돌이 발생했습니다.", errorCode: string = "CONFLICT") {
    super(message, 409, errorCode);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = "인증이 필요합니다.", errorCode: string = "UNAUTHORIZED") {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = "접근 권한이 없습니다.", errorCode: string = "FORBIDDEN") {
    super(message, 403, errorCode);
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string = "서버 내부 오류가 발생했습니다.", errorCode: string = "INTERNAL_SERVER_ERROR") {
    super(message, 500, errorCode);
  }
}

// 에러 타입 판별을 위한 유틸리티 함수
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
};

// HTTP 상태 코드 추출 유틸리티
export const getStatusCode = (error: Error): number => {
  if (error instanceof BaseError) {
    return error.statusCode;
  }
  return 500; // 기본값
};

// 에러 코드 추출 유틸리티
export const getErrorCode = (error: Error): string => {
  if (error instanceof BaseError) {
    return error.errorCode;
  }
  return "UNKNOWN_ERROR";
};