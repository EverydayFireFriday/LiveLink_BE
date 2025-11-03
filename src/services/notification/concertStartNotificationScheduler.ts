import logger from '../../utils/logger/logger.js';
import { getDB } from '../../utils/database/db.js';
import {
  getConcertStartNotificationQueue,
  ConcertStartNotificationJobData,
} from '../../config/queue/concertStartNotificationQueue.js';
import { IConcert } from '../../models/concert/base/ConcertTypes.js';

/**
 * Concert Start Notification Scheduler
 * 공연 시작 알림 스케줄러
 *
 * 매일 자정(00:00)에 실행되어:
 * 1. 2~3일 후 공연이 시작되는 콘서트 조회 (performanceDate 기준)
 * 2. 각 콘서트마다 3개의 Job 생성
 *    - 하루 전 알림 (1440분)
 *    - 3시간 전 알림 (180분)
 *    - 1시간 전 알림 (60분)
 */

// 스케줄러 인스턴스
let schedulerIntervalId: NodeJS.Timeout | null = null;

// 알림 시간 설정 (분 단위)
const NOTIFICATION_TIMES = [1440, 180, 60]; // 하루 전, 3시간 전, 1시간 전

/**
 * Create notification jobs for upcoming concert starts
 * 예정된 공연 시작에 대한 알림 Job 생성
 */
async function createConcertStartNotificationJobs(): Promise<void> {
  try {
    logger.info('🔔 Starting concert start notification job creation...');

    // Queue 가져오기
    const queue = getConcertStartNotificationQueue();
    if (!queue) {
      logger.warn(
        'Concert start notification queue not available, skipping...',
      );
      return;
    }

    // 2~3일 후 범위 계산
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // 콘서트 DB에서 해당 기간에 공연이 시작되는 콘서트 조회
    const concertDB = getDB();
    const concertCollection = concertDB.collection<IConcert>('concerts');

    const concerts = await concertCollection
      .find({
        status: { $in: ['upcoming', 'ongoing'] }, // 진행 예정 또는 진행 중인 콘서트
        datetime: {
          $elemMatch: {
            $gte: twoDaysLater, // 2일 후 이상
            $lt: threeDaysLater, // 3일 후 미만
          },
        },
      })
      .toArray();

    logger.info(
      `📋 Found ${concerts.length} concerts with performances starting in 2-3 days`,
    );

    let totalJobsCreated = 0;

    // 각 콘서트에 대해 Job 생성
    for (const concert of concerts) {
      if (!concert.datetime || concert.datetime.length === 0) {
        continue;
      }

      // 각 공연 날짜에 대해 처리
      for (const datetime of concert.datetime) {
        const performanceDate = new Date(datetime);

        // 2~3일 범위에 있는지 확인
        if (
          performanceDate >= twoDaysLater &&
          performanceDate < threeDaysLater
        ) {
          // 각 알림 시간(하루 전, 3시간 전, 1시간 전)에 대해 Job 생성
          for (const notifyBeforeMinutes of NOTIFICATION_TIMES) {
            const notificationTime = new Date(
              performanceDate.getTime() - notifyBeforeMinutes * 60 * 1000,
            );

            // 알림 시간이 과거인 경우 스킵
            if (notificationTime <= now) {
              logger.debug(
                `Skipping past notification for concert ${concert.uid} (${notifyBeforeMinutes} min before)`,
              );
              continue;
            }

            // Job 데이터 생성
            const jobData: ConcertStartNotificationJobData = {
              concertId: concert._id.toString(),
              concertTitle: concert.title,
              performanceDate: performanceDate,
              notifyBeforeMinutes,
            };

            // Job ID 생성 (중복 방지)
            const jobId = `concert-start-${concert._id.toString()}-${performanceDate.getTime()}-${notifyBeforeMinutes}min`;

            // BullMQ에 Job 추가
            const delay = notificationTime.getTime() - now.getTime();

            await queue.add(jobId, jobData, {
              jobId, // 중복 Job 방지
              delay, // 알림 시간까지 대기
            });

            totalJobsCreated++;

            logger.debug(
              `Created job for concert "${concert.title}" - ${notifyBeforeMinutes} min before start (scheduled: ${notificationTime.toISOString()})`,
            );
          }
        }
      }
    }

    logger.info(
      `✅ Concert start notification job creation completed: ${totalJobsCreated} jobs created`,
    );
  } catch (error) {
    logger.error('❌ Error creating concert start notification jobs:', error);
  }
}

/**
 * Start the concert start notification scheduler
 * 공연 시작 알림 스케줄러 시작
 */
export function startConcertStartNotificationScheduler(): void {
  if (schedulerIntervalId) {
    logger.warn('Concert start notification scheduler is already running');
    return;
  }

  // 매일 자정(00:00)에 실행 (24시간마다)
  const runScheduler = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // 다음 자정
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    // 다음 자정까지 대기 후 실행
    setTimeout(() => {
      void (async () => {
        logger.info(
          '⏰ Concert start notification scheduler triggered (daily at 00:00)',
        );
        await createConcertStartNotificationJobs();
        // 24시간마다 반복
        schedulerIntervalId = setInterval(
          () => {
            void (async () => {
              logger.info(
                '⏰ Concert start notification scheduler triggered (daily at 00:00)',
              );
              await createConcertStartNotificationJobs();
            })();
          },
          24 * 60 * 60 * 1000,
        ); // 24시간
      })();
    }, timeUntilMidnight);
  };

  runScheduler();

  logger.info(
    '✅ Concert start notification scheduler started (runs daily at 00:00)',
  );

  // 서버 시작 시 즉시 한 번 실행 (테스트/복구용)
  void createConcertStartNotificationJobs();
}

/**
 * Stop the concert start notification scheduler
 * 공연 시작 알림 스케줄러 중지
 */
export function stopConcertStartNotificationScheduler(): void {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    logger.info('Concert start notification scheduler stopped');
  }
}

/**
 * Manually trigger job creation (for testing)
 * 수동으로 Job 생성 트리거 (테스트용)
 */
export async function triggerConcertStartNotificationJobs(): Promise<void> {
  logger.info(
    '🔧 Manually triggering concert start notification job creation...',
  );
  await createConcertStartNotificationJobs();
}
