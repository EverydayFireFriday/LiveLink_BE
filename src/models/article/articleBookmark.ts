// models/article/articleBookmark.ts
import { ObjectId, Collection, Db } from "mongodb";

export interface IArticleBookmark {
  _id: ObjectId;
  article_id: ObjectId;
  user_id: ObjectId;
  created_at: Date;
}

export class ArticleBookmarkModel {
  private db: Db;
  private collection: Collection<IArticleBookmark>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<IArticleBookmark>("article_bookmarks");
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      console.log("ArticleBookmark 인덱스 생성 시작...");

      // 중복 북마크 방지를 위한 복합 유니크 인덱스
      await this.collection.createIndex(
        { article_id: 1, user_id: 1 },
        { unique: true }
      );

      // 조회 최적화 인덱스
      await this.collection.createIndex({ article_id: 1, created_at: -1 });
      await this.collection.createIndex({ user_id: 1, created_at: -1 });

      console.log("✅ ArticleBookmark 인덱스 생성 완료");
    } catch (error) {
      console.error("❌ ArticleBookmark 인덱스 생성 중 오류:", error);
    }
  }

  // 북마크 추가
  async create(articleId: string, userId: string): Promise<IArticleBookmark> {
    if (!ObjectId.isValid(articleId) || !ObjectId.isValid(userId)) {
      throw new Error("유효하지 않은 ID입니다.");
    }

    const articleObjectId = new ObjectId(articleId);
    const userObjectId = new ObjectId(userId);

    // 이미 북마크했는지 확인
    const existingBookmark = await this.collection.findOne({
      article_id: articleObjectId,
      user_id: userObjectId,
    });

    if (existingBookmark) {
      throw new Error("이미 북마크한 게시글입니다.");
    }

    const bookmark: IArticleBookmark = {
      _id: new ObjectId(),
      article_id: articleObjectId,
      user_id: userObjectId,
      created_at: new Date(),
    };

    const result = await this.collection.insertOne(bookmark);
    if (!result.insertedId) {
      throw new Error("북마크 추가에 실패했습니다.");
    }

    return bookmark;
  }

  // 북마크 삭제
  async delete(
    articleId: string,
    userId: string
  ): Promise<IArticleBookmark | null> {
    if (!ObjectId.isValid(articleId) || !ObjectId.isValid(userId)) {
      return null;
    }

    const result = await this.collection.findOneAndDelete({
      article_id: new ObjectId(articleId),
      user_id: new ObjectId(userId),
    });

    return result || null;
  }

  // 북마크 상태 확인
  async exists(articleId: string, userId: string): Promise<boolean> {
    if (!ObjectId.isValid(articleId) || !ObjectId.isValid(userId)) {
      return false;
    }

    const bookmark = await this.collection.findOne({
      article_id: new ObjectId(articleId),
      user_id: new ObjectId(userId),
    });

    return !!bookmark;
  }

  // 게시글의 북마크 수 조회
  async countByArticle(articleId: string): Promise<number> {
    if (!ObjectId.isValid(articleId)) {
      return 0;
    }

    return await this.collection.countDocuments({
      article_id: new ObjectId(articleId),
    });
  }

  // 여러 게시글의 북마크 수를 한 번에 조회 (N+1 해결)
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

    // 북마크가 없는 게시글들은 0으로 초기화
    validIds.forEach((id) => {
      if (!countsMap[id]) {
        countsMap[id] = 0;
      }
    });

    return countsMap;
  }

  // 여러 게시글에 대한 특정 사용자의 북마크 상태 확인 (배치)
  async checkBookmarkStatusForArticles(
    userId: string,
    articleIds: string[]
  ): Promise<Record<string, boolean>> {
    if (!ObjectId.isValid(userId) || articleIds.length === 0) return {};

    const validArticleIds = articleIds.filter((id) => ObjectId.isValid(id));
    if (validArticleIds.length === 0) return {};

    const userObjectId = new ObjectId(userId);
    const articleObjectIds = validArticleIds.map((id) => new ObjectId(id));

    const bookmarks = await this.collection
      .find({
        user_id: userObjectId,
        article_id: { $in: articleObjectIds },
      })
      .toArray();

    const bookmarkStatusMap: Record<string, boolean> = {};

    // 북마크한 게시글들을 true로 설정
    bookmarks.forEach((bookmark) => {
      bookmarkStatusMap[bookmark.article_id.toString()] = true;
    });

    // 북마크하지 않은 게시글들은 false로 초기화
    validArticleIds.forEach((id) => {
      if (!bookmarkStatusMap[id]) {
        bookmarkStatusMap[id] = false;
      }
    });

    return bookmarkStatusMap;
  }

  // 여러 사용자의 북마크 수를 한 번에 조회
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

    // 북마크가 없는 사용자들은 0으로 초기화
    validIds.forEach((id) => {
      if (!countsMap[id]) {
        countsMap[id] = 0;
      }
    });

    return countsMap;
  }

  // 사용자가 북마크한 게시글 ID 목록
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

    const [bookmarks, total] = await Promise.all([
      this.collection
        .find({ user_id: new ObjectId(userId) })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({ user_id: new ObjectId(userId) }),
    ]);

    const articleIds = bookmarks.map((bookmark) =>
      bookmark.article_id.toString()
    );
    return { articleIds, total };
  }

  // 사용자의 북마크 목록 (게시글 정보 포함)
  async findBookmarkedArticlesByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ bookmarks: any[]; total: number }> {
    if (!ObjectId.isValid(userId)) {
      return { bookmarks: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // 집계 파이프라인을 사용하여 게시글 정보와 조인
    const pipeline = [
      { $match: { user_id: new ObjectId(userId) } },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "articles",
          localField: "article_id",
          foreignField: "_id",
          as: "article",
        },
      },
      {
        $unwind: {
          path: "$article",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const [bookmarks, total] = await Promise.all([
      this.collection.aggregate(pipeline).toArray(),
      this.collection.countDocuments({ user_id: new ObjectId(userId) }),
    ]);

    return { bookmarks, total };
  }

  // 게시글을 북마크한 사용자 ID 목록
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

    const [bookmarks, total] = await Promise.all([
      this.collection
        .find({ article_id: new ObjectId(articleId) })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({ article_id: new ObjectId(articleId) }),
    ]);

    const userIds = bookmarks.map((bookmark) => bookmark.user_id.toString());
    return { userIds, total };
  }

  // 여러 게시글의 북마크 상태 일괄 조회
  async findBookmarkStatusBatch(
    articleIds: string[],
    userId: string
  ): Promise<Map<string, boolean>> {
    const bookmarkStatusMap = new Map<string, boolean>();

    if (!ObjectId.isValid(userId) || articleIds.length === 0) {
      return bookmarkStatusMap;
    }

    const validArticleIds = articleIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (validArticleIds.length === 0) {
      return bookmarkStatusMap;
    }

    const bookmarks = await this.collection
      .find({
        article_id: { $in: validArticleIds },
        user_id: new ObjectId(userId),
      })
      .toArray();

    // 모든 articleId를 false로 초기화
    articleIds.forEach((id) => {
      if (ObjectId.isValid(id)) {
        bookmarkStatusMap.set(id, false);
      }
    });

    // 북마크한 게시글들을 true로 설정
    bookmarks.forEach((bookmark) => {
      bookmarkStatusMap.set(bookmark.article_id.toString(), true);
    });

    return bookmarkStatusMap;
  }

  // 사용자의 북마크 통계
  async getUserBookmarkStats(userId: string): Promise<{
    totalBookmarks: number;
    recentBookmarks: number; // 최근 30일
  }> {
    if (!ObjectId.isValid(userId)) {
      return { totalBookmarks: 0, recentBookmarks: 0 };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalBookmarks, recentBookmarks] = await Promise.all([
      this.collection.countDocuments({ user_id: new ObjectId(userId) }),
      this.collection.countDocuments({
        user_id: new ObjectId(userId),
        created_at: { $gte: thirtyDaysAgo },
      }),
    ]);

    return { totalBookmarks, recentBookmarks };
  }

  // 게시글 삭제시 관련 북마크 삭제
  async deleteByArticle(articleId: string): Promise<number> {
    if (!ObjectId.isValid(articleId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      article_id: new ObjectId(articleId),
    });

    return result.deletedCount || 0;
  }

  // 특정 게시글들의 북마크 관계를 배치로 삭제
  async deleteByArticleIds(articleIds: string[]): Promise<void> {
    if (articleIds.length === 0) return;

    const validIds = articleIds.filter((id) => ObjectId.isValid(id));
    if (validIds.length === 0) return;

    const objectIds = validIds.map((id) => new ObjectId(id));

    await this.collection.deleteMany({
      article_id: { $in: objectIds },
    });
  }

  // 사용자 삭제시 관련 북마크 삭제
  async deleteByUser(userId: string): Promise<number> {
    if (!ObjectId.isValid(userId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      user_id: new ObjectId(userId),
    });

    return result.deletedCount || 0;
  }

  // 특정 사용자들의 북마크 관계를 배치로 삭제
  async deleteByUserIds(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    const validIds = userIds.filter((id) => ObjectId.isValid(id));
    if (validIds.length === 0) return;

    const objectIds = validIds.map((id) => new ObjectId(id));

    await this.collection.deleteMany({
      user_id: { $in: objectIds },
    });
  }

  // 인기 북마크 게시글 조회 (북마크 수 기준)
  async findPopularBookmarkedArticles(
    options: {
      page?: number;
      limit?: number;
      days?: number; // 최근 며칠간의 데이터
    } = {}
  ): Promise<{ articles: any[]; total: number }> {
    const { page = 1, limit = 20, days = 30 } = options;
    const skip = (page - 1) * limit;

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    const pipeline = [
      { $match: { created_at: { $gte: dateFilter } } },
      {
        $group: {
          _id: "$article_id",
          bookmarkCount: { $sum: 1 },
          latestBookmark: { $max: "$created_at" },
        },
      },
      { $sort: { bookmarkCount: -1, latestBookmark: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "articles",
          localField: "_id",
          foreignField: "_id",
          as: "article",
        },
      },
      {
        $unwind: {
          path: "$article",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          article: 1,
          bookmarkCount: 1,
          latestBookmark: 1,
        },
      },
    ];

    const articles = await this.collection.aggregate(pipeline).toArray();

    // 전체 개수를 위한 별도 집계
    const totalPipeline = [
      { $match: { created_at: { $gte: dateFilter } } },
      { $group: { _id: "$article_id" } },
      { $count: "total" },
    ];

    const totalResult = await this.collection
      .aggregate(totalPipeline)
      .toArray();
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    return { articles, total };
  }

  // 사용자별 북마크 폴더 기능을 위한 메서드 (선택사항)
  async findBookmarkedArticlesByUserWithFolders(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      folderId?: string; // 특정 폴더의 북마크만 조회
    } = {}
  ): Promise<{
    bookmarks: Array<{ article: any; created_at: Date; folder?: string }>;
    total: number;
  }> {
    if (!ObjectId.isValid(userId)) {
      return { bookmarks: [], total: 0 };
    }

    const { page = 1, limit = 20, folderId } = options;
    const skip = (page - 1) * limit;

    const matchStage: any = {
      user_id: new ObjectId(userId),
    };

    if (folderId && ObjectId.isValid(folderId)) {
      matchStage.folder_id = new ObjectId(folderId);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "articles",
          localField: "article_id",
          foreignField: "_id",
          as: "article",
        },
      },
      {
        $unwind: "$article",
      },
      {
        $match: {
          "article.is_published": true, // 발행된 게시글만
        },
      },
      {
        $sort: { created_at: -1 },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await this.collection.aggregate(pipeline).toArray();

    const bookmarks = (result.data || []).map((item: any) => ({
      article: item.article,
      created_at: item.created_at,
      folder: item.folder_id ? item.folder_id.toString() : undefined,
    }));

    const total = result.totalCount[0]?.count || 0;

    return { bookmarks, total };
  }
}

// 전역 ArticleBookmark 인스턴스
let articleBookmarkModel: ArticleBookmarkModel;

export const initializeArticleBookmarkModel = (
  db: Db
): ArticleBookmarkModel => {
  articleBookmarkModel = new ArticleBookmarkModel(db);
  return articleBookmarkModel;
};

export const getArticleBookmarkModel = (): ArticleBookmarkModel => {
  if (!articleBookmarkModel) {
    throw new Error("ArticleBookmark 모델이 초기화되지 않았습니다.");
  }
  return articleBookmarkModel;
};

export const ArticleBookmark = {
  init: initializeArticleBookmarkModel,
  get: getArticleBookmarkModel,
};
