/**
 * Notification History 마이그레이션 스크립트
 *
 * 목적:
 * 기존 NotificationHistory 도큐먼트 구조 변경
 * - type 필드를 루트 레벨에 유지 (enum 값으로 통일)
 * - concertId 필드를 data.concertId로 이동
 * - data.type 필드가 있으면 루트로 이동
 *
 * 실행 방법:
 * npm run migrate:notification-history
 */

import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import logger from '../utils/logger/logger';

// 환경변수 로드
dotenv.config();

interface MigrationStats {
  totalNotifications: number;
  notificationsWithType: number;
  notificationsWithConcertId: number;
  migratedNotifications: number;
  errors: number;
}

interface OldNotificationHistory {
  _id: ObjectId;
  userId: ObjectId;
  concertId?: ObjectId;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  readAt?: Date;
  sentAt: Date;
  data?: Record<string, string>;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Map old FCM type values to new enum values
 */
const TYPE_MIGRATION_MAP: Record<string, string> = {
  // Old FCM values -> New enum values
  ticket_opening: 'ticket_open',
  concert_start: 'concert_start',
  concert_update: 'concert_update',
  support_response: 'support_response',
  scheduled: 'scheduled',

  // Old time-specific enum values -> New unified values
  ticket_open_10min: 'ticket_open',
  ticket_open_30min: 'ticket_open',
  ticket_open_1hour: 'ticket_open',
  ticket_open_1day: 'ticket_open',
  concert_start_1hour: 'concert_start',
  concert_start_3hour: 'concert_start',
  concert_start_1day: 'concert_start',
};

async function migrateNotificationHistory() {
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
    const notificationHistoryCollection = db.collection<OldNotificationHistory>(
      'notificationHistory',
    );

    const stats: MigrationStats = {
      totalNotifications: 0,
      notificationsWithType: 0,
      notificationsWithConcertId: 0,
      migratedNotifications: 0,
      errors: 0,
    };

    // 전체 알림 수 조회
    stats.totalNotifications =
      await notificationHistoryCollection.countDocuments();
    logger.info(`📊 전체 알림 수: ${stats.totalNotifications}개`);

    // type 필드가 있는 알림 수 조회 (루트 레벨)
    stats.notificationsWithType =
      await notificationHistoryCollection.countDocuments({
        type: { $exists: true },
      });
    logger.info(
      `📊 루트 type 필드가 있는 알림 수: ${stats.notificationsWithType}개`,
    );

    // concertId 필드가 있는 알림 수 조회 (루트 레벨)
    stats.notificationsWithConcertId =
      await notificationHistoryCollection.countDocuments({
        concertId: { $exists: true },
      });
    logger.info(
      `📊 루트 concertId 필드가 있는 알림 수: ${stats.notificationsWithConcertId}개`,
    );

    // data.type 필드가 있는 알림 수 조회
    const initialDataTypeCount =
      await notificationHistoryCollection.countDocuments({
        'data.type': { $exists: true },
      });
    logger.info(`📊 data.type 필드가 있는 알림 수: ${initialDataTypeCount}개`);

    if (
      stats.notificationsWithType === stats.totalNotifications &&
      stats.notificationsWithConcertId === 0 &&
      initialDataTypeCount === 0
    ) {
      logger.info('✅ 모든 알림이 이미 마이그레이션되었습니다.');
      return;
    }

    // 마이그레이션 대상 알림 조회
    logger.info('\n🔄 마이그레이션 시작...');

    const notificationsToMigrate = await notificationHistoryCollection
      .find({
        $or: [
          { type: { $exists: true } },
          { concertId: { $exists: true } },
          { 'data.type': { $exists: true } },
        ],
      })
      .toArray();

    logger.info(
      `📋 마이그레이션 대상 알림: ${notificationsToMigrate.length}개`,
    );

    // 각 알림을 순회하며 마이그레이션
    for (const notification of notificationsToMigrate) {
      try {
        const updateFields: Record<string, string | Record<string, string>> =
          {};
        const unsetFields: Record<string, ''> = {};

        // 기존 data 객체 가져오기 (없으면 빈 객체)
        const existingData = notification.data || {};
        const newData = { ...existingData };

        // type 필드 처리
        let finalType: string | undefined;

        // 1. 루트 레벨에 type이 있으면 우선 사용
        if (notification.type) {
          finalType =
            TYPE_MIGRATION_MAP[notification.type] || notification.type;
        }
        // 2. data.type이 있으면 사용 (루트에 없을 경우)
        else if (existingData.type) {
          finalType =
            TYPE_MIGRATION_MAP[existingData.type] || existingData.type;
        }

        // type을 루트 레벨에 설정
        if (finalType) {
          updateFields.type = finalType;
        }

        // data.type이 있으면 제거
        if (existingData.type) {
          delete newData.type;
        }

        // concertId 필드를 data.concertId로 이동
        if (notification.concertId) {
          newData.concertId = notification.concertId.toString();
          unsetFields.concertId = '';
        }

        // data 필드 업데이트
        updateFields.data = newData;

        // 업데이트 실행
        const updateOperation: {
          $set: Record<string, string | Record<string, string>>;
          $unset?: Record<string, ''>;
        } = {
          $set: updateFields,
        };

        if (Object.keys(unsetFields).length > 0) {
          updateOperation.$unset = unsetFields;
        }

        await notificationHistoryCollection.updateOne(
          { _id: notification._id },
          updateOperation,
        );

        stats.migratedNotifications++;

        // 100개마다 진행 상황 로그
        if (stats.migratedNotifications % 100 === 0) {
          logger.info(
            `⏳ 진행 중... ${stats.migratedNotifications}/${notificationsToMigrate.length}`,
          );
        }
      } catch (error) {
        logger.error(
          `❌ 알림 마이그레이션 실패 (ID: ${notification._id?.toString()}):`,
          error,
        );
        stats.errors++;
      }
    }

    // 최종 통계 출력
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 마이그레이션 완료 통계:');
    logger.info('='.repeat(60));
    logger.info(`전체 알림 수: ${stats.totalNotifications}개`);
    logger.info(`type 필드가 있던 알림 수: ${stats.notificationsWithType}개`);
    logger.info(
      `concertId 필드가 있던 알림 수: ${stats.notificationsWithConcertId}개`,
    );
    logger.info(`마이그레이션된 알림 수: ${stats.migratedNotifications}개`);
    logger.info(`오류 발생: ${stats.errors}건`);
    logger.info('='.repeat(60));

    // 검증: 마이그레이션 후 상태 확인
    logger.info('\n🔍 마이그레이션 검증 중...');

    const rootTypeCount = await notificationHistoryCollection.countDocuments({
      type: { $exists: true },
    });

    const rootConcertIdCount =
      await notificationHistoryCollection.countDocuments({
        concertId: { $exists: true },
      });

    const dataTypeCount = await notificationHistoryCollection.countDocuments({
      'data.type': { $exists: true },
    });

    const dataConcertIdCount =
      await notificationHistoryCollection.countDocuments({
        'data.concertId': { $exists: true },
      });

    logger.info(`✅ 검증 결과:`);
    logger.info(
      `  - 루트 type 필드: ${rootTypeCount}개 (목표: ${stats.totalNotifications}개)`,
    );
    logger.info(`  - 루트 concertId 필드: ${rootConcertIdCount}개 (목표: 0개)`);
    logger.info(`  - data.type 필드: ${dataTypeCount}개 (목표: 0개)`);
    logger.info(`  - data.concertId 필드: ${dataConcertIdCount}개 (유지됨)`);

    if (
      rootTypeCount === stats.totalNotifications &&
      rootConcertIdCount === 0 &&
      dataTypeCount === 0
    ) {
      logger.info('\n✅ 모든 알림이 성공적으로 마이그레이션되었습니다!');
    } else {
      logger.warn(
        '\n⚠️ 일부 알림이 예상과 다르게 마이그레이션되었습니다. 로그를 확인하세요.',
      );
    }

    logger.info('\n✅ 마이그레이션이 완료되었습니다!');
  } catch (error) {
    logger.error('❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    await client.close();
    logger.info('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
if (require.main === module) {
  migrateNotificationHistory()
    .then(() => {
      logger.info('✅ 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default migrateNotificationHistory;
