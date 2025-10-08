/**
 * 커스텀 에러 클래스들
 * HTTP 상태 코드와 함께 의미있는 에러를 전달합니다.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = '잘못된 요청입니다.') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '인증이 필요합니다.') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '접근 권한이 없습니다.') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '리소스를 찾을 수 없습니다.') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '이미 존재하는 리소스입니다.') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = '유효성 검증에 실패했습니다.') {
    super(message, 422);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = '너무 많은 요청이 발생했습니다.') {
    super(message, 429);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = '서버 내부 에러가 발생했습니다.') {
    super(message, 500);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = '서비스를 사용할 수 없습니다.') {
    super(message, 503);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = '데이터베이스 에러가 발생했습니다.') {
    super(message, 500);
  }
}
