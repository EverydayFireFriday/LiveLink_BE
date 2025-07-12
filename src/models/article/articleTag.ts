// models/article/articleTag.ts
import { ObjectId, Collection, Db } from "mongodb";

export interface IArticleTag {
  _id: ObjectId;
  article_id: ObjectId;
  tag_id: ObjectId;
  created_at: Date;
}

export class ArticleTagModel {
  private db: Db;
  private collection: Collection<IArticleTag>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<IArticleTag>("article_tags");
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      console.log("ArticleTag 인덱스 생성 시작...");

      // 중복 연결 방지를 위한 복합 유니크 인덱스
      await this.collection.createIndex(
        { article_id: 1, tag_id: 1 },
        { unique: true }
      );

      // 조회 최적화 인덱스
      await this.collection.createIndex({ article_id: 1 });
      await this.collection.createIndex({ tag_id: 1 });

      console.log("✅ ArticleTag 인덱스 생성 완료");
    } catch (error) {
      console.error("❌ ArticleTag 인덱스 생성 중 오류:", error);
    }
  }

  // Article-Tag 연결 생성
  async create(articleId: string, tagId: string): Promise<IArticleTag> {
    if (!ObjectId.isValid(articleId) || !ObjectId.isValid(tagId)) {
      throw new Error("유효하지 않은 ID입니다.");
    }

    const articleObjectId = new ObjectId(articleId);
    const tagObjectId = new ObjectId(tagId);

    // 이미 연결되어 있는지 확인
    const existingConnection = await this.collection.findOne({
      article_id: articleObjectId,
      tag_id: tagObjectId,
    });

    if (existingConnection) {
      throw new Error("이미 연결된 게시글-태그입니다.");
    }

    const articleTag: IArticleTag = {
      _id: new ObjectId(),
      article_id: articleObjectId,
      tag_id: tagObjectId,
      created_at: new Date(),
    };

    const result = await this.collection.insertOne(articleTag);
    if (!result.insertedId) {
      throw new Error("게시글-태그 연결에 실패했습니다.");
    }

    return articleTag;
  }

  // 여러 태그를 게시글에 연결
  async createMany(
    articleId: string,
    tagIds: string[]
  ): Promise<IArticleTag[]> {
    if (!ObjectId.isValid(articleId) || tagIds.length === 0) {
      throw new Error("유효하지 않은 데이터입니다.");
    }

    const validTagIds = tagIds.filter((id) => ObjectId.isValid(id));
    if (validTagIds.length === 0) {
      throw new Error("유효한 태그 ID가 없습니다.");
    }

    const articleObjectId = new ObjectId(articleId);
    const now = new Date();

    // 기존 연결 확인
    const existingConnections = await this.collection
      .find({
        article_id: articleObjectId,
        tag_id: { $in: validTagIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    const existingTagIds = existingConnections.map((conn) =>
      conn.tag_id.toString()
    );
    const newTagIds = validTagIds.filter((id) => !existingTagIds.includes(id));

    if (newTagIds.length === 0) {
      return []; // 모든 태그가 이미 연결되어 있음
    }

    // 새로운 연결들 생성
    const articleTags: IArticleTag[] = newTagIds.map((tagId) => ({
      _id: new ObjectId(),
      article_id: articleObjectId,
      tag_id: new ObjectId(tagId),
      created_at: now,
    }));

    const result = await this.collection.insertMany(articleTags);
    if (!result.insertedCount) {
      throw new Error("게시글-태그 연결에 실패했습니다.");
    }

    return articleTags;
  }

  // Article-Tag 연결 삭제
  async delete(articleId: string, tagId: string): Promise<IArticleTag | null> {
    if (!ObjectId.isValid(articleId) || !ObjectId.isValid(tagId)) {
      return null;
    }

    const result = await this.collection.findOneAndDelete({
      article_id: new ObjectId(articleId),
      tag_id: new ObjectId(tagId),
    });

    return result || null;
  }

  // 게시글의 모든 태그 연결 삭제
  async deleteByArticle(articleId: string): Promise<number> {
    if (!ObjectId.isValid(articleId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      article_id: new ObjectId(articleId),
    });

    return result.deletedCount || 0;
  }

  // 태그의 모든 게시글 연결 삭제
  async deleteByTag(tagId: string): Promise<number> {
    if (!ObjectId.isValid(tagId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      tag_id: new ObjectId(tagId),
    });

    return result.deletedCount || 0;
  }

  // 게시글의 태그 목록 조회
  async findTagsByArticle(articleId: string): Promise<any[]> {
    if (!ObjectId.isValid(articleId)) {
      return [];
    }

    const pipeline = [
      { $match: { article_id: new ObjectId(articleId) } },
      {
        $lookup: {
          from: "tags",
          localField: "tag_id",
          foreignField: "_id",
          as: "tag",
        },
      },
      {
        $unwind: "$tag",
      },
      {
        $project: {
          _id: "$tag._id",
          name: "$tag.name",
          created_at: "$tag.created_at",
        },
      },
      { $sort: { name: 1 } },
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  // 태그의 게시글 목록 조회
  async findArticlesByTag(
    tagId: string,
    options: {
      page?: number;
      limit?: number;
      publishedOnly?: boolean;
    } = {}
  ): Promise<{ articles: any[]; total: number }> {
    if (!ObjectId.isValid(tagId)) {
      return { articles: [], total: 0 };
    }

    const { page = 1, limit = 20, publishedOnly = true } = options;
    const skip = (page - 1) * limit;

    const matchStage: any = { tag_id: new ObjectId(tagId) };

    const pipeline: any[] = [
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
    ];

    // 발행된 게시글만 조회하는 경우
    if (publishedOnly) {
      pipeline.push({
        $match: { "article.is_published": true },
      });
    }

    pipeline.push(
      { $sort: { "article.created_at": -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          article: 1,
        },
      }
    );

    // 총 개수를 위한 별도 파이프라인
    const countPipeline: any[] = [
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
    ];

    if (publishedOnly) {
      countPipeline.push({
        $match: { "article.is_published": true },
      });
    }

    countPipeline.push({ $count: "total" });

    const [articles, countResult] = await Promise.all([
      this.collection.aggregate(pipeline).toArray(),
      this.collection.aggregate(countPipeline).toArray(),
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    return {
      articles: articles.map((item) => item.article),
      total,
    };
  }

  // 게시글의 태그 업데이트 (기존 태그 삭제 후 새 태그 추가)
  async updateArticleTags(
    articleId: string,
    tagIds: string[]
  ): Promise<IArticleTag[]> {
    if (!ObjectId.isValid(articleId)) {
      throw new Error("유효하지 않은 게시글 ID입니다.");
    }

    // 기존 태그 연결 삭제
    await this.deleteByArticle(articleId);

    // 새 태그 연결 생성
    if (tagIds.length === 0) {
      return [];
    }

    return await this.createMany(articleId, tagIds);
  }

  // 인기 태그 조회 (게시글 수 기준)
  async findPopularTags(
    options: {
      limit?: number;
      publishedOnly?: boolean;
    } = {}
  ): Promise<any[]> {
    const { limit = 10, publishedOnly = true } = options;

    const pipeline: any[] = [];

    // 발행된 게시글만 고려하는 경우
    if (publishedOnly) {
      pipeline.push({
        $lookup: {
          from: "articles",
          localField: "article_id",
          foreignField: "_id",
          as: "article",
        },
      });
      pipeline.push({
        $match: { "article.is_published": true },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: "$tag_id",
          articleCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "_id",
          foreignField: "_id",
          as: "tag",
        },
      },
      {
        $unwind: "$tag",
      },
      {
        $project: {
          _id: "$tag._id",
          name: "$tag.name",
          created_at: "$tag.created_at",
          articleCount: 1,
        },
      },
      { $sort: { articleCount: -1, name: 1 } },
      { $limit: limit }
    );

    return await this.collection.aggregate(pipeline).toArray();
  }

  // 연관 태그 조회 (같은 게시글에 사용된 태그들)
  async findRelatedTags(
    tagId: string,
    options: {
      limit?: number;
    } = {}
  ): Promise<any[]> {
    if (!ObjectId.isValid(tagId)) {
      return [];
    }

    const { limit = 10 } = options;

    const pipeline = [
      // 해당 태그가 사용된 게시글들 찾기
      { $match: { tag_id: new ObjectId(tagId) } },

      // 같은 게시글의 다른 태그들 찾기
      {
        $lookup: {
          from: "article_tags",
          localField: "article_id",
          foreignField: "article_id",
          as: "relatedTags",
        },
      },

      // 배열 풀기
      { $unwind: "$relatedTags" },

      // 자기 자신 제외
      { $match: { "relatedTags.tag_id": { $ne: new ObjectId(tagId) } } },

      // 태그별로 그룹핑하여 횟수 세기
      {
        $group: {
          _id: "$relatedTags.tag_id",
          count: { $sum: 1 },
        },
      },

      // 태그 정보 조인
      {
        $lookup: {
          from: "tags",
          localField: "_id",
          foreignField: "_id",
          as: "tag",
        },
      },

      { $unwind: "$tag" },

      {
        $project: {
          _id: "$tag._id",
          name: "$tag.name",
          created_at: "$tag.created_at",
          relatedCount: "$count",
        },
      },

      { $sort: { relatedCount: -1, name: 1 } },
      { $limit: limit },
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }
}

// 전역 ArticleTag 인스턴스
let articleTagModel: ArticleTagModel;

export const initializeArticleTagModel = (db: Db): ArticleTagModel => {
  articleTagModel = new ArticleTagModel(db);
  return articleTagModel;
};

export const getArticleTagModel = (): ArticleTagModel => {
  if (!articleTagModel) {
    throw new Error("ArticleTag 모델이 초기화되지 않았습니다.");
  }
  return articleTagModel;
};

export const ArticleTag = {
  init: initializeArticleTagModel,
  get: getArticleTagModel,
};
