
import { RedisClientType } from "redis";
import logger from "../../utils/logger";

const MAX_ATTEMPTS = 10;
const BLOCK_DURATION_SECONDS = 30 * 60; // 30분

export class BruteForceProtectionService {
  private redisClient: RedisClientType;
  private isRedisAvailable: boolean = true; // Redis 가용성 플래그

  constructor(redisClient: any) {
    this.redisClient = redisClient.v4;
    this.checkRedisConnection();
  }

  private async checkRedisConnection() {
    try {
      await this.redisClient.ping();
      this.isRedisAvailable = true;
      logger.info("[BruteForce] Redis connection confirmed.");
    } catch (error) {
      this.isRedisAvailable = false;
      logger.error("[BruteForce] Redis connection failed. Brute-force protection will operate in degraded mode.", error);
    }
  }

  private getAttemptsKey(key: string): string {
    return `login-attempts:${key}`;
  }

  private getBlockKey(key: string): string {
    return `login-block:${key}`;
  }

  async increment(key: string): Promise<number> {
    if (!this.isRedisAvailable) {
      logger.warn(`[BruteForce] Redis is unavailable. Skipping increment for ${key}.`);
      return 1; // Allow login to proceed, simulate first attempt
    }
    try {
      const attemptsKey = this.getAttemptsKey(key);
      const attempts = await this.redisClient.incr(attemptsKey);

      if (attempts === 1) {
        await this.redisClient.expire(attemptsKey, BLOCK_DURATION_SECONDS);
      }

      if (attempts >= MAX_ATTEMPTS) {
        const blockKey = this.getBlockKey(key);
        await this.redisClient.set(blockKey, "blocked", {
          EX: BLOCK_DURATION_SECONDS,
        });
        logger.warn(`[BruteForce] Key ${key} has been blocked for 30 minutes.`);
      }

      return attempts;
    } catch (error) {
      logger.error(`[BruteForce] Failed to increment attempts for ${key} in Redis.`, error);
      this.isRedisAvailable = false; // Mark Redis as unavailable
      return 1; // Allow login to proceed
    }
  }

  async isBlocked(key: string): Promise<boolean> {
    if (!this.isRedisAvailable) {
      logger.warn(`[BruteForce] Redis is unavailable. Skipping block check for ${key}.`);
      return false; // Not blocked if Redis is down
    }
    try {
      const blockKey = this.getBlockKey(key);
      const result = await this.redisClient.get(blockKey);
      return result === "blocked";
    } catch (error) {
      logger.error(`[BruteForce] Failed to check block status for ${key} in Redis.`, error);
      this.isRedisAvailable = false; // Mark Redis as unavailable
      return false; // Not blocked if Redis is down
    }
  }

  async getBlockTime(key: string): Promise<number> {
    if (!this.isRedisAvailable) {
      logger.warn(`[BruteForce] Redis is unavailable. Skipping getBlockTime for ${key}.`);
      return 0; // No block time if Redis is down
    }
    try {
      const blockKey = this.getBlockKey(key);
      return this.redisClient.ttl(blockKey);
    } catch (error) {
      logger.error(`[BruteForce] Failed to get block time for ${key} in Redis.`, error);
      this.isRedisAvailable = false; // Mark Redis as unavailable
      return 0; // No block time if Redis is down
    }
  }

  async reset(key: string): Promise<void> {
    if (!this.isRedisAvailable) {
      logger.warn(`[BruteForce] Redis is unavailable. Skipping reset for ${key}.`);
      return; // Do nothing if Redis is down
    }
    try {
      const attemptsKey = this.getAttemptsKey(key);
      const blockKey = this.getBlockKey(key);
      await this.redisClient.del(attemptsKey);
      await this.redisClient.del(blockKey);
    } catch (error) {
      logger.error(`[BruteForce] Failed to reset attempts for ${key} in Redis.`, error);
      this.isRedisAvailable = false; // Mark Redis as unavailable
    }
  }
}
