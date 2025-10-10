import { redisClient } from '../../config/redis/redisClient';
import { logger } from '../index';

class CacheManager {
  private client: typeof redisClient;
  private isRedisAvailable: boolean = true;

  constructor(client: typeof redisClient) {
    this.client = client;
  }

  /**
   * Redis 연결 상태 확인
   */
  private checkRedisAvailability(): boolean {
    if (!this.client.isOpen) {
      if (this.isRedisAvailable) {
        logger.warn('⚠️ Redis is not connected. Cache operations will be skipped.');
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const data = await this.client.v4.get(key);
      if (data) {
        logger.info(`✅ Cache HIT for key: ${key}`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await this.client.v4.set(key, data, { EX: ttlInSeconds });
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await this.client.v4.del(key);
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const keys = await this.client.v4.keys(pattern);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (keys.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await this.client.v4.del(keys);
        logger.info(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
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
