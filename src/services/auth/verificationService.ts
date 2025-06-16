import Redis from "ioredis";
import { VerificationData } from "../../types/auth/authTypes";

export class VerificationService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }

  async saveVerificationCode(
    type: string,
    email: string,
    code: string,
    userData?: any
  ): Promise<string> {
    const key = `verification:${type}:${email}`;
    const data: VerificationData = {
      code,
      email,
      type: type as "password_reset" | "email_verification",
      createdAt: new Date().toISOString(),
      userData,
    };

    await this.redis.setex(key, 180, JSON.stringify(data)); // 3분 TTL
    return key;
  }

  async getVerificationCode(key: string): Promise<VerificationData | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      return JSON.parse(data) as VerificationData;
    } catch (error) {
      console.error("Redis 데이터 파싱 에러:", error);
      return null;
    }
  }

  async deleteVerificationCode(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async checkRecentRequest(email: string, type: string): Promise<boolean> {
    const recentKey = `recent:${type}:${email}`;
    const exists = await this.redis.exists(recentKey);

    if (exists) return true;

    await this.redis.setex(recentKey, 60, "1"); // 1분간 재요청 방지
    return false;
  }

  async getTTL(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }
}
