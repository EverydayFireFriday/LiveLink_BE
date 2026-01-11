import { getDB } from '../../utils/database/db';
import logger from '../../utils/logger/logger';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, isAfter } from 'date-fns';
import { DailyStats, DateRange } from '../../types/stats/statsTypes';
import {
  InternalServerError,
  BadRequestError,
} from '../../utils/errors/customErrors';
import { ErrorCodes } from '../../utils/errors/errorCodes';

const KST_TIMEZONE = 'Asia/Seoul';

/**
 * DailyStatsService
 * 일일 사용자 통계 조회 서비스
 */
export class DailyStatsService {
  /**
   * 일일 통계 조회
   * @param targetDate - 조회할 날짜 (YYYY-MM-DD 형식 문자열 또는 Date 객체)
   * @returns 일일 통계 데이터
   */
  async getDailyStatistics(
    targetDate?: string | Date,
  ): Promise<{ date: string; stats: DailyStats }> {
    try {
      // 날짜 파싱 및 검증
      const date = this.parseAndValidateDate(targetDate);

      // 한국 시간대 기준으로 날짜 범위 계산
      const dateRange = this.getKoreanDateRange(date);

      // 모든 통계를 병렬로 조회
      const [dau, newRegistrations, loginCount, activity] = await Promise.all([
        this.getDailyActiveUsers(dateRange.startOfDay, dateRange.endOfDay),
        this.getNewRegistrations(dateRange.startOfDay, dateRange.endOfDay),
        this.getLoginCount(dateRange.startOfDay, dateRange.endOfDay),
        this.getUserActivity(dateRange.startOfDay, dateRange.endOfDay),
      ]);

      // 날짜를 YYYY-MM-DD 형식으로 변환
      const dateStr = this.formatDate(date);

      return {
        date: dateStr,
        stats: {
          users: {
            dailyActiveUsers: dau,
            newRegistrations,
          },
          sessions: {
            totalLogins: loginCount,
          },
          activity,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      logger.error('일일 통계 조회 실패:', error);
      throw new InternalServerError(
        '통계 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  }

  /**
   * 날짜 파싱 및 검증
   */
  private parseAndValidateDate(targetDate?: string | Date): Date {
    let date: Date;

    if (!targetDate) {
      // 날짜가 제공되지 않으면 오늘 날짜 사용 (KST)
      date = toZonedTime(new Date(), KST_TIMEZONE);
    } else if (typeof targetDate === 'string') {
      // 문자열인 경우 YYYY-MM-DD 형식 검증
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(targetDate)) {
        throw new BadRequestError(
          '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)',
          ErrorCodes.VAL_INVALID_DATE,
        );
      }
      date = new Date(targetDate);
    } else {
      date = targetDate;
    }

    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      throw new BadRequestError(
        '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)',
        ErrorCodes.VAL_INVALID_DATE,
      );
    }

    // 미래 날짜인지 확인
    const today = toZonedTime(new Date(), KST_TIMEZONE);
    if (isAfter(startOfDay(date), startOfDay(today))) {
      throw new BadRequestError(
        '미래 날짜의 통계는 조회할 수 없습니다',
        ErrorCodes.VAL_INVALID_DATE,
      );
    }

    return date;
  }

  /**
   * 한국 시간대 기준으로 하루의 시작과 끝 계산
   */
  private getKoreanDateRange(date: Date): DateRange {
    // 한국 시간대로 변환
    const zonedDate = toZonedTime(date, KST_TIMEZONE);

    // 하루의 시작 (00:00:00)
    const start = startOfDay(zonedDate);
    // 하루의 끝 (23:59:59.999)
    const end = endOfDay(zonedDate);

    // UTC로 다시 변환
    const startOfDayUTC = fromZonedTime(start, KST_TIMEZONE);
    const endOfDayUTC = fromZonedTime(end, KST_TIMEZONE);

    return {
      startOfDay: startOfDayUTC,
      endOfDay: endOfDayUTC,
    };
  }

  /**
   * 날짜를 YYYY-MM-DD 형식으로 포맷
   */
  private formatDate(date: Date): string {
    const zonedDate = toZonedTime(date, KST_TIMEZONE);
    const year = zonedDate.getFullYear();
    const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
    const day = String(zonedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 일일 활성 사용자 수 (DAU) 계산
   * user_sessions 컬렉션의 lastActivityAt 기준
   */
  private async getDailyActiveUsers(
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<number> {
    try {
      const db = getDB();
      const userSessionsCollection = db.collection('user_sessions');

      const result = await userSessionsCollection
        .aggregate([
          {
            $match: {
              lastActivityAt: {
                $gte: startOfDay,
                $lt: endOfDay,
              },
            },
          },
          {
            $group: {
              _id: '$userId',
            },
          },
          {
            $count: 'dau',
          },
        ])
        .toArray();

      return result.length > 0 ? result[0].dau : 0;
    } catch (error) {
      logger.error('DAU 계산 실패:', error);
      throw error;
    }
  }

  /**
   * 일일 신규 가입자 수 계산
   * users 컬렉션의 createdAt 기준
   */
  private async getNewRegistrations(
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<number> {
    try {
      const db = getDB();
      const usersCollection = db.collection('users');

      return await usersCollection.countDocuments({
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      });
    } catch (error) {
      logger.error('신규 가입자 수 계산 실패:', error);
      throw error;
    }
  }

  /**
   * 일일 로그인 횟수 계산
   * user_sessions 컬렉션의 createdAt 기준 (세션 생성 = 로그인)
   */
  private async getLoginCount(
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<number> {
    try {
      const db = getDB();
      const userSessionsCollection = db.collection('user_sessions');

      return await userSessionsCollection.countDocuments({
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      });
    } catch (error) {
      logger.error('로그인 횟수 계산 실패:', error);
      throw error;
    }
  }

  /**
   * 일일 사용자 활동 통계 계산
   * 게시글, 댓글, 좋아요, 북마크, 리뷰 생성 수
   */
  private async getUserActivity(startOfDay: Date, endOfDay: Date) {
    try {
      const db = getDB();

      // 모든 활동 통계를 병렬로 조회
      const [
        articlesCreated,
        commentsCreated,
        likesCreated,
        bookmarksCreated,
        reviewsCreated,
      ] = await Promise.all([
        // 게시글 생성 수
        db.collection('articles').countDocuments({
          created_at: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }),
        // 댓글 생성 수
        db.collection('comments').countDocuments({
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }),
        // 좋아요 생성 수
        db.collection('article_likes').countDocuments({
          created_at: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }),
        // 북마크 생성 수
        db.collection('article_bookmarks').countDocuments({
          created_at: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }),
        // 리뷰 생성 수
        db.collection('concert_reviews').countDocuments({
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }),
      ]);

      return {
        articlesCreated,
        commentsCreated,
        likesCreated,
        bookmarksCreated,
        reviewsCreated,
      };
    } catch (error) {
      logger.error('사용자 활동 통계 계산 실패:', error);
      throw error;
    }
  }
}
