import { MongoClient, MongoClientOptions } from 'mongodb';
import { env, isProduction } from '../env/env';
import logger from '../../utils/logger/logger';

/**
 * ⚠️ IMPORTANT: MongoDB 연결 풀링 최적화
 *
 * 성능 최적화:
 * - Connection pooling으로 연결 재사용
 * - 타임아웃 설정으로 리소스 낭비 방지
 * - 압축 및 재시도 로직으로 안정성 향상
 *
 * 설정 파라미터:
 * - maxPoolSize: 최대 연결 수 (기본: 50)
 * - minPoolSize: 최소 연결 수 (기본: 10)
 * - maxIdleTimeMS: 유휴 연결 유지 시간 (기본: 30초)
 * - connectTimeoutMS: 연결 타임아웃 (기본: 10초)
 * - socketTimeoutMS: 소켓 타임아웃 (기본: 45초)
 * - retryWrites/retryReads: 자동 재시도 활성화
 * - compressors: 네트워크 압축 (zlib)
 *
 * 예상 ROI: 30-50% 성능 향상
 */

export interface MongoConfigOptions {
  maxPoolSize?: number;
  minPoolSize?: number;
  maxIdleTimeMS?: number;
  connectTimeoutMS?: number;
  socketTimeoutMS?: number;
}

/**
 * 환경별 MongoDB 연결 풀링 설정
 */
export const getMongoClientOptions = (
  customOptions?: MongoConfigOptions,
): MongoClientOptions => {
  const isProd = isProduction();

  // 프로덕션 환경 기본값
  const productionDefaults = {
    maxPoolSize: 50,
    minPoolSize: 10,
    maxIdleTimeMS: 30000, // 30초
    connectTimeoutMS: 10000, // 10초
    socketTimeoutMS: 45000, // 45초
  };

  // 개발 환경 기본값 (더 보수적)
  const developmentDefaults = {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 60000, // 60초
    connectTimeoutMS: 15000, // 15초
    socketTimeoutMS: 60000, // 60초
  };

  const defaults = isProd ? productionDefaults : developmentDefaults;

  const options: MongoClientOptions = {
    // Connection Pool 설정
    maxPoolSize: customOptions?.maxPoolSize ?? defaults.maxPoolSize,
    minPoolSize: customOptions?.minPoolSize ?? defaults.minPoolSize,
    maxIdleTimeMS: customOptions?.maxIdleTimeMS ?? defaults.maxIdleTimeMS,

    // Timeout 설정
    connectTimeoutMS:
      customOptions?.connectTimeoutMS ?? defaults.connectTimeoutMS,
    socketTimeoutMS: customOptions?.socketTimeoutMS ?? defaults.socketTimeoutMS,
    serverSelectionTimeoutMS: 10000, // 서버 선택 타임아웃 10초

    // 재시도 설정
    retryWrites: true, // 쓰기 작업 자동 재시도
    retryReads: true, // 읽기 작업 자동 재시도

    // 압축 설정 (네트워크 대역폭 절약)
    compressors: ['zlib'],

    // 기타 설정
    writeConcern: {
      w: isProd ? 'majority' : 1, // 프로덕션: majority, 개발: 1
      wtimeout: 5000, // 쓰기 타임아웃 5초
    },
    readPreference: isProd ? 'primaryPreferred' : 'primary', // 읽기 우선순위
    maxConnecting: 5, // 동시 연결 수 제한
  };

  // 설정 로깅
  logger.info('🔧 MongoDB Connection Pool Configuration:');
  logger.info(`  📊 Environment: ${isProd ? 'Production' : 'Development'}`);
  logger.info(`  🔗 Max Pool Size: ${options.maxPoolSize}`);
  logger.info(`  🔗 Min Pool Size: ${options.minPoolSize}`);
  logger.info(`  ⏰ Max Idle Time: ${options.maxIdleTimeMS}ms`);
  logger.info(`  ⏰ Connect Timeout: ${options.connectTimeoutMS}ms`);
  logger.info(`  ⏰ Socket Timeout: ${options.socketTimeoutMS}ms`);
  logger.info(`  🔄 Retry Writes: ${options.retryWrites}`);
  logger.info(`  🔄 Retry Reads: ${options.retryReads}`);
  logger.info(
    `  📦 Compressors: ${Array.isArray(options.compressors) ? options.compressors.join(', ') : options.compressors || 'none'}`,
  );
  logger.info(`  ✍️  Write Concern: ${JSON.stringify(options.writeConcern)}`);
  logger.info(`  📖 Read Preference: ${String(options.readPreference)}`);

  return options;
};

/**
 * 환경 변수 기반 연결 문자열 생성
 */
export const getMongoConnectionString = (): string => {
  const mongoUri = env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGO_URI environment variable is not set. Please configure your .env file.',
    );
  }

  return mongoUri;
};

/**
 * 데이터베이스 이름 가져오기
 */
export const getMongoDatabaseName = (): string => {
  return process.env.MONGO_DB_NAME || 'livelink';
};

/**
 * Connection Pool 모니터링 이벤트 설정
 */
export const setupMongoMonitoring = (client: MongoClient) => {
  // Connection Pool 이벤트 모니터링
  client.on('connectionPoolCreated', (event) => {
    logger.info(`📊 [MongoDB Pool] Created: ${JSON.stringify(event.options)}`);
  });

  client.on('connectionPoolReady', () => {
    logger.info('✅ [MongoDB Pool] Ready');
  });

  client.on('connectionCreated', (event) => {
    logger.debug(`🔗 [MongoDB Pool] Connection created: ${event.connectionId}`);
  });

  client.on('connectionClosed', (event) => {
    logger.debug(`🔌 [MongoDB Pool] Connection closed: ${event.connectionId}`);
  });

  client.on('connectionCheckOutStarted', (_event) => {
    logger.debug(`⏳ [MongoDB Pool] Check out started`);
  });

  client.on('connectionCheckOutFailed', (event) => {
    logger.warn(`⚠️ [MongoDB Pool] Check out failed: ${event.reason}`);
  });

  client.on('connectionCheckedOut', (event) => {
    logger.debug(
      `✅ [MongoDB Pool] Connection checked out: ${event.connectionId}`,
    );
  });

  client.on('connectionCheckedIn', (event) => {
    logger.debug(
      `✅ [MongoDB Pool] Connection checked in: ${event.connectionId}`,
    );
  });

  // Command 모니터링 (optional - 성능 영향 최소화를 위해 개발 환경에서만)
  if (!isProduction()) {
    client.on('commandStarted', (event) => {
      logger.debug(`🔵 [MongoDB] Command Started: ${event.commandName}`);
    });

    client.on('commandSucceeded', (event) => {
      logger.debug(
        `🟢 [MongoDB] Command Succeeded: ${event.commandName} (${event.duration}ms)`,
      );
    });

    client.on('commandFailed', (event) => {
      logger.error(
        `🔴 [MongoDB] Command Failed: ${event.commandName} - ${String(event.failure)}`,
      );
    });
  }
};
