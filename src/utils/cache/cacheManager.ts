import { redisClient } from '../../config/redis/redisClient';
import { logger } from '../index';
import Redis from 'ioredis';

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
    try {
      if (!this.checkRedisAvailability()) {
        return null;
      }
      const data = await this.client.get(key);
      if (data) {
        logger.info(`✅ Cache HIT for key: ${key}`);
        return JSON.parse(data) as T;
      }
      logger.info(`❌ Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`❌ Error getting cache for key ${key}:`, { error });
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
    } catch (error) {
      logger.error(`❌ Error setting cache for key ${key}:`, { error });
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
    } catch (error) {
      logger.error(`❌ Error deleting cache for key ${key}:`, { error });
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
      } else {
        logger.debug(`ℹ️ No cache keys found for pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`❌ Error deleting cache for pattern ${pattern}:`, {
        error,
      });
      this.isRedisAvailable = false;
    }
  }
}

export const cacheManager = new CacheManager(redisClient);
