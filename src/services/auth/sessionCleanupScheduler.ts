import logger from '../../utils/logger/logger';

/**
 * 세션 자동 정리 서비스
 * - 만료된 UserSession 문서를 주기적으로 정리
 * - MongoDB TTL 인덱스가 자동 삭제하지만, 즉각적이지 않을 수 있으므로 보조적으로 사용
 */
export class SessionCleanupScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL: number;

  constructor() {
    // 환경 변수에서 체크 간격 가져오기 (기본값: 1시간 = 3600000ms)
    this.CHECK_INTERVAL =
      parseInt(process.env.SESSION_CLEANUP_INTERVAL || '3600000');
  }

  /**
   * 스케줄러 시작
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('Session cleanup scheduler is already running');
      return;
    }

    const intervalMinutes = Math.floor(this.CHECK_INTERVAL / 60 / 1000);
    logger.info(
      `🕐 Session cleanup scheduler started (runs every ${intervalMinutes} minutes)`,
    );

    // 즉시 한 번 실행
    this.cleanExpiredSessions().catch((error) => {
      logger.error('Error in initial session cleanup:', error);
    });

    // 주기적으로 실행
    this.intervalId = setInterval(() => {
      this.cleanExpiredSessions().catch((error) => {
        logger.error('Error in scheduled session cleanup:', error);
      });
    }, this.CHECK_INTERVAL);
  }

  /**
   * 스케줄러 중지
   * setInterval을 정리하여 메모리 누수를 방지합니다.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('🛑 Session cleanup scheduler stopped');
    }
  }

  /**
   * 만료된 세션 정리 로직
   */
  private async cleanExpiredSessions(): Promise<void> {
    try {
      const { UserSessionModel } = await import(
        '../../models/auth/userSession'
      );
      const userSessionModel = new UserSessionModel();

      // 만료된 세션 삭제
      const deletedCount = await userSessionModel.cleanExpiredSessions();

      if (deletedCount > 0) {
        logger.info(
          `✅ Cleaned up ${deletedCount} expired session(s)`,
        );
      } else {
        logger.debug('Session cleanup completed - no expired sessions found');
      }
    } catch (error) {
      logger.error('Failed to clean expired sessions:', error);
      throw error;
    }
  }

  /**
   * 수동으로 정리 트리거 (테스트/관리용)
   */
  async triggerCleanup(): Promise<void> {
    logger.info('📢 Manual session cleanup triggered');
    await this.cleanExpiredSessions();
  }
}
