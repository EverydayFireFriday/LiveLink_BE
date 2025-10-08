import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// 프로젝트 루트의 logs 디렉토리 (src 밖)
const logDir = path.join(__dirname, '..', '..', '..', 'logs');
const logLevel = process.env.LOG_LEVEL || 'info';

const logFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(info => {
    if (info.stack) {
      return `[${info.timestamp}] ${info.level}: ${info.message} 
${info.stack}`;
    }
    return `[${info.timestamp}] ${info.level}: ${info.message}`;
  })
);

const logger = winston.createLogger({
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
  logger.add(
    new winston.transports.Console({
      format: combine(colorize({ all: true }), logFormat),
      level: logLevel,
    })
  );
}

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