import express from 'express';
import logger, { ErrorCategory } from '../utils/logger';

// 에러 타입 정의
export interface AppError extends Error {
  statusCode?: number;
  category?: ErrorCategory;
  isOperational?: boolean;
  metadata?: any;
}

// 에러 분류 함수
const categorizeError = (error: AppError): ErrorCategory => {
  if (error.category) return error.category;
  
  const message = error.message.toLowerCase();
  
  if (message.includes('유효성 검사') || message.includes('validation')) {
    return ErrorCategory.VALIDATION;
  }
  if (message.includes('권한') || message.includes('인증') || message.includes('로그인')) {
    return ErrorCategory.AUTHENTICATION;
  }
  if (message.includes('데이터베이스') || message.includes('mongodb') || message.includes('redis')) {
    return ErrorCategory.DATABASE;
  }
  if (message.includes('외부') || message.includes('api') || message.includes('http')) {
    return ErrorCategory.EXTERNAL_API;
  }
  if (message.includes('보안') || message.includes('csrf') || message.includes('xss')) {
    return ErrorCategory.SECURITY;
  }
  
  return ErrorCategory.BUSINESS_LOGIC;
};

// 에러 심각도 결정
const getErrorSeverity = (statusCode: number, category: ErrorCategory): string => {
  if (statusCode >= 500) return 'CRITICAL';
  if (statusCode >= 400 && category === ErrorCategory.SECURITY) return 'HIGH';
  if (statusCode >= 400) return 'MEDIUM';
  return 'LOW';
};

// 중앙화된 에러 핸들링 미들웨어
export const errorMiddleware = (
  err: AppError,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // 이미 응답이 전송된 경우 기본 에러 핸들러로 위임
  if (res.headersSent) {
    return next(err);
  }
  
  // 에러 속성 설정
  const statusCode = err.statusCode || 500;
  const category = categorizeError(err);
  const severity = getErrorSeverity(statusCode, category);
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // 구조화된 에러 로깅
  logger.error('Application Error', {
    message: err.message,
    stack: err.stack,
    statusCode,
    category,
    severity,
    correlationId: req.correlationId,
    userId: (req.session as any)?.user?.id || 'anonymous',
    endpoint: `${req.method} ${req.originalUrl}`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    metadata: {
      body: req.body,
      params: req.params,
      query: req.query,
      headers: sanitizeHeaders(req.headers),
      ...err.metadata
    }
  });
  
  // 보안 관련 에러의 경우 추가 로깅
  if (category === ErrorCategory.SECURITY) {
    logger.warn('Security Alert', {
      message: err.message,
      correlationId: req.correlationId,
      userId: (req.session as any)?.user?.id || 'anonymous',
      endpoint: `${req.method} ${req.originalUrl}`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'HIGH'
    });
  }
  
  // 클라이언트 응답 생성
  const errorResponse = {
    success: false,
    message: getClientErrorMessage(err, statusCode, isDevelopment),
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && {
      error: {
        stack: err.stack,
        details: err.message,
        category,
        severity
      }
    })
  };
  
  res.status(statusCode).json(errorResponse);
};

// 민감한 헤더 정보 제거
const sanitizeHeaders = (headers: any) => {
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];
  return sanitized;
};

// 클라이언트용 에러 메시지 생성
const getClientErrorMessage = (err: AppError, statusCode: number, isDevelopment: boolean): string => {
  if (isDevelopment) return err.message;
  
  // 프로덕션에서는 일반적인 메시지 반환
  switch (statusCode) {
    case 400: return '잘못된 요청입니다.';
    case 401: return '인증이 필요합니다.';
    case 403: return '접근 권한이 없습니다.';
    case 404: return '요청한 리소스를 찾을 수 없습니다.';
    case 429: return '너무 많은 요청이 발생했습니다.';
    case 500: return '서버 내부 오류가 발생했습니다.';
    default: return '알 수 없는 오류가 발생했습니다.';
  }
};

// 커스텀 에러 클래스들
export class ValidationError extends Error implements AppError {
  statusCode = 400;
  category = ErrorCategory.VALIDATION;
  isOperational = true;
  
  constructor(message: string, metadata?: any) {
    super(message);
    this.name = 'ValidationError';
    this.metadata = metadata;
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = 401;
  category = ErrorCategory.AUTHENTICATION;
  isOperational = true;
  
  constructor(message: string = '인증이 필요합니다.', metadata?: any) {
    super(message);
    this.name = 'AuthenticationError';
    this.metadata = metadata;
  }
}

export class DatabaseError extends Error implements AppError {
  statusCode = 500;
  category = ErrorCategory.DATABASE;
  isOperational = true;
  
  constructor(message: string, metadata?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.metadata = metadata;
  }
}

export class SecurityError extends Error implements AppError {
  statusCode = 403;
  category = ErrorCategory.SECURITY;
  isOperational = true;
  
  constructor(message: string, metadata?: any) {
    super(message);
    this.name = 'SecurityError';
    this.metadata = metadata;
  }
}