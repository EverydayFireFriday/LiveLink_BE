import winston from 'winston';
import path from 'path';

// 로그 레벨 정의
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

// 에러 카테고리 정의
export enum ErrorCategory {
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  EXTERNAL_API = 'EXTERNAL_API',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY'
}

// 커스텀 로그 포맷
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, correlationId, userId, endpoint, category, metadata }) => {
    const logObject = {
      timestamp,
      level: level.toUpperCase(),
      message,
      correlationId,
      userId,
      endpoint,
      category,
      ...(stack && { stack }),
      ...(metadata && { metadata }),
      environment: process.env.NODE_ENV || 'development',
      service: 'LiveLink_BE'
    };
    return JSON.stringify(logObject);
  })
);

// 로그 전송자 설정
const transports: winston.transport[] = [
  // 콘솔 출력
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),

  // 에러 로그 파일
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }),

  // 모든 로그 파일
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 10
  }),

  // HTTP 요청 로그 파일
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'access.log'),
    level: 'http',
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 7
  })
];

// 프로덕션 환경에서는 추가 전송자 설정 가능
if (process.env.NODE_ENV === 'production') {
  // Elasticsearch, CloudWatch, 또는 다른 로그 집계 서비스 설정
  // 예: new winston.transports.Http({ ... })
}

// Winston 로거 생성
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports,
  // 예외 처리되지 않은 에러 로깅
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log')
    })
  ],
  // Promise rejection 로깅
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log')
    })
  ]
});

// 로그 디렉토리 생성
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;