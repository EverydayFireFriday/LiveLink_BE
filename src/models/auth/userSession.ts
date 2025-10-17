import { Collection, ObjectId } from 'mongodb';
import { getDB } from '../../utils/database/db';
import logger from '../../utils/logger/logger';
import {
  UserSession,
  DeviceInfo,
  SessionResponse,
} from '../../types/auth/authTypes';

/**
 * UserSession Model
 * 사용자의 다중 디바이스/세션 관리를 위한 모델
 */
export class UserSessionModel {
  public sessionCollection: Collection<UserSession>;

  constructor() {
    const db = getDB();
    this.sessionCollection = db.collection<UserSession>('user_sessions');
    void this.setupIndexes();
  }

  /**
   * 인덱스 설정
   * - userId: 사용자별 세션 조회 최적화
   * - sessionId: 세션 ID로 빠른 조회 (unique)
   * - expiresAt: 만료된 세션 자동 정리용 TTL 인덱스
   */
  private async setupIndexes(): Promise<void> {
    try {
      // userId 인덱스 - 사용자별 세션 조회
      await this.sessionCollection.createIndex({ userId: 1 });

      // sessionId 인덱스 - 세션 ID로 고유 조회
      await this.sessionCollection.createIndex(
        { sessionId: 1 },
        { unique: true },
      );

      // TTL 인덱스 - 만료된 세션 자동 삭제
      // MongoDB가 expiresAt 시간이 지나면 자동으로 문서 삭제
      await this.sessionCollection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 },
      );

      // userId + sessionId 복합 인덱스
      await this.sessionCollection.createIndex({ userId: 1, sessionId: 1 });

      logger.info('✅ UserSession indexes created successfully');
    } catch (error) {
      logger.error('❌ Failed to create UserSession indexes:', error);
    }
  }

  /**
   * 새 세션 생성
   */
  async createSession(
    userId: string | ObjectId,
    sessionId: string,
    deviceInfo: DeviceInfo,
    expiresAt: Date,
  ): Promise<UserSession> {
    const userObjectId =
      typeof userId === 'string' ? new ObjectId(userId) : userId;
    const now = new Date();

    const session: Omit<UserSession, '_id'> = {
      userId: userObjectId,
      sessionId,
      deviceInfo,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
    };

    try {
      const result = await this.sessionCollection.insertOne(session);
      logger.info(
        `✅ Session created: userId=${userId.toString()}, sessionId=${sessionId}`,
      );

      return {
        _id: result.insertedId,
        ...session,
      };
    } catch (error) {
      logger.error('❌ Failed to create session:', error);
      throw error;
    }
  }

  /**
   * 세션 ID로 세션 조회
   */
  async findBySessionId(sessionId: string): Promise<UserSession | null> {
    return await this.sessionCollection.findOne({ sessionId });
  }

  /**
   * 사용자 ID로 모든 활성 세션 조회
   */
  async findByUserId(userId: string | ObjectId): Promise<UserSession[]> {
    const userObjectId =
      typeof userId === 'string' ? new ObjectId(userId) : userId;

    return await this.sessionCollection
      .find({
        userId: userObjectId,
        expiresAt: { $gt: new Date() }, // 만료되지 않은 세션만
      })
      .sort({ lastActivityAt: -1 })
      .toArray();
  }

  /**
   * 세션 활동 시간 업데이트
   */
  async updateActivity(
    sessionId: string,
    expiresAt?: Date,
  ): Promise<UserSession | null> {
    const updateData: Record<string, Date> = {
      lastActivityAt: new Date(),
    };

    // expiresAt이 제공되면 갱신 (rolling session)
    if (expiresAt) {
      updateData.expiresAt = expiresAt;
    }

    const result = await this.sessionCollection.findOneAndUpdate(
      { sessionId },
      { $set: updateData },
      { returnDocument: 'after' },
    );

    return result || null;
  }

  /**
   * 세션 삭제 (로그아웃)
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await this.sessionCollection.deleteOne({ sessionId });
    if (result.deletedCount > 0) {
      logger.info(`✅ Session deleted: sessionId=${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * 특정 사용자의 모든 세션 삭제 (전체 로그아웃)
   */
  async deleteAllUserSessions(userId: string | ObjectId): Promise<number> {
    const userObjectId =
      typeof userId === 'string' ? new ObjectId(userId) : userId;

    const result = await this.sessionCollection.deleteMany({
      userId: userObjectId,
    });

    logger.info(
      `✅ All sessions deleted for user: userId=${userId.toString()}, count=${result.deletedCount}`,
    );
    return result.deletedCount;
  }

  /**
   * 현재 세션을 제외한 모든 세션 삭제
   */
  async deleteOtherSessions(
    userId: string | ObjectId,
    currentSessionId: string,
  ): Promise<number> {
    const userObjectId =
      typeof userId === 'string' ? new ObjectId(userId) : userId;

    const result = await this.sessionCollection.deleteMany({
      userId: userObjectId,
      sessionId: { $ne: currentSessionId },
    });

    logger.info(
      `✅ Other sessions deleted: userId=${userId.toString()}, count=${result.deletedCount}`,
    );
    return result.deletedCount;
  }

  /**
   * 만료된 세션 수동 정리 (크론 작업용)
   */
  async cleanExpiredSessions(): Promise<number> {
    const result = await this.sessionCollection.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    if (result.deletedCount > 0) {
      logger.info(`✅ Expired sessions cleaned: count=${result.deletedCount}`);
    }

    return result.deletedCount;
  }

  /**
   * 사용자의 활성 세션 수 조회
   */
  async countUserSessions(userId: string | ObjectId): Promise<number> {
    const userObjectId =
      typeof userId === 'string' ? new ObjectId(userId) : userId;

    return await this.sessionCollection.countDocuments({
      userId: userObjectId,
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * 세션을 응답 형식으로 변환
   */
  toSessionResponse(
    session: UserSession,
    currentSessionId: string,
  ): SessionResponse {
    return {
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isCurrent: session.sessionId === currentSessionId,
    };
  }

  /**
   * 여러 세션을 응답 형식으로 변환
   */
  toSessionResponses(
    sessions: UserSession[],
    currentSessionId: string,
  ): SessionResponse[] {
    return sessions.map((session) =>
      this.toSessionResponse(session, currentSessionId),
    );
  }
}
