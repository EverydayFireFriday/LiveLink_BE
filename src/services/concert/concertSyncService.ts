import {
  getLiveDB,
  isLiveSyncEnabled,
} from '../../utils/database/liveDbConnection';
import logger from '../../utils/logger/logger';
import type { IConcert } from '../../models/concert/base/ConcertTypes';
import { ObjectId } from 'mongodb';

/**
 * 콘서트 동기화 서비스
 * Test DB의 콘서트 데이터를 Live DB로 실시간 동기화
 */
export class ConcertSyncService {
  /**
   * 콘서트 생성 시 Live DB에 동기화
   */
  static async syncCreate(concert: IConcert): Promise<void> {
    try {
      // 동기화가 비활성화된 경우 스킵
      if (!isLiveSyncEnabled()) {
        return;
      }

      const liveDb = getLiveDB();
      if (!liveDb) {
        logger.warn(
          '⚠️  Live DB not connected. Skipping concert sync (create).',
        );
        return;
      }

      const liveConcertsCollection = liveDb.collection<IConcert>('concerts');

      // Live DB에 동일한 _id로 콘서트 생성 (중복 방지를 위해 upsert 사용)
      await liveConcertsCollection.updateOne(
        { _id: concert._id },
        { $set: concert },
        { upsert: true },
      );

      logger.info(
        `✅ [Live Sync] Concert created: ${concert._id.toString()} (${concert.title})`,
      );
    } catch (error) {
      logger.error(
        `❌ [Live Sync] Failed to sync concert creation: ${concert._id.toString()}`,
        { error },
      );
      // 동기화 실패해도 메인 기능은 계속 동작
    }
  }

  /**
   * 콘서트 수정 시 Live DB에 동기화
   */
  static async syncUpdate(
    concertId: string | ObjectId,
    updateData: Partial<IConcert>,
  ): Promise<void> {
    try {
      if (!isLiveSyncEnabled()) {
        return;
      }

      const liveDb = getLiveDB();
      if (!liveDb) {
        logger.warn(
          '⚠️  Live DB not connected. Skipping concert sync (update).',
        );
        return;
      }

      const liveConcertsCollection = liveDb.collection<IConcert>('concerts');

      const id =
        typeof concertId === 'string' ? new ObjectId(concertId) : concertId;

      // Live DB의 콘서트 업데이트
      const result = await liveConcertsCollection.updateOne(
        { _id: id },
        { $set: { ...updateData, updatedAt: new Date() } },
      );

      if (result.matchedCount > 0) {
        logger.info(`✅ [Live Sync] Concert updated: ${id.toString()}`);
      } else {
        logger.warn(
          `⚠️  [Live Sync] Concert not found in Live DB: ${id.toString()}`,
        );
      }
    } catch (error) {
      const idStr =
        typeof concertId === 'string' ? concertId : concertId.toString();
      logger.error(`❌ [Live Sync] Failed to sync concert update: ${idStr}`, {
        error,
      });
    }
  }

  /**
   * 콘서트 삭제 시 Live DB에서도 삭제
   */
  static async syncDelete(concertId: string | ObjectId): Promise<void> {
    try {
      if (!isLiveSyncEnabled()) {
        return;
      }

      const liveDb = getLiveDB();
      if (!liveDb) {
        logger.warn(
          '⚠️  Live DB not connected. Skipping concert sync (delete).',
        );
        return;
      }

      const liveConcertsCollection = liveDb.collection<IConcert>('concerts');

      const id =
        typeof concertId === 'string' ? new ObjectId(concertId) : concertId;

      // Live DB에서 콘서트 삭제
      const result = await liveConcertsCollection.deleteOne({ _id: id });

      if (result.deletedCount > 0) {
        logger.info(`✅ [Live Sync] Concert deleted: ${id.toString()}`);
      } else {
        logger.warn(
          `⚠️  [Live Sync] Concert not found in Live DB: ${id.toString()}`,
        );
      }
    } catch (error) {
      const idStr =
        typeof concertId === 'string' ? concertId : concertId.toString();
      logger.error(`❌ [Live Sync] Failed to sync concert deletion: ${idStr}`, {
        error,
      });
    }
  }

  /**
   * 특정 콘서트를 Live DB와 동기화 (수동 동기화용)
   */
  static async syncSingle(concert: IConcert): Promise<void> {
    try {
      if (!isLiveSyncEnabled()) {
        logger.info('Live sync is disabled.');
        return;
      }

      const liveDb = getLiveDB();
      if (!liveDb) {
        throw new Error('Live DB not connected');
      }

      const liveConcertsCollection = liveDb.collection<IConcert>('concerts');

      await liveConcertsCollection.updateOne(
        { _id: concert._id },
        { $set: concert },
        { upsert: true },
      );

      logger.info(
        `✅ [Live Sync] Manual sync completed: ${concert._id.toString()}`,
      );
    } catch (error) {
      logger.error(
        `❌ [Live Sync] Manual sync failed: ${concert._id.toString()}`,
        { error },
      );
      throw error;
    }
  }

  /**
   * 모든 콘서트를 Live DB와 동기화 (초기 동기화용)
   */
  static async syncAll(
    concerts: IConcert[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    if (!isLiveSyncEnabled()) {
      logger.info('Live sync is disabled.');
      return { success, failed };
    }

    const liveDb = getLiveDB();
    if (!liveDb) {
      throw new Error('Live DB not connected');
    }

    const liveConcertsCollection = liveDb.collection<IConcert>('concerts');

    logger.info(
      `🔄 [Live Sync] Starting bulk sync: ${concerts.length} concerts`,
    );

    for (const concert of concerts) {
      try {
        await liveConcertsCollection.updateOne(
          { _id: concert._id },
          { $set: concert },
          { upsert: true },
        );
        success++;
      } catch (error) {
        logger.error(
          `❌ [Live Sync] Failed to sync concert: ${concert._id.toString()}`,
          { error },
        );
        failed++;
      }
    }

    logger.info(
      `✅ [Live Sync] Bulk sync completed: ${success} success, ${failed} failed`,
    );

    return { success, failed };
  }
}
