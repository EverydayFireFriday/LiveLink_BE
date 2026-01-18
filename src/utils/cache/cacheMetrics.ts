import { logger } from '../index';

/**
 * 캐시 메트릭 데이터 타입
 */
export interface CacheMetricsData {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
  avgResponseTime: number;
  timestamp: string;
}

/**
 * 응답 시간 통계
 */
interface ResponseTimeStats {
  count: number;
  total: number;
  min: number;
  max: number;
  avg: number;
}

/**
 * 캐시 효과 측정을 위한 메트릭 수집 클래스
 *
 * 기능:
 * - 캐시 히트율 모니터링
 * - 응답 시간 측정 및 비교
 * - 실시간 메트릭 집계
 */
class CacheMetrics {
  private hits: number = 0;
  private misses: number = 0;
  private sets: number = 0;
  private deletes: number = 0;
  private errors: number = 0;

  // 응답 시간 추적 (캐시 히트 vs 미스)
  private cacheHitResponseTimes: number[] = [];
  private cacheMissResponseTimes: number[] = [];

  // 시작 시간
  private startTime: Date = new Date();

  // 주기적 리셋을 위한 마지막 리셋 시간
  private lastResetTime: Date = new Date();

  /**
   * 캐시 히트 기록
   * @param responseTime 응답 시간 (ms)
   */
  recordHit(responseTime?: number): void {
    this.hits++;
    if (responseTime !== undefined) {
      this.cacheHitResponseTimes.push(responseTime);
      // 메모리 관리: 최근 1000개만 유지
      if (this.cacheHitResponseTimes.length > 1000) {
        this.cacheHitResponseTimes.shift();
      }
    }
  }

  /**
   * 캐시 미스 기록
   * @param responseTime 응답 시간 (ms)
   */
  recordMiss(responseTime?: number): void {
    this.misses++;
    if (responseTime !== undefined) {
      this.cacheMissResponseTimes.push(responseTime);
      // 메모리 관리: 최근 1000개만 유지
      if (this.cacheMissResponseTimes.length > 1000) {
        this.cacheMissResponseTimes.shift();
      }
    }
  }

  /**
   * 캐시 저장 기록
   */
  recordSet(): void {
    this.sets++;
  }

  /**
   * 캐시 삭제 기록
   */
  recordDelete(): void {
    this.deletes++;
  }

  /**
   * 에러 기록
   */
  recordError(): void {
    this.errors++;
  }

  /**
   * 현재 메트릭 조회
   */
  getMetrics(): CacheMetricsData {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    // 전체 평균 응답 시간 계산
    const allResponseTimes = [
      ...this.cacheHitResponseTimes,
      ...this.cacheMissResponseTimes,
    ];
    const avgResponseTime =
      allResponseTimes.length > 0
        ? allResponseTimes.reduce((sum, time) => sum + time, 0) /
          allResponseTimes.length
        : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      errors: this.errors,
      totalRequests,
      hitRate: Math.round(hitRate * 100) / 100, // 소수점 2자리
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 상세 메트릭 조회 (응답 시간 분석 포함)
   */
  getDetailedMetrics() {
    const basicMetrics = this.getMetrics();

    const cacheHitStats = this.calculateResponseTimeStats(
      this.cacheHitResponseTimes,
    );
    const cacheMissStats = this.calculateResponseTimeStats(
      this.cacheMissResponseTimes,
    );

    // 캐시 효과 계산 (캐시 미스 대비 캐시 히트의 응답 시간 개선율)
    const improvementRate =
      cacheMissStats.avg > 0
        ? ((cacheMissStats.avg - cacheHitStats.avg) / cacheMissStats.avg) * 100
        : 0;

    return {
      ...basicMetrics,
      responseTime: {
        cacheHit: cacheHitStats,
        cacheMiss: cacheMissStats,
        improvementRate: Math.round(improvementRate * 100) / 100,
      },
      uptime: {
        startTime: this.startTime.toISOString(),
        lastResetTime: this.lastResetTime.toISOString(),
        durationMs: Date.now() - this.lastResetTime.getTime(),
      },
    };
  }

  /**
   * 응답 시간 통계 계산
   */
  private calculateResponseTimeStats(times: number[]): ResponseTimeStats {
    if (times.length === 0) {
      return {
        count: 0,
        total: 0,
        min: 0,
        max: 0,
        avg: 0,
      };
    }

    const total = times.reduce((sum, time) => sum + time, 0);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const avg = total / times.length;

    return {
      count: times.length,
      total: Math.round(total * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      avg: Math.round(avg * 100) / 100,
    };
  }

  /**
   * 메트릭 리셋 (주기적 리셋용)
   */
  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.errors = 0;
    this.cacheHitResponseTimes = [];
    this.cacheMissResponseTimes = [];
    this.lastResetTime = new Date();

    logger.info('📊 Cache metrics reset');
  }

  /**
   * 메트릭 요약 로그
   */
  logSummary(): void {
    const metrics = this.getDetailedMetrics();
    logger.info('📊 Cache Metrics Summary:', {
      hitRate: `${metrics.hitRate}%`,
      totalRequests: metrics.totalRequests,
      hits: metrics.hits,
      misses: metrics.misses,
      cacheHitAvgTime: `${metrics.responseTime.cacheHit.avg}ms`,
      cacheMissAvgTime: `${metrics.responseTime.cacheMiss.avg}ms`,
      improvementRate: `${metrics.responseTime.improvementRate}%`,
    });
  }

  /**
   * 주기적 메트릭 로그 시작 (5분마다)
   */
  startPeriodicLogging(intervalMinutes: number = 5): NodeJS.Timeout {
    const intervalMs = intervalMinutes * 60 * 1000;
    return setInterval(() => {
      this.logSummary();
    }, intervalMs);
  }
}

// 싱글톤 인스턴스
export const cacheMetrics = new CacheMetrics();
