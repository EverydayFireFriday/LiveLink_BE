#!/usr/bin/env ts-node

/**
 * 콘서트 초기 동기화 스크립트
 * Test DB의 모든 콘서트를 Live DB로 복사합니다.
 *
 * 사용법:
 *   npm run sync:concerts
 *   또는
 *   ts-node scripts/syncConcertsToLive.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../utils/database/db';
import {
  connectLiveDB,
  disconnectLiveDB,
  isLiveSyncEnabled,
} from '../utils/database/liveDbConnection';
import {
  initializeConcertModel,
  getConcertModel,
} from '../models/concert/concert';
import { ConcertSyncService } from '../services/concert/concertSyncService';
import logger from '../utils/logger/logger';

async function syncAllConcerts() {
  try {
    logger.info('🚀 Starting concert synchronization...');

    // 동기화가 활성화되어 있는지 확인
    if (!isLiveSyncEnabled()) {
      logger.error(
        '❌ Live sync is disabled. Please set ENABLE_LIVE_SYNC=true in .env',
      );
      process.exit(1);
    }

    // Test DB 연결
    logger.info('🔌 Connecting to Test Database...');
    const testDb = await connectDB();
    initializeConcertModel(testDb);
    logger.info('✅ Test Database connected');

    // Live DB 연결
    logger.info('🔌 Connecting to Live Database...');
    const liveDb = await connectLiveDB();
    if (!liveDb) {
      logger.error('❌ Failed to connect to Live Database');
      await disconnectDB();
      process.exit(1);
    }
    logger.info('✅ Live Database connected');

    // Test DB에서 모든 콘서트 조회
    logger.info('📊 Fetching all concerts from Test DB...');
    const ConcertModel = getConcertModel();
    const { concerts, total } = await ConcertModel.findMany(
      {},
      {
        page: 1,
        limit: 0, // 모든 데이터 가져오기
      },
    );

    logger.info(`📦 Found ${total} concerts in Test DB`);

    if (total === 0) {
      logger.info('ℹ️  No concerts to sync');
      await cleanup();
      return;
    }

    // 동기화 시작
    logger.info('🔄 Starting sync...');
    const result = await ConcertSyncService.syncAll(concerts);

    // 결과 출력
    logger.info('');
    logger.info('═══════════════════════════════════════');
    logger.info('📊 Synchronization Results');
    logger.info('═══════════════════════════════════════');
    logger.info(`✅ Successfully synced: ${result.success}`);
    logger.info(`❌ Failed to sync: ${result.failed}`);
    logger.info(`📦 Total concerts: ${total}`);
    logger.info('═══════════════════════════════════════');
    logger.info('');

    if (result.failed > 0) {
      logger.warn(
        `⚠️  ${result.failed} concerts failed to sync. Please check the logs above.`,
      );
    } else {
      logger.info('🎉 All concerts synced successfully!');
    }

    await cleanup();
  } catch (error) {
    logger.error('❌ Sync failed:', error);
    await cleanup();
    process.exit(1);
  }
}

async function cleanup() {
  logger.info('🧹 Cleaning up connections...');
  await disconnectDB();
  await disconnectLiveDB();
  logger.info('✅ Cleanup completed');
}

// 스크립트 실행
void syncAllConcerts();
