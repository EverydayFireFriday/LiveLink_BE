// models/article/articleLike.ts
import { ObjectId, Collection, Db } from "mongodb";

export interface IArticleLike {
  _id: ObjectId;
  article_id: ObjectId;
  user_id: ObjectId;
  created_at: Date;
}

export class ArticleLikeModel {
  private db: Db;
  private collection: Collection<IArticleLike>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<IArticleLike>("article_likes");
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      console.log("ArticleLike 인덱스 생성 시작...");

      // 개별 인덱스 생성으로 타입 에러 방지

      // 복합 유니크 인덱스
      try {
        await this.collection.createIndex(
          { article_id: 1, user_id: 1 },
          { unique: true, name: "article_like_unique" }
        );
        console.log("✅ article_like_unique 인덱스 생성");
      } catch (error: any) {
        if (error.code === 85) {
          console.log("ℹ️ article_like_unique 인덱스가 이미 존재함 (스킵)");
        } else {
          console.warn(
            "⚠️ article_like_unique 인덱스 생성 실패:",
            error.message
          );
        }
      }

      // article_id 조회 인덱스
      try {
        await this.collection.createIndex(
          { article_id: 1, created_at: -1 },
          { name: "article_like_article_idx" }
        );
        console.log("✅ article_like_article_idx 인덱스 생성");
      } catch (error: any) {
        if (error.code === 85) {
          console.log(
            "ℹ️ article_like_article_idx 인덱스가 이미 존재함 (스킵)"
          );
        } else {
          console.warn(
            "⚠️ article_like_article_idx 인덱스 생성 실패:",
            error.message
          );
        }
      }

      // user_id 조회 인덱스
      try {
        await this.collection.createIndex(
          { user_id: 1, created_at: -1 },
          { name: "article_like_user_idx" }
        );
        console.log("✅ article_like_user_idx 인덱스 생성");
      } catch (error: any) {
        if (error.code === 85) {
          console.log("ℹ️ article_like_user_idx 인덱스가 이미 존재함 (스킵)");
        } else {
          console.warn(
            "⚠️ article_like_user_idx 인덱스 생성 실패:",
            error.message
          );
        }
      }

      console.log("✅ ArticleLike 인덱스 생성 완료");
    } catch (error) {
      console.error("❌ ArticleLike 인덱스 생성 중 오류:", error);
      console.log("⚠️ 인덱스 없이 계속 진행합니다...");
    }
  }

  // 좋아요 추가
  async create(articleId: string, userId: string): Promise<IArticleLike> {
    if (!ObjectId.isValid(articleId) || !ObjectId.isValid(userId)) {
      throw new Error("유효하지 않은 ID입니다.");
    }

    const articleObjectId = new ObjectId(articleId);
    const userObjectId = new ObjectId(userId);

    // 이미 좋아요했는지 확인
    const existingLike = await this.collection.findOne({
      article_id: articleObjectId,
      user_id: userObjectId,
    });

    if (existingLike) {
      throw new Error("이미 좋아요한 게시글입니다.");
    }

    const like: IArticleLike = {
      _id: new ObjectId(),
      article_id: articleObjectId,
      user_id: userObjectId,
      created_at: new Date(),
    };

    const result = await this.collection.insertOne(like);
    if (!result.insertedId) {
      throw new Error("좋아요 추가에 실패했습니다.");
    }

    return like;
  }

  // 좋아요 삭제
  async delete(
    articleId: string,
    userId: string
  ): Promise<IArticleLike | null> {
    if (!ObjectId.isValid(articleId) || !ObjectId.isValid(userId)) {
      return null;
    }

    const result = await this.collection.findOneAndDelete({
      article_id: new ObjectId(articleId),
      user_id: new ObjectId(userId),
    });

    return result || null;
  }

  // 좋아요 상태 확인
  async exists(articleId: string, userId: string): Promise<boolean> {
    if (!ObjectId.isValid(articleId) || !ObjectId.isValid(userId)) {
      return false;
    }

    const like = await this.collection.findOne({
      article_id: new ObjectId(articleId),
      user_id: new ObjectId(userId),
    });

    return !!like;
  }

  // 게시글의 좋아요 수 조회
  async countByArticle(articleId: string): Promise<number> {
    if (!ObjectId.isValid(articleId)) {
      return 0;
    }

    return await this.collection.countDocuments({
      article_id: new ObjectId(articleId),
    });
  }

  // 여러 게시글의 좋아요 수를 한 번에 조회 (N+1 해결)
  async countByArticleIds(
    articleIds: string[]
  ): Promise<Record<string, number>> {
    if (articleIds.length === 0) return {};

    // 유효한 ObjectId만 필터링
    const validIds = articleIds.filter((id) => ObjectId.isValid(id));
    if (validIds.length === 0) return {};

    const objectIds = validIds.map((id) => new ObjectId(id));

    const results = await this.collection
      .aggregate([
        {
          $match: {
            article_id: { $in: objectIds },
          },
        },
        {
          $group: {
            _id: "$article_id",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const countsMap: Record<string, number> = {};

    results.forEach((item) => {
      countsMap[item._id.toString()] = item.count;
    });

    // 좋아요가 없는 게시글들은 0으로 초기화
    validIds.forEach((id) => {
      if (!countsMap[id]) {
        countsMap[id] = 0;
      }
    });

    return countsMap;
  }

  // 여러 게시글에 대한 특정 사용자의 좋아요 상태 확인 (배치)
  async checkLikeStatusForArticles(
    userId: string,
    articleIds: string[]
  ): Promise<Record<string, boolean>> {
    if (!ObjectId.isValid(userId) || articleIds.length === 0) return {};

    const validArticleIds = articleIds.filter((id) => ObjectId.isValid(id));
    if (validArticleIds.length === 0) return {};

    const userObjectId = new ObjectId(userId);
    const articleObjectIds = validArticleIds.map((id) => new ObjectId(id));

    const likes = await this.collection
      .find({
        user_id: userObjectId,
        article_id: { $in: articleObjectIds },
      })
      .toArray();

    const likeStatusMap: Record<string, boolean> = {};

    // 좋아요한 게시글들을 true로 설정
    likes.forEach((like) => {
      likeStatusMap[like.article_id.toString()] = true;
    });

    // 좋아요하지 않은 게시글들은 false로 초기화
    validArticleIds.forEach((id) => {
      if (!likeStatusMap[id]) {
        likeStatusMap[id] = false;
      }
    });

    return likeStatusMap;
  }

  // 여러 사용자의 좋아요 수를 한 번에 조회
  async countByUserIds(userIds: string[]): Promise<Record<string, number>> {
    if (userIds.length === 0) return {};

    const validIds = userIds.filter((id) => ObjectId.isValid(id));
    if (validIds.length === 0) return {};

    const objectIds = validIds.map((id) => new ObjectId(id));

    const results = await this.collection
      .aggregate([
        {
          $match: {
            user_id: { $in: objectIds },
          },
        },
        {
          $group: {
            _id: "$user_id",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const countsMap: Record<string, number> = {};

    results.forEach((item) => {
      countsMap[item._id.toString()] = item.count;
    });

    // 좋아요가 없는 사용자들은 0으로 초기화
    validIds.forEach((id) => {
      if (!countsMap[id]) {
        countsMap[id] = 0;
      }
    });

    return countsMap;
  }

  // 사용자가 좋아요한 게시글 ID 목록
  async findArticleIdsByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ articleIds: string[]; total: number }> {
    if (!ObjectId.isValid(userId)) {
      return { articleIds: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.collection
        .find({ user_id: new ObjectId(userId) })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({ user_id: new ObjectId(userId) }),
    ]);

    const articleIds = likes.map((like) => like.article_id.toString());
    return { articleIds, total };
  }

  // 게시글을 좋아요한 사용자 ID 목록
  async findUserIdsByArticle(
    articleId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ userIds: string[]; total: number }> {
    if (!ObjectId.isValid(articleId)) {
      return { userIds: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.collection
        .find({ article_id: new ObjectId(articleId) })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({ article_id: new ObjectId(articleId) }),
    ]);

    const userIds = likes.map((like) => like.user_id.toString());
    return { userIds, total };
  }

  // 여러 게시글의 좋아요 상태 일괄 조회
  async findLikeStatusBatch(
    articleIds: string[],
    userId: string
  ): Promise<Map<string, boolean>> {
    const likeStatusMap = new Map<string, boolean>();

    if (!ObjectId.isValid(userId) || articleIds.length === 0) {
      return likeStatusMap;
    }

    const validArticleIds = articleIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (validArticleIds.length === 0) {
      return likeStatusMap;
    }

    const likes = await this.collection
      .find({
        article_id: { $in: validArticleIds },
        user_id: new ObjectId(userId),
      })
      .toArray();

    // 모든 articleId를 false로 초기화
    articleIds.forEach((id) => {
      if (ObjectId.isValid(id)) {
        likeStatusMap.set(id, false);
      }
    });

    // 좋아요한 게시글들을 true로 설정
    likes.forEach((like) => {
      likeStatusMap.set(like.article_id.toString(), true);
    });

    return likeStatusMap;
  }

  // 인기 게시글 조회 (최근 N일간 좋아요 수 기준)
  async findMostLikedArticles(
    options: {
      page?: number;
      limit?: number;
      days?: number;
    } = {}
  ): Promise<{
    articles: Array<{ article_id: string; likeCount: number }>;
    total: number;
  }> {
    const { page = 1, limit = 20, days = 7 } = options;
    const skip = (page - 1) * limit;

    // 최근 N일간의 좋아요만 집계
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const pipeline = [
      {
        $match: {
          created_at: { $gte: dateThreshold },
        },
      },
      {
        $group: {
          _id: "$article_id",
          likeCount: { $sum: 1 },
          latestLike: { $max: "$created_at" },
        },
      },
      {
        $sort: {
          likeCount: -1,
          latestLike: -1,
        },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await this.collection.aggregate(pipeline).toArray();

    const articles = (result.data || []).map((item: any) => ({
      article_id: item._id.toString(),
      likeCount: item.likeCount,
    }));

    const total = result.totalCount[0]?.count || 0;

    return { articles, total };
  }

  // 게시글 삭제시 관련 좋아요 삭제
  async deleteByArticle(articleId: string): Promise<number> {
    if (!ObjectId.isValid(articleId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      article_id: new ObjectId(articleId),
    });

    return result.deletedCount || 0;
  }

  // 특정 게시글들의 좋아요 관계를 배치로 삭제
  async deleteByArticleIds(articleIds: string[]): Promise<void> {
    if (articleIds.length === 0) return;

    const validIds = articleIds.filter((id) => ObjectId.isValid(id));
    if (validIds.length === 0) return;

    const objectIds = validIds.map((id) => new ObjectId(id));

    await this.collection.deleteMany({
      article_id: { $in: objectIds },
    });
  }

  // 사용자 삭제시 관련 좋아요 삭제
  async deleteByUser(userId: string): Promise<number> {
    if (!ObjectId.isValid(userId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      user_id: new ObjectId(userId),
    });

    return result.deletedCount || 0;
  }

  // 특정 사용자들의 좋아요 관계를 배치로 삭제
  async deleteByUserIds(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    const validIds = userIds.filter((id) => ObjectId.isValid(id));
    if (validIds.length === 0) return;

    const objectIds = validIds.map((id) => new ObjectId(id));

    await this.collection.deleteMany({
      user_id: { $in: objectIds },
    });
  }
}

// 전역 ArticleLike 인스턴스
let articleLikeModel: ArticleLikeModel;

export const initializeArticleLikeModel = (db: Db): ArticleLikeModel => {
  articleLikeModel = new ArticleLikeModel(db);
  return articleLikeModel;
};

export const getArticleLikeModel = (): ArticleLikeModel => {
  if (!articleLikeModel) {
    throw new Error("ArticleLike 모델이 초기화되지 않았습니다.");
  }
  return articleLikeModel;
};

export const ArticleLike = {
  init: initializeArticleLikeModel,
  get: getArticleLikeModel,
};
