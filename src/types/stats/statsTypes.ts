/**
 * Daily Statistics Types
 * 일일 통계 타입 정의
 */

export interface DailyUserStats {
  dailyActiveUsers: number;
  newRegistrations: number;
}

export interface DailySessionStats {
  totalLogins: number;
}

export interface DailyActivityStats {
  articlesCreated: number;
  commentsCreated: number;
  likesCreated: number;
  bookmarksCreated: number;
  reviewsCreated: number;
}

export interface DailyStats {
  users: DailyUserStats;
  sessions: DailySessionStats;
  activity: DailyActivityStats;
}

export interface DailyStatsData {
  date: string;
  stats: DailyStats;
}

export interface DailyStatsResponse {
  success: boolean;
  message: string;
  data: DailyStatsData;
  timestamp: string;
}

export interface DateRange {
  startOfDay: Date;
  endOfDay: Date;
}
