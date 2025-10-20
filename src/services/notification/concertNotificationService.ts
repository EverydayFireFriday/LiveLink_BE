import { ObjectId } from 'mongodb';
import { Database, UserStatus } from '../../models/auth/user';
import logger from '../../utils/logger/logger';
import fcmService, { ConcertUpdateNotification } from './fcmService';
import { getConcertModel } from '../../models/concert/concert';

export class ConcertNotificationService {
  /**
   * 콘서트를 좋아요한 사용자들에게 업데이트 알림 전송
   */
  async notifyLikedUsers(
    concertId: string,
    notification: ConcertUpdateNotification,
  ): Promise<void> {
    try {
      const db = Database.getInstance();
      const userCollection = db.getUserCollection();

      // 콘서트 ID(UID 또는 ObjectId)로 실제 콘서트 찾기
      const Concert = getConcertModel();
      const query = ObjectId.isValid(concertId)
        ? { _id: new ObjectId(concertId) }
        : { uid: concertId };
      const concert = await Concert.collection.findOne(query);

      if (!concert) {
        logger.warn(`Concert not found: ${concertId}`);
        return;
      }

      // 해당 콘서트를 좋아요한 사용자들의 FCM 토큰 조회
      const concertObjectId = concert._id;
      const users = await userCollection
        .find({
          likedConcerts: concertObjectId,
          fcmToken: { $exists: true },
          status: UserStatus.ACTIVE, // 활성 사용자만
        })
        .project<{ fcmToken?: string; _id: ObjectId }>({ fcmToken: 1, _id: 1 })
        .toArray();

      if (users.length === 0) {
        logger.info(`No users to notify for concert ${concertId}`);
        return;
      }

      const tokens = users
        .map((user) => user.fcmToken)
        .filter(
          (token): token is string =>
            typeof token === 'string' && token.length > 0,
        );

      logger.info(
        `📤 Sending concert update notifications to ${tokens.length} users`,
      );

      // FCM 알림 전송
      const result = await fcmService.sendConcertUpdateNotification(
        tokens,
        notification,
      );

      // 유효하지 않은 토큰 제거
      if (result.invalidTokens.length > 0) {
        await this.removeInvalidTokens(result.invalidTokens);
      }

      logger.info(
        `✅ Concert update notifications sent: ${result.successCount} success, ${result.failureCount} failed`,
      );
    } catch (error) {
      logger.error('❌ Failed to send concert update notifications:', error);
      throw error;
    }
  }

  /**
   * 유효하지 않은 FCM 토큰 제거
   */
  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    try {
      const db = Database.getInstance();
      const userCollection = db.getUserCollection();

      await userCollection.updateMany(
        { fcmToken: { $in: tokens } },
        { $unset: { fcmToken: '', fcmTokenUpdatedAt: '' } },
      );

      logger.info(`🗑️ Removed ${tokens.length} invalid FCM tokens`);
    } catch (error) {
      logger.error('❌ Failed to remove invalid tokens:', error);
    }
  }
}

export default new ConcertNotificationService();
