
import { RedisClientType } from "redis";
import { env } from "../../config/env";
import logger from "../../utils/logger";

const MAX_ATTEMPTS = 10;
const BLOCK_DURATION_SECONDS = 30 * 60; // 30분

export class BruteForceProtectionService {
  private redisClient: RedisClientType;

  constructor(redisClient: any) {
    this.redisClient = redisClient.v4;
  }

  private getAttemptsKey(key: string): string {
    return `login-attempts:${key}`;
  }

  private getBlockKey(key: string): string {
    return `login-block:${key}`;
  }

  async increment(key: string): Promise<number> {
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
  }

  async isBlocked(key: string): Promise<boolean> {
    const blockKey = this.getBlockKey(key);
    const result = await this.redisClient.get(blockKey);
    return result === "blocked";
  }

  async getBlockTime(key: string): Promise<number> {
    const blockKey = this.getBlockKey(key);
    return this.redisClient.ttl(blockKey);
  }

  async reset(key: string): Promise<void> {
    const attemptsKey = this.getAttemptsKey(key);
    const blockKey = this.getBlockKey(key);
    await this.redisClient.del(attemptsKey);
    await this.redisClient.del(blockKey);
  }
}
