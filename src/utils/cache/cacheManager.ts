import { redisClient } from '../../config/redis/redisClient';
import { logger } from '../index';
import Redis from 'ioredis';
import { cacheMetrics } from './cacheMetrics';

class CacheManager {
  private client: Redis;
  private isRedisAvailable: boolean = true;

  constructor(client: Redis) {
    this.client = client;
  }

  /**
   * Redis 연결 상태 확인
   */
  private checkRedisAvailability(): boolean {
    if (this.client.status !== 'ready') {
      if (this.isRedisAvailable) {
        logger.warn(
          '⚠️ Redis is not connected. Cache operations will be skipped.',
        );
        this.isRedisAvailable = false;
      }
      return false;
    }
    if (!this.isRedisAvailable) {
      logger.info('✅ Redis connection restored.');
      this.isRedisAvailable = true;
    }
    return true;
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      if (!this.checkRedisAvailability()) {
        return null;
      }
      const data = await this.client.get(key);
      const responseTime = Date.now() - startTime;

      if (data) {
        logger.info(`✅ Cache HIT for key: ${key}`);
        cacheMetrics.recordHit(responseTime);
        return JSON.parse(data) as T;
      }
      logger.info(`❌ Cache MISS for key: ${key}`);
      cacheMetrics.recordMiss(responseTime);
      return null;
    } catch (error) {
      logger.error(`❌ Error getting cache for key ${key}:`, { error });
      cacheMetrics.recordError();
      this.isRedisAvailable = false;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlInSeconds: number): Promise<void> {
    try {
      if (!this.checkRedisAvailability()) {
        return;
      }
      const data = JSON.stringify(value);
      await this.client.set(key, data, 'EX', ttlInSeconds);
      logger.info(`✅ Cache SET for key: ${key} with TTL: ${ttlInSeconds}s`);
      cacheMetrics.recordSet();
    } catch (error) {
      logger.error(`❌ Error setting cache for key ${key}:`, { error });
      cacheMetrics.recordError();
      this.isRedisAvailable = false;
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.checkRedisAvailability()) {
        return;
      }
      await this.client.del(key);
      logger.info(`✅ Cache DELETED for key: ${key}`);
      cacheMetrics.recordDelete();
    } catch (error) {
      logger.error(`❌ Error deleting cache for key ${key}:`, { error });
      cacheMetrics.recordError();
      this.isRedisAvailable = false;
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      if (!this.checkRedisAvailability()) {
        return;
      }

      let cursor = '0';
      let deletedCount = 0;
      const allKeys: string[] = [];

      // SCAN을 사용하여 비블로킹 방식으로 점진적 스캔
      do {
        const result = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );

        // ioredis는 [cursor, keys] 배열 반환
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          await this.client.del(...keys);
          deletedCount += keys.length;
          allKeys.push(...keys);
        }
      } while (cursor !== '0');

      if (deletedCount > 0) {
        logger.info(
          `✅ Cache DELETED for pattern: ${pattern}, total keys: ${deletedCount}`,
        );
        logger.debug(`   Deleted keys: ${allKeys.join(', ')}`);
        // 패턴 삭제도 삭제 카운트에 포함
        for (let i = 0; i < deletedCount; i++) {
          cacheMetrics.recordDelete();
        }
      } else {
        logger.debug(`ℹ️ No cache keys found for pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`❌ Error deleting cache for pattern ${pattern}:`, {
        error,
      });
      cacheMetrics.recordError();
      this.isRedisAvailable = false;
    }
  }

  /**
   * 캐시 메트릭 조회
   */
  getMetrics() {
    return cacheMetrics.getMetrics();
  }

  /**
   * 상세 캐시 메트릭 조회
   */
  getDetailedMetrics() {
    return cacheMetrics.getDetailedMetrics();
  }

  /**
   * 메트릭 리셋
   */
  resetMetrics() {
    cacheMetrics.reset();
  }
}

export const cacheManager = new CacheManager(redisClient);
