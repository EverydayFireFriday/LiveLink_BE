import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logDir = path.join(__dirname, '..', '..', 'logs');

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
      level: 'info',
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
      level: 'debug',
    })
  );
}

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;