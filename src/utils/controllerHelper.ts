import express from 'express';
import logger, { ErrorCategory } from './logger';
import { AppError, ValidationError, AuthenticationError, DatabaseError } from '../middlewares/errorMiddleware';

// Controller 메서드를 래핑하는 헬퍼 함수
export const asyncHandler = (fn: Function) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 성공 응답 헬퍼
export const sendSuccess = (
  res: express.Response,
  req: express.Request,
  message: string,
  data?: any,
  statusCode: number = 200
) => {
  const response = {
    success: true,
    message,
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
    ...(data && { data })
  };

  // 성공 로깅
  logger.info('Request completed successfully', {
    message,
    statusCode,
    correlationId: req.correlationId,
    userId: (req.session as any)?.user?.id || 'anonymous',
    endpoint: `${req.method} ${req.originalUrl}`
  });

  res.status(statusCode).json(response);
};

// 비즈니스 로직 에러 로깅 헬퍼
export const logBusinessError = (
  req: express.Request,
  operation: string,
  error: any,
  category: ErrorCategory = ErrorCategory.BUSINESS_LOGIC
) => {
  logger.error(`Business logic error in ${operation}`, {
    message: error.message,
    stack: error.stack,
    category,
    correlationId: req.correlationId,
    userId: (req.session as any)?.user?.id || 'anonymous',
    endpoint: `${req.method} ${req.originalUrl}`,
    operation,
    metadata: {
      params: req.params,
      query: req.query,
      body: sanitizeRequestBody(req.body)
    }
  });
};

// 데이터베이스 에러 로깅 헬퍼
export const logDatabaseError = (
  req: express.Request,
  operation: string,
  error: any
) => {
  logger.error(`Database error in ${operation}`, {
    message: error.message,
    stack: error.stack,
    category: ErrorCategory.DATABASE,
    correlationId: req.correlationId,
    userId: (req.session as any)?.user?.id || 'anonymous',
    endpoint: `${req.method} ${req.originalUrl}`,
    operation,
    severity: 'HIGH'
  });
};

// 인증 에러 로깅 헬퍼
export const logAuthError = (
  req: express.Request,
  operation: string,
  reason: string
) => {
  logger.warn(`Authentication failed in ${operation}`, {
    reason,
    category: ErrorCategory.AUTHENTICATION,
    correlationId: req.correlationId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: `${req.method} ${req.originalUrl}`,
    operation
  });
};

// 성능 모니터링 헬퍼
export const logPerformance = (
  req: express.Request,
  operation: string,
  startTime: number,
  metadata?: any
) => {
  const duration = Date.now() - startTime;
  const level = duration > 1000 ? 'warn' : 'info';
  
  logger.log(level, `Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    correlationId: req.correlationId,
    userId: (req.session as any)?.user?.id || 'anonymous',
    endpoint: `${req.method} ${req.originalUrl}`,
    ...(metadata && { metadata })
  });
};

// 요청 본문에서 민감한 정보 제거
const sanitizeRequestBody = (body: any) => {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// 에러 타입별 분류 및 처리
export const handleControllerError = (
  req: express.Request,
  operation: string,
  error: any
) => {
  const errorMessage = error.message || 'Unknown error';
  
  // 데이터베이스 관련 에러
  if (errorMessage.includes('MongoDB') || errorMessage.includes('Redis') || 
      errorMessage.includes('데이터베이스') || errorMessage.includes('connection')) {
    logDatabaseError(req, operation, error);
    throw new DatabaseError(errorMessage);
  }
  
  // 인증 관련 에러
  if (errorMessage.includes('권한') || errorMessage.includes('인증') || 
      errorMessage.includes('로그인') || errorMessage.includes('unauthorized')) {
    logAuthError(req, operation, errorMessage);
    throw new AuthenticationError(errorMessage);
  }
  
  // 유효성 검사 에러
  if (errorMessage.includes('유효성') || errorMessage.includes('validation') || 
      errorMessage.includes('invalid') || errorMessage.includes('required')) {
    logBusinessError(req, operation, error, ErrorCategory.VALIDATION);
    throw new ValidationError(errorMessage);
  }
  
  // 일반 비즈니스 로직 에러
  logBusinessError(req, operation, error);
  throw new AppError(errorMessage);
};