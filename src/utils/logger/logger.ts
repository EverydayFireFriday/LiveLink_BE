import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import path from 'path';
import { maskSensitiveData } from './sensitiveDataMasker';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// 프로젝트 루트의 logs 디렉토리 (src 밖)
const logDir = path.join(__dirname, '..', '..', '..', 'logs');
const logLevel = process.env.LOG_LEVEL || 'info';

const logFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf((info: winston.Logform.TransformableInfo) => {
    const ts = info.timestamp as string;
    const level = info.level;
    const message = info.message as string;
    const stack = info.stack as string | undefined;

    if (stack) {
      return `[${ts}] ${level}: ${message}
${stack}`;
    }
    return `[${ts}] ${level}: ${message}`;
  }),
);

const baseLogger = winston.createLogger({
  format: logFormat,
  transports: [
    new winstonDaily({
      level: logLevel,
      datePattern: 'YYYY-MM-DD',
      dirname: logDir,
      filename: `%DATE%.log`,
      maxFiles: 30,
      zippedArchive: true,
    }),
    new winstonDaily({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: path.join(logDir, 'error'),
      filename: `%DATE%.error.log`,
      maxFiles: 30,
      zippedArchive: true,
    }),
  ],
  exceptionHandlers: [
    new winstonDaily({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: path.join(logDir, 'error'),
      filename: `%DATE%.exception.log`,
      maxFiles: 30,
      zippedArchive: true,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  baseLogger.add(
    new winston.transports.Console({
      format: combine(colorize({ all: true }), logFormat),
      level: logLevel,
    }),
  );
}

/**
 * 민감 정보 자동 마스킹이 적용된 로거 래퍼
 *
 * 모든 로그 메시지와 객체에서 password, token, secret, apiKey 등을
 * 자동으로 감지하여 마스킹합니다.
 */
const createSecureLogger = () => {
  return {
    /**
     * 정보성 로그 (민감 정보 자동 마스킹)
     */
    info: (message: unknown, ...meta: unknown[]) => {
      const [maskedMessage, ...maskedMeta] = maskSensitiveData(
        message,
        ...meta,
      );
      if (maskedMeta.length > 0) {
        baseLogger.info(String(maskedMessage), ...maskedMeta);
      } else {
        baseLogger.info(String(maskedMessage));
      }
    },

    /**
     * 경고 로그 (민감 정보 자동 마스킹)
     */
    warn: (message: unknown, ...meta: unknown[]) => {
      const [maskedMessage, ...maskedMeta] = maskSensitiveData(
        message,
        ...meta,
      );
      if (maskedMeta.length > 0) {
        baseLogger.warn(String(maskedMessage), ...maskedMeta);
      } else {
        baseLogger.warn(String(maskedMessage));
      }
    },

    /**
     * 에러 로그 (민감 정보 자동 마스킹)
     */
    error: (message: unknown, ...meta: unknown[]) => {
      const [maskedMessage, ...maskedMeta] = maskSensitiveData(
        message,
        ...meta,
      );
      if (maskedMeta.length > 0) {
        baseLogger.error(String(maskedMessage), ...maskedMeta);
      } else {
        baseLogger.error(String(maskedMessage));
      }
    },

    /**
     * 디버그 로그 (민감 정보 자동 마스킹)
     */
    debug: (message: unknown, ...meta: unknown[]) => {
      const [maskedMessage, ...maskedMeta] = maskSensitiveData(
        message,
        ...meta,
      );
      if (maskedMeta.length > 0) {
        baseLogger.debug(String(maskedMessage), ...maskedMeta);
      } else {
        baseLogger.debug(String(maskedMessage));
      }
    },

    /**
     * Verbose 로그 (민감 정보 자동 마스킹)
     */
    verbose: (message: unknown, ...meta: unknown[]) => {
      const [maskedMessage, ...maskedMeta] = maskSensitiveData(
        message,
        ...meta,
      );
      if (maskedMeta.length > 0) {
        baseLogger.verbose(String(maskedMessage), ...maskedMeta);
      } else {
        baseLogger.verbose(String(maskedMessage));
      }
    },

    /**
     * Silly 로그 (민감 정보 자동 마스킹)
     */
    silly: (message: unknown, ...meta: unknown[]) => {
      const [maskedMessage, ...maskedMeta] = maskSensitiveData(
        message,
        ...meta,
      );
      if (maskedMeta.length > 0) {
        baseLogger.silly(String(maskedMessage), ...maskedMeta);
      } else {
        baseLogger.silly(String(maskedMessage));
      }
    },

    /**
     * 원본 winston 로거 접근 (필요 시)
     */
    raw: baseLogger,
  };
};

// 민감 정보 자동 마스킹이 적용된 로거 생성
const logger = createSecureLogger();

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export const maskIpAddress = (ip: string): string => {
  if (!ip) return 'N/A';

  // IPv4 masking (e.g., 192.168.1.100 -> 192.168.1.xxx)
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = 'xxx';
      return parts.join('.');
    }
  }

  // IPv6 masking
  if (ip.includes(':')) {
    // Handle compressed IPv6 addresses like '::1'
    if (ip === '::1') {
      return '::xxxx';
    }
    // For other IPv6 addresses, mask the last segment
    const parts = ip.split(':');
    if (parts.length > 0) {
      parts[parts.length - 1] = 'xxxx';
    }
    return parts.join(':');
  }

  return ip; // Return as is if not a recognized IP format
};

export default logger;
