import { ObjectId, Collection, Db } from 'mongodb';
import logger from '../../utils/logger/logger';

export interface IComment {
  _id: ObjectId;
  article_id: ObjectId;
  author_id: ObjectId;
  content: string;
  parent_id: ObjectId | null;
  created_at: Date;
  updated_at: Date;
  likes_count: number;
}

// 집계 결과 타입을 위한 인터페이스
interface ArticleCommentCount {
  _id: ObjectId;
  count: number;
}

interface UserCommentActivity {
  _id: null;
  totalComments: number;
  totalLikesReceived: number;
  recentComments: number;
}

export class CommentModel {
  private db: Db;
  private collection: Collection<IComment>;
  private indexesCreated = false; // ✅ 인덱스 생성 상태 추적

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<IComment>('comments');
    // 🚀 생성자에서 인덱스 생성하지 않음
  }

  // 🛡️ 지연된 인덱스 생성 - 실제 사용 시점에 호출
  private async ensureIndexes(): Promise<void> {
    if (this.indexesCreated) return;

    try {
      await this.createIndexes();
      this.indexesCreated = true;
      logger.info('✅ Comment indexes created successfully');
    } catch (error) {
      logger.error('❌ Failed to create Comment indexes:', error);
      // 인덱스 생성 실패해도 앱은 계속 실행
    }
  }

  // 🔧 모든 데이터베이스 작업 전에 인덱스 확인
  private async withIndexes<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureIndexes();
    return operation();
  }

  private async createIndexes() {
    try {
      logger.info('Comment 인덱스 생성 시작...');

      // 조회 최적화 인덱스
      await this.collection.createIndex({ article_id: 1, created_at: -1 });
      await this.collection.createIndex({ parent_id: 1, created_at: 1 });
      await this.collection.createIndex({ author_id: 1, created_at: -1 });

      logger.info('✅ Comment 인덱스 생성 완료');
    } catch (error) {
      logger.error('❌ Comment 인덱스 생성 중 오류:', error);
    }
  }

  // ✅ 모든 메서드에 withIndexes() 적용
  async create(
    commentData: Omit<
      IComment,
      '_id' | 'created_at' | 'updated_at' | 'likes_count'
    >,
  ): Promise<IComment> {
    return this.withIndexes(async () => {
      if (
        !ObjectId.isValid(commentData.article_id) ||
        !ObjectId.isValid(commentData.author_id)
      ) {
        throw new Error('유효하지 않은 ID입니다.');
      }

      // parent_id가 제공된 경우 유효성 검사
      if (commentData.parent_id && !ObjectId.isValid(commentData.parent_id)) {
        throw new Error('유효하지 않은 부모 댓글 ID입니다.');
      }

      const now = new Date();
      const comment: IComment = {
        _id: new ObjectId(),
        article_id: new ObjectId(commentData.article_id),
        author_id: new ObjectId(commentData.author_id),
        content: commentData.content,
        parent_id: commentData.parent_id
          ? new ObjectId(commentData.parent_id)
          : null,
        created_at: now,
        updated_at: now,
        likes_count: 0,
      };

      const result = await this.collection.insertOne(comment);
      if (!result.insertedId) {
        throw new Error('댓글 생성에 실패했습니다.');
      }

      return comment;
    });
  }

  // 댓글 조회 (ID로)
  async findById(id: string): Promise<IComment | null> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return null;
      }
      return await this.collection.findOne({ _id: new ObjectId(id) });
    });
  }

  // 게시글의 댓글 목록 조회 (계층형)
  async findByArticle(
    articleId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ comments: IComment[]; total: number }> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(articleId)) {
        return { comments: [], total: 0 };
      }

      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      // 최상위 댓글만 조회 (parent_id가 null인 것들)
      const [comments, total] = await Promise.all([
        this.collection
          .find({
            article_id: new ObjectId(articleId),
            parent_id: null,
          })
          .sort({ created_at: 1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments({
          article_id: new ObjectId(articleId),
          parent_id: null,
        }),
      ]);

      return { comments, total };
    });
  }

  // 대댓글 조회
  async findReplies(
    parentId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ comments: IComment[]; total: number }> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(parentId)) {
        return { comments: [], total: 0 };
      }

      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const [comments, total] = await Promise.all([
        this.collection
          .find({ parent_id: new ObjectId(parentId) })
          .sort({ created_at: 1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments({ parent_id: new ObjectId(parentId) }),
      ]);

      return { comments, total };
    });
  }

  // 게시글의 모든 댓글 조회 (대댓글 포함)
  async findAllByArticle(articleId: string): Promise<IComment[]> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(articleId)) {
        return [];
      }

      return await this.collection
        .find({ article_id: new ObjectId(articleId) })
        .sort({ created_at: 1 })
        .toArray();
    });
  }

  // 댓글 수정
  async updateById(id: string, content: string): Promise<IComment | null> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            content,
            updated_at: new Date(),
          },
        },
        { returnDocument: 'after' },
      );

      return result || null;
    });
  }

  // 댓글 삭제
  async deleteById(id: string): Promise<IComment | null> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      // 먼저 대댓글들도 삭제
      await this.collection.deleteMany({ parent_id: new ObjectId(id) });

      // 그 다음 본 댓글 삭제
      const result = await this.collection.findOneAndDelete({
        _id: new ObjectId(id),
      });
      return result || null;
    });
  }

  // 좋아요 수 업데이트
  async updateLikesCount(id: string, increment: number): Promise<void> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return;
      }

      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: { likes_count: increment },
          $set: { updated_at: new Date() },
        },
      );
    });
  }

  // 작성자별 댓글 조회
  async findByAuthor(
    authorId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ comments: IComment[]; total: number }> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(authorId)) {
        return { comments: [], total: 0 };
      }

      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const [comments, total] = await Promise.all([
        this.collection
          .find({ author_id: new ObjectId(authorId) })
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments({ author_id: new ObjectId(authorId) }),
      ]);

      return { comments, total };
    });
  }

  // 게시글의 댓글 수 조회
  async countByArticle(articleId: string): Promise<number> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(articleId)) {
        return 0;
      }

      return await this.collection.countDocuments({
        article_id: new ObjectId(articleId),
      });
    });
  }

  // 여러 게시글의 댓글 수를 배치로 조회 (N+1 해결)
  async countByArticleIds(
    articleIds: string[],
  ): Promise<Record<string, number>> {
    return this.withIndexes(async () => {
      if (articleIds.length === 0) return {};

      const validIds = articleIds.filter((id) => ObjectId.isValid(id));
      if (validIds.length === 0) return {};

      const objectIds = validIds.map((id) => new ObjectId(id));

      const results = await this.collection
        .aggregate<ArticleCommentCount>([
          {
            $match: {
              article_id: { $in: objectIds },
            },
          },
          {
            $group: {
              _id: '$article_id',
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      const countsMap: Record<string, number> = {};

      results.forEach((item) => {
        countsMap[item._id.toString()] = item.count;
      });

      // 댓글이 없는 게시글들은 0으로 초기화
      validIds.forEach((id) => {
        if (!countsMap[id]) {
          countsMap[id] = 0;
        }
      });

      return countsMap;
    });
  }

  // 게시글 삭제시 관련 댓글 삭제
  async deleteByArticle(articleId: string): Promise<number> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(articleId)) {
        return 0;
      }

      const result = await this.collection.deleteMany({
        article_id: new ObjectId(articleId),
      });

      return result.deletedCount || 0;
    });
  }

  // 사용자 삭제시 관련 댓글 삭제
  async deleteByUser(userId: string): Promise<number> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(userId)) {
        return 0;
      }

      const result = await this.collection.deleteMany({
        author_id: new ObjectId(userId),
      });

      return result.deletedCount || 0;
    });
  }

  // 댓글과 대댓글을 계층형으로 정리
  async findCommentsWithReplies(
    articleId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    comments: (IComment & { replies?: IComment[] })[];
    total: number;
  }> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(articleId)) {
        return { comments: [], total: 0 };
      }

      const { page = 1, limit = 20 } = options;

      // 최상위 댓글 조회
      const { comments: parentComments, total } = await this.findByArticle(
        articleId,
        { page, limit },
      );

      if (parentComments.length === 0) {
        return { comments: [], total };
      }

      // 각 최상위 댓글의 대댓글들 조회
      const commentsWithReplies = await Promise.all(
        parentComments.map(async (comment) => {
          const { comments: replies } = await this.findReplies(
            comment._id.toString(),
          );
          return { ...comment, replies };
        }),
      );

      return { comments: commentsWithReplies, total };
    });
  }

  // 인기 댓글 조회 (좋아요 수 기준, 특정 게시글)
  async findPopularCommentsByArticle(
    articleId: string,
    options: {
      page?: number;
      limit?: number;
      days?: number;
    } = {},
  ): Promise<{ comments: IComment[]; total: number }> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(articleId)) {
        return { comments: [], total: 0 };
      }

      const { page = 1, limit = 20, days = 7 } = options;
      const skip = (page - 1) * limit;

      // 최근 N일간의 댓글만 대상
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const filter: any = {
        article_id: new ObjectId(articleId),
        created_at: { $gte: dateThreshold },
      };

      const [comments, total] = await Promise.all([
        this.collection
          .find(filter)
          .sort({
            likes_count: -1, // 좋아요 수 우선
            created_at: -1, // 최신순 보조
          })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments(filter),
      ]);

      return { comments, total };
    });
  }

  // 전체 인기 댓글 조회 (모든 게시글 대상)
  async findMostPopularComments(
    options: {
      page?: number;
      limit?: number;
      days?: number;
      minLikes?: number;
    } = {},
  ): Promise<{ comments: IComment[]; total: number }> {
    return this.withIndexes(async () => {
      const { page = 1, limit = 20, days = 7, minLikes = 1 } = options;
      const skip = (page - 1) * limit;

      // 최근 N일간의 댓글만 대상
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const filter: any = {
        created_at: { $gte: dateThreshold },
        likes_count: { $gte: minLikes },
      };

      const [comments, total] = await Promise.all([
        this.collection
          .find(filter)
          .sort({
            likes_count: -1, // 좋아요 수 우선
            created_at: -1, // 최신순 보조
          })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments(filter),
      ]);

      return { comments, total };
    });
  }

  // 여러 댓글의 좋아요 수를 배치로 업데이트 (동기화용)
  async updateLikesCountForComments(
    updates: { id: string; likes_count: number }[],
  ): Promise<void> {
    return this.withIndexes(async () => {
      if (updates.length === 0) return;

      const bulkOps = updates.map((update) => ({
        updateOne: {
          filter: { _id: new ObjectId(update.id) },
          update: {
            $set: {
              likes_count: update.likes_count,
              updated_at: new Date(),
            },
          },
        },
      }));

      await this.collection.bulkWrite(bulkOps);
    });
  }

  // 사용자의 댓글 활동 통계
  async getUserCommentActivity(
    userId: string,
    days: number = 30,
  ): Promise<{
    totalComments: number;
    recentComments: number;
    totalLikesReceived: number;
    avgLikesPerComment: number;
  }> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(userId)) {
        return {
          totalComments: 0,
          recentComments: 0,
          totalLikesReceived: 0,
          avgLikesPerComment: 0,
        };
      }

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const pipeline = [
        {
          $match: {
            author_id: new ObjectId(userId),
          },
        },
        {
          $group: {
            _id: null,
            totalComments: { $sum: 1 },
            totalLikesReceived: { $sum: '$likes_count' },
            recentComments: {
              $sum: {
                $cond: [{ $gte: ['$created_at', dateThreshold] }, 1, 0],
              },
            },
          },
        },
      ];

      const [result] = await this.collection
        .aggregate<UserCommentActivity>(pipeline)
        .toArray();

      if (!result) {
        return {
          totalComments: 0,
          recentComments: 0,
          totalLikesReceived: 0,
          avgLikesPerComment: 0,
        };
      }

      const avgLikesPerComment =
        result.totalComments > 0
          ? result.totalLikesReceived / result.totalComments
          : 0;

      return {
        totalComments: result.totalComments,
        recentComments: result.recentComments,
        totalLikesReceived: result.totalLikesReceived,
        avgLikesPerComment: Math.round(avgLikesPerComment * 100) / 100,
      };
    });
  }
}

// 전역 Comment 인스턴스
let commentModel: CommentModel;

export const initializeCommentModel = (db: Db): CommentModel => {
  commentModel = new CommentModel(db);
  return commentModel;
};

export const getCommentModel = (): CommentModel => {
  if (!commentModel) {
    throw new Error('Comment 모델이 초기화되지 않았습니다.');
  }
  return commentModel;
};

export const Comment = {
  init: initializeCommentModel,
  get: getCommentModel,
};
