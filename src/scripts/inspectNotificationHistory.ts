/**
 * Notification History 구조 확인 스크립트
 *
 * 목적:
 * 현재 DB에 저장된 NotificationHistory 도큐먼트 구조 확인
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import logger from '../utils/logger/logger';

// 환경변수 로드
dotenv.config();

async function inspectNotificationHistory() {
  const MONGO_URI = process.env.MONGO_URI;
  const DB_NAME = process.env.MONGO_DB_NAME || 'livelink';

  if (!MONGO_URI) {
    logger.error('❌ MONGO_URI 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);

  try {
    logger.info('🔄 MongoDB 연결 중...');
    await client.connect();
    logger.info('✅ MongoDB 연결 성공');

    const db = client.db(DB_NAME);
    const notificationHistoryCollection = db.collection('notificationHistory');

    // 전체 알림 수 조회
    const totalCount = await notificationHistoryCollection.countDocuments();
    logger.info(`\n📊 전체 알림 수: ${totalCount}개`);

    // 샘플 데이터 조회 (최근 5개)
    const samples = await notificationHistoryCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    logger.info('\n📋 최근 알림 샘플 (5개):');
    logger.info('='.repeat(80));

    samples.forEach((notification, index) => {
      logger.info(
        `\n[${index + 1}] Notification ID: ${notification._id?.toString()}`,
      );
      logger.info(`Title: ${notification.title}`);
      logger.info(
        `Has 'type' field in root: ${notification.type !== undefined ? 'YES (' + notification.type + ')' : 'NO'}`,
      );
      logger.info(
        `Has 'concertId' field in root: ${notification.concertId !== undefined ? 'YES (' + notification.concertId + ')' : 'NO'}`,
      );
      logger.info(
        `Has 'data' field: ${notification.data !== undefined ? 'YES' : 'NO'}`,
      );
      if (notification.data) {
        logger.info(`  data.type: ${notification.data.type || 'undefined'}`);
        logger.info(
          `  data.concertId: ${notification.data.concertId || 'undefined'}`,
        );
        logger.info(
          `  data keys: ${Object.keys(notification.data).join(', ')}`,
        );
      }
      logger.info('-'.repeat(80));
    });

    // 필드 존재 통계
    logger.info('\n📊 필드 존재 통계:');
    logger.info('='.repeat(80));

    const stats = {
      rootType: await notificationHistoryCollection.countDocuments({
        type: { $exists: true },
      }),
      rootConcertId: await notificationHistoryCollection.countDocuments({
        concertId: { $exists: true },
      }),
      hasData: await notificationHistoryCollection.countDocuments({
        data: { $exists: true },
      }),
      dataType: await notificationHistoryCollection.countDocuments({
        'data.type': { $exists: true },
      }),
      dataConcertId: await notificationHistoryCollection.countDocuments({
        'data.concertId': { $exists: true },
      }),
    };

    logger.info(`Root level 'type' 필드: ${stats.rootType}개`);
    logger.info(`Root level 'concertId' 필드: ${stats.rootConcertId}개`);
    logger.info(`'data' 필드 있음: ${stats.hasData}개`);
    logger.info(`'data.type' 필드 있음: ${stats.dataType}개`);
    logger.info(`'data.concertId' 필드 있음: ${stats.dataConcertId}개`);

    // 타입별 분포
    logger.info('\n📊 타입 분포:');
    logger.info('='.repeat(80));

    const typeDistribution = await notificationHistoryCollection
      .aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ])
      .toArray();

    if (typeDistribution.length > 0) {
      logger.info('Root level type 분포:');
      typeDistribution.forEach((item) => {
        logger.info(`  ${item._id || 'undefined'}: ${item.count}개`);
      });
    }

    const dataTypeDistribution = await notificationHistoryCollection
      .aggregate([
        {
          $match: { 'data.type': { $exists: true } },
        },
        {
          $group: {
            _id: '$data.type',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ])
      .toArray();

    if (dataTypeDistribution.length > 0) {
      logger.info('\ndata.type 분포:');
      dataTypeDistribution.forEach((item) => {
        logger.info(`  ${item._id || 'undefined'}: ${item.count}개`);
      });
    }

    logger.info('\n✅ 검사 완료!');
  } catch (error) {
    logger.error('❌ 검사 실패:', error);
    throw error;
  } finally {
    await client.close();
    logger.info('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
if (require.main === module) {
  inspectNotificationHistory()
    .then(() => {
      logger.info('✅ 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default inspectNotificationHistory;
