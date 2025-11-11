/**
 * 전역 에러 핸들러 미들웨어
 * 모든 에러를 중앙에서 처리하고 로깅합니다.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors/customErrors';
import { ErrorCode } from '../../utils/errors/errorCodes';
import logger from '../../utils/logger/logger';
import { isDevelopment } from '../../config/env/env';

interface ErrorResponse {
  success: false;
  message: string;
  errorCode?: ErrorCode;
  error?: string;
  stack?: string;
  timestamp: string;
}

/**
 * 전역 에러 핸들러
 * 모든 라우터와 미들웨어 뒤에 위치해야 합니다.
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  // 헤더가 이미 전송된 경우 Express의 기본 에러 핸들러로 넘김
  if (res.headersSent) {
    return next(err);
  }

  // AppError 타입 체크
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const isOperational = isAppError ? err.isOperational : false;
  const errorCode = isAppError ? err.errorCode : undefined;

  // 에러 로깅
  const errorLog = {
    message: err.message,
    statusCode,
    errorCode,
    isOperational,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as Request & { user?: { id: string } }).user?.id,
    stack: isDevelopment() ? err.stack : undefined,
  };

  if (statusCode >= 500) {
    logger.error('🔥 Server Error:', errorLog);
  } else if (statusCode >= 400) {
    logger.warn('⚠️  Client Error:', errorLog);
  }

  // 에러 응답 구성
  const errorResponse: ErrorResponse = {
    success: false,
    message: err.message || '서버 내부 에러가 발생했습니다.',
    ...(errorCode && { errorCode }),
    timestamp: new Date().toISOString(),
  };

  // 개발 환경에서는 상세 에러 정보 제공
  if (isDevelopment()) {
    errorResponse.error = err.name;
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 에러 핸들러
 * 모든 라우터 뒤에, 에러 핸들러 앞에 위치해야 합니다.
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl} from ${req.ip}`);

  res.status(404).json({
    success: false,
    message: '요청한 경로를 찾을 수 없습니다.',
    errorCode: 'RESOURCE_NOT_FOUND',
    requestedPath: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      documentation: 'GET /api-docs',
      'health-liveness': 'GET /health/liveness',
      'health-readiness': 'GET /health/readiness',
      health: '/health/*',
      auth: '/auth/*',
      concert: '/concert/*',
      article: '/article/*',
      chat: '/chat/*',
      terms: '/terms/*',
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * 비동기 라우트 핸들러 래퍼
 * try-catch 없이 비동기 에러를 자동으로 캐치합니다.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
