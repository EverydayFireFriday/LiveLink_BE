import logger from '../../utils/logger/logger.js';
import { getDB } from '../../utils/database/db.js';
import {
  getTicketNotificationQueue,
  TicketNotificationJobData,
} from '../../config/queue/ticketNotificationQueue.js';
import { IConcert } from '../../models/concert/base/ConcertTypes.js';

/**
 * Ticket Notification Scheduler
 * 티켓 오픈 알림 스케줄러
 *
 * 매일 자정(00:00)에 실행되어:
 * 1. 2~3일 후 티켓이 오픈되는 콘서트 조회
 * 2. 각 콘서트의 티켓 오픈 정보마다 3개의 Job 생성
 *    - 1시간 전 알림
 *    - 30분 전 알림
 *    - 10분 전 알림
 */

// 스케줄러 인스턴스
let schedulerIntervalId: NodeJS.Timeout | null = null;

// 알림 시간 설정 (분 단위)
const NOTIFICATION_TIMES = [60, 30, 10]; // 1시간 전, 30분 전, 10분 전

/**
 * Create notification jobs for upcoming ticket openings
 * 예정된 티켓 오픈에 대한 알림 Job 생성
 */
async function createTicketNotificationJobs(): Promise<void> {
  try {
    logger.info('🔔 Starting ticket notification job creation...');

    // Queue 가져오기
    const queue = getTicketNotificationQueue();
    if (!queue) {
      logger.warn('Ticket notification queue not available, skipping...');
      return;
    }

    // 2~3일 후 범위 계산
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // 콘서트 DB에서 해당 기간에 티켓이 오픈되는 콘서트 조회
    const concertDB = getDB();
    const concertCollection = concertDB.collection<IConcert>('concerts');

    const concerts = await concertCollection
      .find({
        status: { $in: ['upcoming', 'ongoing'] }, // 진행 예정 또는 진행 중인 콘서트
        'ticketOpenDate.openDate': {
          $gte: twoDaysLater, // 2일 후 이상
          $lt: threeDaysLater, // 3일 후 미만
        },
      })
      .toArray();

    logger.info(
      `📋 Found ${concerts.length} concerts with ticket openings in 2-3 days`,
    );

    let totalJobsCreated = 0;

    // 각 콘서트에 대해 Job 생성
    for (const concert of concerts) {
      if (!concert.ticketOpenDate || concert.ticketOpenDate.length === 0) {
        continue;
      }

      // 각 티켓 오픈 정보에 대해 처리
      for (const ticketOpen of concert.ticketOpenDate) {
        const ticketOpenDate = new Date(ticketOpen.openDate);

        // 2~3일 범위에 있는지 확인
        if (ticketOpenDate >= twoDaysLater && ticketOpenDate < threeDaysLater) {
          // 각 알림 시간(10분, 30분, 1시간 전)에 대해 Job 생성
          for (const notifyBeforeMinutes of NOTIFICATION_TIMES) {
            const notificationTime = new Date(
              ticketOpenDate.getTime() - notifyBeforeMinutes * 60 * 1000,
            );

            // 알림 시간이 과거인 경우 스킵
            if (notificationTime <= now) {
              logger.debug(
                `Skipping past notification for concert ${concert.uid} (${notifyBeforeMinutes} min before)`,
              );
              continue;
            }

            // Job 데이터 생성
            const jobData: TicketNotificationJobData = {
              concertId: concert._id.toString(),
              concertTitle: concert.title,
              ticketOpenTitle: ticketOpen.openTitle,
              ticketOpenDate: ticketOpenDate,
              notifyBeforeMinutes,
            };

            // Job ID 생성 (중복 방지)
            const jobId = `ticket-${concert._id.toString()}-${ticketOpenDate.getTime()}-${notifyBeforeMinutes}min`;

            // BullMQ에 Job 추가
            const delay = notificationTime.getTime() - now.getTime();

            await queue.add(jobId, jobData, {
              jobId, // 중복 Job 방지
              delay, // 알림 시간까지 대기
            });

            totalJobsCreated++;

            logger.debug(
              `Created job for concert "${concert.title}" - ${notifyBeforeMinutes} min before (scheduled: ${notificationTime.toISOString()})`,
            );
          }
        }
      }
    }

    logger.info(
      `✅ Ticket notification job creation completed: ${totalJobsCreated} jobs created`,
    );
  } catch (error) {
    logger.error('❌ Error creating ticket notification jobs:', error);
  }
}

/**
 * Start the ticket notification scheduler
 * 티켓 알림 스케줄러 시작
 */
export function startTicketNotificationScheduler(): void {
  if (schedulerIntervalId) {
    logger.warn('Ticket notification scheduler is already running');
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
          '⏰ Ticket notification scheduler triggered (daily at 00:00)',
        );
        await createTicketNotificationJobs();
        // 24시간마다 반복
        schedulerIntervalId = setInterval(
          () => {
            void (async () => {
              logger.info(
                '⏰ Ticket notification scheduler triggered (daily at 00:00)',
              );
              await createTicketNotificationJobs();
            })();
          },
          24 * 60 * 60 * 1000,
        ); // 24시간
      })();
    }, timeUntilMidnight);
  };

  runScheduler();

  logger.info('✅ Ticket notification scheduler started (runs daily at 00:00)');

  // 서버 시작 시 즉시 한 번 실행 (테스트/복구용)
  void createTicketNotificationJobs();
}

/**
 * Stop the ticket notification scheduler
 * 티켓 알림 스케줄러 중지
 */
export function stopTicketNotificationScheduler(): void {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    logger.info('Ticket notification scheduler stopped');
  }
}

/**
 * Manually trigger job creation (for testing)
 * 수동으로 Job 생성 트리거 (테스트용)
 */
export async function triggerTicketNotificationJobs(): Promise<void> {
  logger.info('🔧 Manually triggering ticket notification job creation...');
  await createTicketNotificationJobs();
}
