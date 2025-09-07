import { redisClient } from '../middlewares/sessionMiddleware';
import { logger } from './index';

class CacheManager {
  private client: typeof redisClient;

  constructor(client: typeof redisClient) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect().catch(logger.error);
      }
      const data = await this.client.v4.get(key);
      if (data) {
        logger.info(`✅ Cache HIT for key: ${key}`);
        return JSON.parse(data) as T;
      }
      logger.info(`❌ Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`❌ Error getting cache for key ${key}:`, { error });
      return null;
    }
  }

  async set(key: string, value: any, ttlInSeconds: number): Promise<void> {
    try {
        if (!this.client.isOpen) {
            await this.client.connect().catch(logger.error);
        }
      const data = JSON.stringify(value);
      await this.client.v4.set(key, data, { EX: ttlInSeconds });
      logger.info(`✅ Cache SET for key: ${key} with TTL: ${ttlInSeconds}s`);
    } catch (error) {
      logger.error(`❌ Error setting cache for key ${key}:`, { error });
    }
  }

  async del(key: string): Promise<void> {
    try {
        if (!this.client.isOpen) {
            await this.client.connect().catch(logger.error);
        }
      await this.client.v4.del(key);
      logger.info(`✅ Cache DELETED for key: ${key}`);
    } catch (error) {
      logger.error(`❌ Error deleting cache for key ${key}:`, { error });
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect().catch(logger.error);
      }
      const keys = await this.client.v4.keys(pattern);
      if (keys.length > 0) {
        await this.client.v4.del(keys);
        logger.info(`✅ Cache DELETED for pattern: ${pattern}, keys: ${keys.join(', ')}`);
      }
    } catch (error) {
      logger.error(`❌ Error deleting cache for pattern ${pattern}:`, { error });
    }
  }
}

export const cacheManager = new CacheManager(redisClient);
