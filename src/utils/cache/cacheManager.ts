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
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        logger.info(
          `✅ Cache DELETED for pattern: ${pattern}, keys: ${keys.join(', ')}`,
        );
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
