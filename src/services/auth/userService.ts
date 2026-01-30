import {
  UserModel,
  TermsConsent,
  NotificationPreference,
  UserRole,
} from '../../models/auth/user';
import { User } from '../../types/auth/authTypes';
import { cacheManager } from '../../utils/cache/cacheManager';
import {
  CacheKeyBuilder,
  CacheTTL,
  CacheInvalidationPatterns,
} from '../../utils';
import { Cacheable, CacheEvict } from '../../utils/cache/cacheDecorators';
import logger from '../../utils/logger/logger';

export class UserService {
  private userModel: UserModel | null = null;

  // UserModel을 지연 초기화하는 함수
  private getUserModel(): UserModel {
    if (!this.userModel) {
      this.userModel = new UserModel();
    }
    return this.userModel;
  }

  async findByEmail(email: string): Promise<User | null> {
    return (await this.getUserModel().findByEmail(email)) as User | null;
  }

  async findUserWithLikes(email: string): Promise<User | null> {
    return (await this.getUserModel().findByEmailWithLikes(
      email,
    )) as User | null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return (await this.getUserModel().findByUsername(username)) as User | null;
  }

  @Cacheable({
    keyGenerator: (id: string) => CacheKeyBuilder.user(id),
    ttl: CacheTTL.USER_PROFILE,
    skipIf: (_id: string, _skipCache: boolean = false) => _skipCache,
  })
  async findById(
    id: string,
    _skipCache: boolean = false,
  ): Promise<User | null> {
    return (await this.getUserModel().findById(id)) as User | null;
  }

  async createUser(userData: {
    email: string;
    username: string;
    passwordHash?: string;
    name?: string;
    birthDate?: Date;
    profileImage?: string;
    role?: UserRole;
    termsConsents: TermsConsent[];
    notificationPreference?: NotificationPreference;
  }): Promise<User> {
    return (await this.getUserModel().createUser(userData)) as User;
  }

  @CacheEvict({
    keyPatterns: (id: string) => [
      CacheInvalidationPatterns.USER_PROFILE(id),
      CacheInvalidationPatterns.USER_ALL(id),
    ],
  })
  async updateUser(
    id: string,
    updateData: Partial<User>,
  ): Promise<User | null> {
    return (await this.getUserModel().updateUser(id, {
      $set: updateData,
    })) as User | null;
  }

  async deleteUser(id: string): Promise<boolean> {
    logger.info(`🗑️ 사용자 데이터 삭제 시작: ${id}`);

    const { ObjectId } = await import('mongodb');
    const { getDB } = await import('../../utils/database/db');
    const db = getDB();
    const session = db.client.startSession();

    try {
      let result: boolean = false;

      await session.withTransaction(async () => {
        const userObjectId = new ObjectId(id);

        // 삭제 통계 추적
        const deleteStats = {
          articles: 0,
          comments: 0,
          commentLikes: 0,
          articleLikes: 0,
          bookmarks: 0,
          messages: 0,
          chatRooms: 0,
          notifications: 0,
          sessions: 0,
          concertLikes: 0,
        };

        // 1. 사용자가 작성한 게시글 삭제
        const { Article } = await import('../../models/article/article');
        const articleModel = Article.get();
        deleteStats.articles = await articleModel.deleteByAuthor(id);
        logger.info(`  ✅ 삭제된 게시글 수: ${deleteStats.articles}`);

        // 2. 사용자가 작성한 댓글 삭제
        const { Comment } = await import('../../models/article/comment');
        const commentModel = Comment.get();
        deleteStats.comments = await commentModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 댓글 수: ${deleteStats.comments}`);

        // 3. 댓글 좋아요 삭제
        const { CommentLike } = await import(
          '../../models/article/commentLike'
        );
        const commentLikeModel = CommentLike.get();
        deleteStats.commentLikes = await commentLikeModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 댓글 좋아요 수: ${deleteStats.commentLikes}`);

        // 4. 게시글 좋아요 삭제
        const { ArticleLike } = await import(
          '../../models/article/articleLike'
        );
        const articleLikeModel = ArticleLike.get();
        deleteStats.articleLikes = await articleLikeModel.deleteByUser(id);
        logger.info(
          `  ✅ 삭제된 게시글 좋아요 수: ${deleteStats.articleLikes}`,
        );

        // 5. 게시글 북마크 삭제
        const { ArticleBookmark } = await import(
          '../../models/article/articleBookmark'
        );
        const bookmarkModel = ArticleBookmark.get();
        deleteStats.bookmarks = await bookmarkModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 북마크 수: ${deleteStats.bookmarks}`);

        // 6. 채팅 메시지 삭제 (소프트 삭제)
        const { MessageModel } = await import('../../models/chat/message');
        const messageModel = new MessageModel();
        deleteStats.messages = await messageModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 메시지 수: ${deleteStats.messages}`);

        // 7. 생성한 채팅방 삭제
        const { ChatRoomModel } = await import('../../models/chat/chatRoom');
        const chatRoomModel = new ChatRoomModel();
        deleteStats.chatRooms = await chatRoomModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 채팅방 수: ${deleteStats.chatRooms}`);

        // 8. 알림 데이터 삭제
        const { getNotificationHistoryModel } = await import(
          '../../models/notification/notificationHistory'
        );
        const notificationModel = getNotificationHistoryModel(db);
        deleteStats.notifications =
          await notificationModel.deleteAllByUserId(userObjectId);
        logger.info(`  ✅ 삭제된 알림 수: ${deleteStats.notifications}`);

        // 9. 세션 데이터 삭제
        const { UserSessionModel } = await import(
          '../../models/auth/userSession'
        );
        const sessionModel = new UserSessionModel();
        deleteStats.sessions = await sessionModel.deleteAllUserSessions(id);
        logger.info(`  ✅ 삭제된 세션 수: ${deleteStats.sessions}`);

        // 10. 콘서트 좋아요 삭제 (User의 likedConcerts 필드)
        // User 문서에서 likedConcerts 배열을 제거하기 전에
        // Concert의 likeCount를 감소시켜야 함
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne(
          { _id: userObjectId },
          { projection: { likedConcerts: 1 } },
        );

        if (user?.likedConcerts && user.likedConcerts.length > 0) {
          const concertsCollection = db.collection('concerts');
          await concertsCollection.updateMany(
            { _id: { $in: user.likedConcerts } },
            { $inc: { likeCount: -1 } },
          );
          deleteStats.concertLikes = user.likedConcerts.length;
          logger.info(
            `  ✅ 삭제된 콘서트 좋아요 수: ${deleteStats.concertLikes}`,
          );
        }

        // 11. 마지막으로 사용자 계정 삭제
        result = await this.getUserModel().deleteUser(id);

        if (!result) {
          throw new Error('사용자 계정 삭제 실패');
        }

        logger.info(`✅ 사용자 계정 및 모든 데이터 삭제 완료: ${id}`);
        logger.info(`📊 삭제 통계: ${JSON.stringify(deleteStats, null, 2)}`);
      });

      // 트랜잭션 성공 후 캐시 무효화
      if (result) {
        const cacheKey = CacheKeyBuilder.user(id);
        await cacheManager.del(cacheKey);

        const statsCacheKey = CacheKeyBuilder.userStats(id);
        await cacheManager.del(statsCacheKey);
      }

      return result;
    } catch (error) {
      logger.error('❌ 사용자 데이터 삭제 중 오류 발생:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async generateUsername(
    email: string,
    baseUsername?: string,
  ): Promise<string> {
    let username = baseUsername || email.split('@')[0];
    username = username.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();

    if (username.length < 2) username = 'user';
    if (username.length > 15) username = username.substring(0, 15);

    let finalUsername = username;
    let counter = 1;

    while (await this.findByUsername(finalUsername)) {
      finalUsername = `${username}${counter}`;
      counter++;

      if (counter > 9999) {
        finalUsername = `${username}${Date.now().toString().slice(-4)}`;
        break;
      }
    }

    return finalUsername;
  }

  async getAllUsers(limit: number = 50, skip: number = 0): Promise<User[]> {
    return (await this.getUserModel().findAllUsers(limit, skip)) as User[];
  }

  async countUsers(): Promise<number> {
    return await this.getUserModel().countUsers();
  }

  /**
   * Get all users with email and role for admin
   * 관리자용 사용자 목록 조회 (이메일, 역할 포함)
   */
  async getUsersForAdmin(
    limit: number = 50,
    skip: number = 0,
  ): Promise<
    Array<{
      id: string;
      email: string;
      username: string;
      role: UserRole;
      status: string;
      createdAt: Date;
    }>
  > {
    const { getDB } = await import('../../utils/database/db');
    const db = getDB();
    const usersCollection = db.collection('users');

    const users = await usersCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            email: 1,
            username: 1,
            role: 1,
            status: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    }));
  }

  /**
   * Update user role (admin only)
   * 사용자 역할 변경 (관리자 전용)
   */
  async updateUserRole(
    userId: string,
    newRole: UserRole,
  ): Promise<User | null> {
    const user = await this.updateUser(userId, { role: newRole });

    if (user) {
      logger.info(`🔐 사용자 역할 변경: ${userId} -> ${newRole}`);
    }

    return user;
  }

  /**
   * Get user statistics including upcoming liked concerts count
   * 사용자 통계 조회 - 좋아요한 다가오는 콘서트 개수 포함
   */
  @Cacheable({
    keyGenerator: (userId: string) => CacheKeyBuilder.userStats(userId),
    ttl: CacheTTL.USER_PROFILE,
  })
  async getUserStats(userId: string): Promise<{
    upcomingLikedConcertsCount: number;
    totalLikedConcertsCount: number;
  } | null> {
    try {
      const { ObjectId } = await import('mongodb');
      const { getDB } = await import('../../utils/database/db');

      const db = getDB();
      const usersCollection = db.collection('users');

      // 집계 결과 타입 정의
      interface AggregationResult {
        upcomingLikedConcertsCount: number;
        totalLikedConcertsCount: number;
      }

      // MongoDB Aggregation을 사용하여 효율적으로 계산
      const result = await usersCollection
        .aggregate<AggregationResult>([
          // 1. 특정 사용자 찾기
          {
            $match: {
              _id: new ObjectId(userId),
            },
          },
          // 2. likedConcerts 배열 펼치기
          {
            $project: {
              likedConcerts: { $ifNull: ['$likedConcerts', []] },
            },
          },
          // 3. concerts 컬렉션과 조인
          {
            $lookup: {
              from: 'concerts',
              localField: 'likedConcerts',
              foreignField: '_id',
              as: 'likedConcertDetails',
            },
          },
          // 4. 전체 좋아요한 콘서트 개수와 다가오는 콘서트 개수 계산
          {
            $project: {
              totalLikedConcertsCount: { $size: '$likedConcertDetails' },
              upcomingLikedConcertsCount: {
                $size: {
                  $filter: {
                    input: '$likedConcertDetails',
                    as: 'concert',
                    cond: {
                      $and: [
                        // datetime 배열이 존재하고 비어있지 않은지 확인
                        { $isArray: '$$concert.datetime' },
                        { $gt: [{ $size: '$$concert.datetime' }, 0] },
                        // 첫 번째 datetime이 현재 시간보다 미래인지 확인
                        {
                          $gte: [
                            { $arrayElemAt: ['$$concert.datetime', 0] },
                            new Date(),
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        ])
        .toArray();

      if (result.length === 0) {
        return null;
      }

      return {
        upcomingLikedConcertsCount: result[0].upcomingLikedConcertsCount || 0,
        totalLikedConcertsCount: result[0].totalLikedConcertsCount || 0,
      };
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      throw error;
    }
  }
}
