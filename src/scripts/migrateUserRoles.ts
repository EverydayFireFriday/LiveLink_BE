/**
 * 사용자 Role 마이그레이션 스크립트
 *
 * 목적:
 * 1. 기존 사용자들에게 기본 role 추가 (role 필드가 없는 경우)
 * 2. ADMIN_EMAILS에 설정된 이메일의 사용자들을 admin role로 업데이트
 *
 * 실행 방법:
 * npm run migrate:roles
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import logger from '../utils/logger/logger';
import { UserRole } from '../models/auth/user';

// 환경변수 로드
dotenv.config();

interface MigrationStats {
  totalUsers: number;
  usersWithoutRole: number;
  usersUpdatedToUser: number;
  usersUpdatedToAdmin: number;
  errors: number;
}

async function migrateUserRoles() {
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
    const usersCollection = db.collection('users');

    const stats: MigrationStats = {
      totalUsers: 0,
      usersWithoutRole: 0,
      usersUpdatedToUser: 0,
      usersUpdatedToAdmin: 0,
      errors: 0,
    };

    // 전체 사용자 수 조회
    stats.totalUsers = await usersCollection.countDocuments();
    logger.info(`📊 전체 사용자 수: ${stats.totalUsers}명`);

    // role 필드가 없는 사용자 수 조회
    stats.usersWithoutRole = await usersCollection.countDocuments({
      role: { $exists: false },
    });
    logger.info(`📊 role 필드가 없는 사용자 수: ${stats.usersWithoutRole}명`);

    if (stats.usersWithoutRole === 0) {
      logger.info('✅ 모든 사용자가 이미 role을 가지고 있습니다.');
      return;
    }

    // ADMIN_EMAILS 읽기
    const adminEmailsString = process.env.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsString
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    logger.info(`📧 관리자 이메일 목록: ${adminEmails.join(', ')}`);

    // 1. role 필드가 없는 일반 사용자들을 USER role로 업데이트
    logger.info(
      '\n🔄 Step 1: role 필드가 없는 일반 사용자들을 USER role로 업데이트 중...',
    );
    const updateUsersResult = await usersCollection.updateMany(
      {
        role: { $exists: false },
        email: { $nin: adminEmails }, // admin 이메일이 아닌 사용자들만
      },
      {
        $set: {
          role: UserRole.USER,
          updatedAt: new Date(),
        },
      },
    );

    stats.usersUpdatedToUser = updateUsersResult.modifiedCount;
    logger.info(
      `✅ ${stats.usersUpdatedToUser}명의 사용자를 USER role로 업데이트했습니다.`,
    );

    // 2. ADMIN_EMAILS에 있는 사용자들을 ADMIN role로 업데이트
    if (adminEmails.length > 0) {
      logger.info(
        '\n🔄 Step 2: ADMIN_EMAILS에 있는 사용자들을 ADMIN role로 업데이트 중...',
      );

      // 소문자로 변환된 이메일을 사용하여 대소문자 구분 없이 검색
      const updateAdminsResult = await usersCollection.updateMany(
        {
          $expr: {
            $in: [{ $toLower: '$email' }, adminEmails],
          },
        },
        {
          $set: {
            role: UserRole.ADMIN,
            updatedAt: new Date(),
          },
        },
      );

      stats.usersUpdatedToAdmin = updateAdminsResult.modifiedCount;
      logger.info(
        `✅ ${stats.usersUpdatedToAdmin}명의 사용자를 ADMIN role로 업데이트했습니다.`,
      );

      // 관리자로 업데이트된 사용자 목록 출력
      const adminUsers = await usersCollection
        .find({
          role: UserRole.ADMIN,
        })
        .project({ email: 1, username: 1, role: 1 })
        .toArray();

      logger.info('\n👑 관리자 목록:');
      adminUsers.forEach((user) => {
        logger.info(`  - ${user.email} (${user.username}) → ${user.role}`);
      });
    } else {
      logger.warn('⚠️ ADMIN_EMAILS 환경변수가 설정되지 않았거나 비어있습니다.');
    }

    // 3. role 인덱스 생성 (아직 없는 경우)
    logger.info('\n🔄 Step 3: role 필드 인덱스 생성 중...');
    try {
      await usersCollection.createIndex({ role: 1 });
      logger.info('✅ role 필드 인덱스 생성 완료');
    } catch {
      logger.warn('⚠️ role 인덱스는 이미 존재합니다.');
    }

    // 최종 통계 출력
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 마이그레이션 완료 통계:');
    logger.info('='.repeat(60));
    logger.info(`전체 사용자 수: ${stats.totalUsers}명`);
    logger.info(`role 필드가 없던 사용자 수: ${stats.usersWithoutRole}명`);
    logger.info(`USER role로 업데이트: ${stats.usersUpdatedToUser}명`);
    logger.info(`ADMIN role로 업데이트: ${stats.usersUpdatedToAdmin}명`);
    logger.info(`오류 발생: ${stats.errors}건`);
    logger.info('='.repeat(60));

    // 최종 role 분포 확인
    logger.info('\n📊 최종 Role 분포:');
    const roleDistribution = await usersCollection
      .aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])
      .toArray();

    roleDistribution.forEach((item) => {
      logger.info(`  ${item._id}: ${item.count}명`);
    });

    logger.info('\n✅ 마이그레이션이 성공적으로 완료되었습니다!');
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
  migrateUserRoles()
    .then(() => {
      logger.info('✅ 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default migrateUserRoles;
