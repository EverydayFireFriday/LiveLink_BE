import { MongoClient, Db } from 'mongodb';
import logger from '../logger/logger';
import {
  getMongoClientOptions,
  setupMongoMonitoring,
} from '../../config/database/mongoConfig';

let liveClient: MongoClient | null = null;
let liveDb: Db | null = null;

/**
 * Live DB 동기화가 활성화되었는지 확인
 */
export const isLiveSyncEnabled = (): boolean => {
  return process.env.ENABLE_LIVE_SYNC === 'true';
};

/**
 * Live DB에 연결
 */
export const connectLiveDB = async (): Promise<Db | null> => {
  try {
    // 동기화가 비활성화된 경우 연결하지 않음
    if (!isLiveSyncEnabled()) {
      logger.info('🔄 Live DB sync is disabled (ENABLE_LIVE_SYNC=false)');
      return null;
    }

    const LIVE_MONGO_URI = process.env.LIVE_MONGO_URI;
    const LIVE_DB_NAME = process.env.LIVE_MONGO_DB_NAME || 'livelink';

    if (!LIVE_MONGO_URI) {
      logger.warn(
        '⚠️  LIVE_MONGO_URI is not set. Live DB sync will be skipped.',
      );
      return null;
    }

    const clientOptions = getMongoClientOptions();
    liveClient = new MongoClient(LIVE_MONGO_URI, clientOptions);

    // Connection pool 모니터링 설정
    setupMongoMonitoring(liveClient);

    await liveClient.connect();
    liveDb = liveClient.db(LIVE_DB_NAME);

    await liveDb.admin().ping();

    logger.info('✅ Live MongoDB connected for sync');
    logger.info(`📍 Live Database: ${LIVE_DB_NAME}`);

    return liveDb;
  } catch (error) {
    logger.error('❌ Live MongoDB connection error:', { error });
    // Live DB 연결 실패해도 메인 애플리케이션은 계속 동작
    return null;
  }
};

/**
 * Live DB 연결 해제
 */
export const disconnectLiveDB = async (): Promise<void> => {
  try {
    if (liveClient) {
      await liveClient.close();
      liveClient = null;
      liveDb = null;
      logger.info('✅ Live MongoDB disconnected');
    }
  } catch (error) {
    logger.error('❌ Live MongoDB disconnect error:', { error });
  }
};

/**
 * Live DB 인스턴스 가져오기
 */
export const getLiveDB = (): Db | null => {
  if (!isLiveSyncEnabled()) {
    return null;
  }

  if (!liveDb) {
    logger.warn('⚠️  Live DB not connected. Sync will be skipped.');
    return null;
  }

  return liveDb;
};

/**
 * Live DB 연결 상태 확인
 */
export const isLiveDBConnected = (): boolean => {
  return liveDb !== null && liveClient !== null;
};
