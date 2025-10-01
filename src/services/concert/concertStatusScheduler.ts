import { Db } from 'mongodb';
import logger from '../../utils/logger/logger';
import { IConcert } from '../../models/concert/base/ConcertTypes';

/**
 * 콘서트 상태 자동 업데이트 서비스
 * - upcoming/ongoing → completed: 모든 datetime이 지나면 자동으로 completed로 변경
 */
export class ConcertStatusScheduler {
  private db: Db;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 10 * 60 * 1000; // 10분마다 체크

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * 스케줄러 시작
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('Concert status scheduler is already running');
      return;
    }

    logger.info(
      '🕐 Concert status scheduler started (checks every 10 minutes)',
    );

    // 즉시 한 번 실행
    this.updateConcertStatuses().catch((error) => {
      logger.error('Error in initial concert status update:', error);
    });

    // 주기적으로 실행 (10분마다)
    this.intervalId = setInterval(() => {
      this.updateConcertStatuses().catch((error) => {
        logger.error('Error in scheduled concert status update:', error);
      });
    }, this.CHECK_INTERVAL);
  }

  /**
   * 스케줄러 중지
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('🛑 Concert status scheduler stopped');
    }
  }

  /**
   * 콘서트 상태 업데이트 로직
   * upcoming 또는 ongoing 상태의 콘서트 중 모든 datetime이 지난 경우 completed로 변경
   */
  private async updateConcertStatuses(): Promise<void> {
    try {
      const now = new Date();
      const collection = this.db.collection<IConcert>('concerts');

      // upcoming 또는 ongoing 상태의 콘서트 조회
      const activeConcerts = await collection
        .find({
          status: { $in: ['upcoming', 'ongoing'] },
        })
        .toArray();

      let updatedCount = 0;

      for (const concert of activeConcerts) {
        if (!concert.datetime || concert.datetime.length === 0) {
          continue;
        }

        // 모든 datetime이 현재 시간보다 이전인지 확인
        const allDatetimesPassed = concert.datetime.every((date) => {
          return new Date(date) < now;
        });

        if (allDatetimesPassed) {
          await collection.updateOne(
            { _id: concert._id },
            {
              $set: {
                status: 'completed',
                updatedAt: now,
              },
            },
          );
          updatedCount++;
          logger.info(
            `✅ Concert "${concert.title}" (${concert.uid}) status updated to completed`,
          );
        }
      }

      if (updatedCount > 0) {
        logger.info(
          `✅ Total ${updatedCount} concert(s) updated to completed status`,
        );
      } else {
        logger.debug('Concert status check completed - no updates needed');
      }
    } catch (error) {
      logger.error('Failed to update concert statuses:', error);
      throw error;
    }
  }

  /**
   * 수동으로 상태 업데이트 트리거 (테스트/관리용)
   */
  async triggerUpdate(): Promise<void> {
    logger.info('📢 Manual concert status update triggered');
    await this.updateConcertStatuses();
  }
}
