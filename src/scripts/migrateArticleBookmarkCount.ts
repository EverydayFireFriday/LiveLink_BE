/**
 * Article bookmark_count 필드 마이그레이션 스크립트
 *
 * 목적:
 * 1. 기존 Article 문서들에 bookmark_count 필드 추가
 * 2. 실제 북마크 수를 계산하여 bookmark_count 값 설정
 *
 * 실행 방법:
 * npm run migrate:article-bookmark-count
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import logger from '../utils/logger/logger';

// 환경변수 로드
dotenv.config();

interface MigrationStats {
  totalArticles: number;
  articlesUpdated: number;
  articlesAlreadyHaveField: number;
  errors: number;
}

async function migrateArticleBookmarkCount() {
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
    const articlesCollection = db.collection('articles');
    const bookmarksCollection = db.collection('article_bookmarks');

    const stats: MigrationStats = {
      totalArticles: 0,
      articlesUpdated: 0,
      articlesAlreadyHaveField: 0,
      errors: 0,
    };

    // 1. 전체 Article 수 확인
    stats.totalArticles = await articlesCollection.countDocuments();
    logger.info(`📊 전체 Article 수: ${stats.totalArticles}`);

    // 2. bookmark_count 필드가 없는 Article 찾기
    const articlesWithoutBookmarkCount = await articlesCollection
      .find({ bookmark_count: { $exists: false } })
      .toArray();

    logger.info(
      `🔍 bookmark_count 필드가 없는 Article: ${articlesWithoutBookmarkCount.length}개`,
    );
    stats.articlesAlreadyHaveField =
      stats.totalArticles - articlesWithoutBookmarkCount.length;

    if (articlesWithoutBookmarkCount.length === 0) {
      logger.info(
        '✅ 모든 Article이 이미 bookmark_count 필드를 가지고 있습니다.',
      );
      return stats;
    }

    // 3. 각 Article의 북마크 수 계산 및 업데이트
    logger.info('🔄 Article별 북마크 수 계산 및 업데이트 시작...');

    for (const article of articlesWithoutBookmarkCount) {
      try {
        const articleId = article._id;

        // 해당 Article의 북마크 수 계산
        const bookmarkCount = await bookmarksCollection.countDocuments({
          article_id: articleId,
        });

        // bookmark_count 필드 추가
        await articlesCollection.updateOne(
          { _id: articleId },
          {
            $set: {
              bookmark_count: bookmarkCount,
              updated_at: new Date(),
            },
          },
        );

        stats.articlesUpdated++;

        if (stats.articlesUpdated % 100 === 0) {
          logger.info(`   진행 상황: ${stats.articlesUpdated}개 업데이트 완료`);
        }
      } catch (error) {
        stats.errors++;
        logger.error(
          `❌ Article ${article._id.toString()} 업데이트 실패:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    logger.info('\n📊 마이그레이션 결과:');
    logger.info(`   - 전체 Article 수: ${stats.totalArticles}`);
    logger.info(
      `   - 이미 bookmark_count 필드를 가진 Article: ${stats.articlesAlreadyHaveField}`,
    );
    logger.info(`   - 업데이트된 Article: ${stats.articlesUpdated}`);
    logger.info(`   - 에러 발생: ${stats.errors}`);

    if (stats.errors === 0) {
      logger.info('✅ 마이그레이션이 성공적으로 완료되었습니다!');
    } else {
      logger.warn(
        `⚠️ 마이그레이션이 완료되었지만 ${stats.errors}개의 에러가 발생했습니다.`,
      );
    }

    return stats;
  } catch (error) {
    logger.error(
      '❌ 마이그레이션 중 치명적인 오류 발생:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  } finally {
    await client.close();
    logger.info('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
if (require.main === module) {
  migrateArticleBookmarkCount()
    .then(() => {
      logger.info('🎉 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { migrateArticleBookmarkCount };
