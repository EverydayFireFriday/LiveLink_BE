import Redis from 'ioredis';
import { VerificationData } from '../../types/auth/authTypes';
import logger from '../../utils/logger/logger';

export class VerificationService {
  private redis: Redis;

  constructor() {
    const REDIS_URL = process.env.REDIS_URL;

    if (!REDIS_URL) {
      throw new Error(
        'REDIS_URL 환경변수가 설정되지 않았습니다. 프로덕션 환경에서는 필수입니다.',
      );
    }

    this.redis = new Redis(REDIS_URL);
  }

  async saveVerificationCode(
    type: string,
    email: string,
    code: string,
    userData?: VerificationData['userData'],
  ): Promise<string> {
    const key = `verification:${type}:${email}`;
    const data: VerificationData = {
      code,
      email,
      type: type as 'password_reset' | 'email_verification',
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

      const parsed: unknown = JSON.parse(data);
      return parsed as VerificationData;
    } catch (error) {
      logger.error('Redis 데이터 파싱 에러:', error);
      return null;
    }
  }

  async deleteVerificationCode(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async checkRecentRequest(email: string, type: string): Promise<boolean> {
    const key = `req:${type}:${email}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      // 첫 요청 → 1분(60초) 타이머 설정
      await this.redis.expire(key, 60);
    }

    if (count > 6) {
      // 1분 동안 6회 초과 → 차단
      return true;
    }

    return false; // 허용
  }

  async getTTL(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }
}
