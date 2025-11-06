import {
  UserModel,
  TermsConsent,
  NotificationPreference,
} from '../../models/auth/user';
import { User } from '../../types/auth/authTypes';
import { cacheManager } from '../../utils/cache/cacheManager';
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

  async findById(id: string, skipCache: boolean = false): Promise<User | null> {
    const cacheKey = `user:${id}`;

    // 캐시 우회 옵션이 false이고 캐시에 데이터가 있으면 캐시 반환
    if (!skipCache) {
      const cachedUser = await cacheManager.get<User>(cacheKey);
      if (cachedUser) {
        return cachedUser;
      }
    }

    // DB에서 최신 데이터 조회
    const user = (await this.getUserModel().findById(id)) as User | null;
    if (user) {
      // 캐시 갱신 (약관/알림 설정 변경 시에도 최신 데이터로 갱신)
      await cacheManager.set(cacheKey, user, 3600); // 1시간 캐시
    }
    return user;
  }

  async createUser(userData: {
    email: string;
    username: string;
    passwordHash?: string;
    name?: string;
    birthDate?: Date;
    profileImage?: string;
    termsConsents: TermsConsent[];
    notificationPreference?: NotificationPreference;
  }): Promise<User> {
    return (await this.getUserModel().createUser(userData)) as User;
  }

  async updateUser(
    id: string,
    updateData: Partial<User>,
  ): Promise<User | null> {
    const user = (await this.getUserModel().updateUser(id, {
      $set: updateData,
    })) as User | null;

    if (user) {
      const cacheKey = `user:${id}`;
      await cacheManager.del(cacheKey);
    }

    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    logger.info(`🗑️ 사용자 데이터 삭제 시작: ${id}`);

    try {
      // 1. 사용자가 작성한 게시글 삭제
      try {
        const { Article } = await import('../../models/article/article');
        const articleModel = Article.get();
        const deletedArticles = await articleModel.deleteByAuthor(id);
        logger.info(`  ✅ 삭제된 게시글 수: ${deletedArticles}`);
      } catch (error) {
        logger.error('  ❌ 게시글 삭제 중 오류:', error);
      }

      // 2. 사용자가 작성한 댓글 삭제
      try {
        const { Comment } = await import('../../models/article/comment');
        const commentModel = Comment.get();
        const deletedComments = await commentModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 댓글 수: ${deletedComments}`);
      } catch (error) {
        logger.error('  ❌ 댓글 삭제 중 오류:', error);
      }

      // 3. 댓글 좋아요 삭제
      try {
        const { CommentLike } = await import(
          '../../models/article/commentLike'
        );
        const commentLikeModel = CommentLike.get();
        const deletedCommentLikes = await commentLikeModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 댓글 좋아요 수: ${deletedCommentLikes}`);
      } catch (error) {
        logger.error('  ❌ 댓글 좋아요 삭제 중 오류:', error);
      }

      // 4. 게시글 좋아요 삭제
      try {
        const { ArticleLike } = await import(
          '../../models/article/articleLike'
        );
        const articleLikeModel = ArticleLike.get();
        const deletedArticleLikes = await articleLikeModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 게시글 좋아요 수: ${deletedArticleLikes}`);
      } catch (error) {
        logger.error('  ❌ 게시글 좋아요 삭제 중 오류:', error);
      }

      // 5. 게시글 북마크 삭제
      try {
        const { ArticleBookmark } = await import(
          '../../models/article/articleBookmark'
        );
        const bookmarkModel = ArticleBookmark.get();
        const deletedBookmarks = await bookmarkModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 북마크 수: ${deletedBookmarks}`);
      } catch (error) {
        logger.error('  ❌ 북마크 삭제 중 오류:', error);
      }

      // 6. 채팅 메시지 삭제 (소프트 삭제)
      try {
        const { MessageModel } = await import('../../models/chat/message');
        const messageModel = new MessageModel();
        const deletedMessages = await messageModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 메시지 수: ${deletedMessages}`);
      } catch (error) {
        logger.error('  ❌ 메시지 삭제 중 오류:', error);
      }

      // 7. 생성한 채팅방 삭제
      try {
        const { ChatRoomModel } = await import('../../models/chat/chatRoom');
        const chatRoomModel = new ChatRoomModel();
        const deletedChatRooms = await chatRoomModel.deleteByUser(id);
        logger.info(`  ✅ 삭제된 채팅방 수: ${deletedChatRooms}`);
      } catch (error) {
        logger.error('  ❌ 채팅방 삭제 중 오류:', error);
      }

      // 8. 마지막으로 사용자 계정 삭제
      const deleted = await this.getUserModel().deleteUser(id);

      if (deleted) {
        const cacheKey = `user:${id}`;
        await cacheManager.del(cacheKey);
        logger.info(`✅ 사용자 계정 및 모든 데이터 삭제 완료: ${id}`);
      }

      return deleted;
    } catch (error) {
      logger.error('❌ 사용자 데이터 삭제 중 오류 발생:', error);
      throw error;
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
   * Get user statistics including upcoming liked concerts count
   * 사용자 통계 조회 - 좋아요한 다가오는 콘서트 개수 포함
   */
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
