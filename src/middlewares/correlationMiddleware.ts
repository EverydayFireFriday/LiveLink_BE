import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// 요청 컨텍스트 확장
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      startTime: number;
    }
  }
}

export const correlationMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Correlation ID 생성 또는 헤더에서 추출
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // 요청 시작 시간 기록
  const startTime = Date.now();
  
  // 요청 객체에 추가
  req.correlationId = correlationId;
  req.startTime = startTime;
  
  // 응답 헤더에 Correlation ID 추가
  res.setHeader('X-Correlation-ID', correlationId);
  
  // 요청 시작 로깅
  logger.http('HTTP Request Started', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    correlationId,
    userId: (req.session as any)?.user?.id || 'anonymous'
  });
  
  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger.log(level, 'HTTP Request Completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId,
      userId: (req.session as any)?.user?.id || 'anonymous'
    });
  });
  
  next();
};