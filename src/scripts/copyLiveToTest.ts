#!/usr/bin/env ts-node

/**
 * Live DB → Test DB 초기 복사 스크립트
 * 운영 중인 Live DB의 모든 콘서트를 Test DB로 복사합니다.
 *
 * 사용법:
 *   npm run copy:live-to-test
 *   또는
 *   ts-node scripts/copyLiveToTest.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, Db } from 'mongodb';
import { getMongoClientOptions } from '../config/database/mongoConfig';
import logger from '../utils/logger/logger';
import type { IConcert } from '../models/concert/base/ConcertTypes';

async function copyLiveToTest() {
  let liveClient: MongoClient | null = null;
  let testClient: MongoClient | null = null;

  try {
    logger.info('🚀 Starting Live DB → Test DB copy...');

    // Live DB 연결 정보 (stagelives)
    const LIVE_MONGO_URI =
      process.env.LIVE_MONGO_URI ||
      'mongodb+srv://stagelives20_db_user:t0z3uuNcUXH5QVcr@stagelives.xnlr6mq.mongodb.net/?appName=stagelives';
    const LIVE_DB_NAME = process.env.LIVE_MONGO_DB_NAME || 'stagelives';

    // Test DB 연결 정보 (livelink)
    const TEST_MONGO_URI =
      process.env.MONGO_URI ||
      'mongodb://testuser:testpass123@ac-j7jaqzx-shard-00-00.azssl1j.mongodb.net:27017/livelink?ssl=true&authSource=admin';
    const TEST_DB_NAME = process.env.MONGO_DB_NAME || 'livelink';

    if (!LIVE_MONGO_URI || !TEST_MONGO_URI) {
      logger.error('❌ Database URIs not set');
      process.exit(1);
    }

    const clientOptions = getMongoClientOptions();

    // Live DB 연결 (소스)
    logger.info('🔌 Connecting to Live Database (source)...');
    logger.info(`   URI: ${LIVE_MONGO_URI.substring(0, 30)}...`);
    logger.info(`   DB: ${LIVE_DB_NAME}`);
    liveClient = new MongoClient(LIVE_MONGO_URI, clientOptions);
    await liveClient.connect();
    const liveDb: Db = liveClient.db(LIVE_DB_NAME);
    await liveDb.admin().ping();
    logger.info('✅ Live Database connected');

    // Test DB 연결 (타겟)
    logger.info('🔌 Connecting to Test Database (target)...');
    logger.info(`   URI: ${TEST_MONGO_URI.substring(0, 30)}...`);
    logger.info(`   DB: ${TEST_DB_NAME}`);
    testClient = new MongoClient(TEST_MONGO_URI, clientOptions);
    await testClient.connect();
    const testDb: Db = testClient.db(TEST_DB_NAME);
    await testDb.admin().ping();
    logger.info('✅ Test Database connected');

    // Live DB에서 모든 콘서트 조회
    logger.info('📊 Fetching all concerts from Live DB...');
    const liveConcertsCollection = liveDb.collection<IConcert>('concerts');
    const concerts = await liveConcertsCollection.find({}).toArray();
    const total = concerts.length;

    logger.info(`📦 Found ${total} concerts in Live DB`);

    if (total === 0) {
      logger.info('ℹ️  No concerts to copy');
      await cleanup(liveClient, testClient);
      return;
    }

    // Test DB로 복사
    logger.info('🔄 Starting copy to Test DB...');
    const testConcertsCollection = testDb.collection<IConcert>('concerts');

    let success = 0;
    let failed = 0;

    for (const concert of concerts) {
      try {
        await testConcertsCollection.updateOne(
          { _id: concert._id },
          { $set: concert },
          { upsert: true },
        );
        success++;
        logger.debug(`✅ Copied: ${concert._id.toString()} - ${concert.title}`);
      } catch (error) {
        logger.error(`❌ Failed to copy concert: ${concert._id.toString()}`, {
          error,
        });
        failed++;
      }
    }

    // 결과 출력
    logger.info('');
    logger.info('═══════════════════════════════════════');
    logger.info('📊 Copy Results');
    logger.info('═══════════════════════════════════════');
    logger.info(`📍 Source: Live DB (${LIVE_DB_NAME})`);
    logger.info(`📍 Target: Test DB (${TEST_DB_NAME})`);
    logger.info(`✅ Successfully copied: ${success}`);
    logger.info(`❌ Failed to copy: ${failed}`);
    logger.info(`📦 Total concerts: ${total}`);
    logger.info('═══════════════════════════════════════');
    logger.info('');

    if (failed > 0) {
      logger.warn(
        `⚠️  ${failed} concerts failed to copy. Please check the logs above.`,
      );
    } else {
      logger.info('🎉 All concerts copied successfully!');
      logger.info('');
      logger.info('💡 Next steps:');
      logger.info('   1. Set ENABLE_LIVE_SYNC=true in .env');
      logger.info('   2. Start your server: npm run dev');
      logger.info('   3. Any changes in Test DB will auto-sync to Live DB');
    }

    await cleanup(liveClient, testClient);
  } catch (error) {
    logger.error('❌ Copy failed:', error);
    await cleanup(liveClient, testClient);
    process.exit(1);
  }
}

async function cleanup(
  liveClient: MongoClient | null,
  testClient: MongoClient | null,
) {
  logger.info('🧹 Cleaning up connections...');

  if (liveClient) {
    await liveClient.close();
    logger.info('✅ Live DB disconnected');
  }

  if (testClient) {
    await testClient.close();
    logger.info('✅ Test DB disconnected');
  }

  logger.info('✅ Cleanup completed');
}

// 스크립트 실행
void copyLiveToTest();
