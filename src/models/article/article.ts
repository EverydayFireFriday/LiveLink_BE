// models/article/article.ts
import { ObjectId, Collection, Db } from "mongodb";

// Article 인터페이스
export interface IArticle {
  _id: ObjectId;
  title: string;
  content_url: string;
  author_id: ObjectId;
  category_id: ObjectId | null;
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  views: number;
  likes_count: number;
}

// Article 모델 클래스
export class ArticleModel {
  private db: Db;
  private collection: Collection<IArticle>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<IArticle>("articles");
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      console.log("Article 인덱스 생성 시작...");

      // 1. 기존 텍스트 인덱스 확인 및 삭제
      try {
        const existingIndexes = await this.collection.listIndexes().toArray();
        const textIndex = existingIndexes.find(
          (index) =>
            index.key && typeof index.key === "object" && "_fts" in index.key
        );

        if (textIndex) {
          console.log(
            `🔄 기존 텍스트 인덱스 발견: ${textIndex.name}, 삭제 중...`
          );
          await this.collection.dropIndex(textIndex.name);
          console.log("✅ 기존 텍스트 인덱스 삭제 완료");
        }
      } catch (error) {
        console.log("ℹ️ 기존 텍스트 인덱스 없음 또는 삭제 불가 (정상)");
      }

      // 2. 새 텍스트 검색 인덱스 생성
      await this.collection.createIndex({ title: "text", content_url: "text" });
      console.log("✅ 텍스트 검색 인덱스 생성");

      // 3. 조회 최적화 인덱스들 생성 (개별 생성으로 타입 에러 방지)

      // published_status 인덱스
      try {
        await this.collection.createIndex(
          { is_published: 1, published_at: -1 },
          { name: "published_status_idx" }
        );
        console.log("✅ published_status_idx 인덱스 생성");
      } catch (error: any) {
        if (error.code === 85) {
          console.log("ℹ️ published_status_idx 인덱스가 이미 존재함 (스킵)");
        } else {
          console.warn(
            "⚠️ published_status_idx 인덱스 생성 실패:",
            error.message
          );
        }
      }

      // author_created 인덱스
      try {
        await this.collection.createIndex(
          { author_id: 1, created_at: -1 },
          { name: "author_created_idx" }
        );
        console.log("✅ author_created_idx 인덱스 생성");
      } catch (error: any) {
        if (error.code === 85) {
          console.log("ℹ️ author_created_idx 인덱스가 이미 존재함 (스킵)");
        } else {
          console.warn(
            "⚠️ author_created_idx 인덱스 생성 실패:",
            error.message
          );
        }
      }

      // category_created 인덱스
      try {
        await this.collection.createIndex(
          { category_id: 1, created_at: -1 },
          { name: "category_created_idx" }
        );
        console.log("✅ category_created_idx 인덱스 생성");
      } catch (error: any) {
        if (error.code === 85) {
          console.log("ℹ️ category_created_idx 인덱스가 이미 존재함 (스킵)");
        } else {
          console.warn(
            "⚠️ category_created_idx 인덱스 생성 실패:",
            error.message
          );
        }
      }

      console.log("🎉 Article 인덱스 생성 완료");
    } catch (error) {
      console.error("❌ 인덱스 생성 중 오류:", error);
      // 인덱스 생성 실패해도 애플리케이션은 계속 실행
      console.log("⚠️ 인덱스 없이 계속 진행합니다...");
    }
  }

  // Article 생성
  async create(
    articleData: Omit<
      IArticle,
      "_id" | "created_at" | "updated_at" | "views" | "likes_count"
    >
  ): Promise<IArticle> {
    const now = new Date();
    const article: IArticle = {
      _id: new ObjectId(),
      ...articleData,
      views: 0,
      likes_count: 0,
      created_at: now,
      updated_at: now,
    };

    const result = await this.collection.insertOne(article);
    if (!result.insertedId) {
      throw new Error("게시글 생성에 실패했습니다.");
    }

    return article;
  }

  // ID로 Article 조회
  async findById(id: string): Promise<IArticle | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  // Article 목록 조회 (페이지네이션)
  async findMany(
    filter: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {}
  ): Promise<{ articles: IArticle[]; total: number }> {
    const { page = 1, limit = 20, sort = { created_at: -1 } } = options;
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      this.collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { articles, total };
  }

  // 발행된 Article 목록 조회
  async findPublished(
    options: {
      page?: number;
      limit?: number;
      category_id?: string;
    } = {}
  ): Promise<{ articles: IArticle[]; total: number }> {
    const { page = 1, limit = 20, category_id } = options;
    const skip = (page - 1) * limit;

    const filter: any = { is_published: true };
    if (category_id) {
      filter.category_id = new ObjectId(category_id);
    }

    const [articles, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { articles, total };
  }

  // Article 업데이트
  async updateById(
    id: string,
    updateData: Partial<IArticle>
  ): Promise<IArticle | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    // 수정 불가능한 필드 제거
    delete updateData._id;
    delete updateData.views;
    delete updateData.likes_count;
    delete updateData.created_at;

    updateData.updated_at = new Date();

    if (updateData.category_id && typeof updateData.category_id === "string") {
      updateData.category_id = new ObjectId(updateData.category_id);
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    return result || null;
  }

  // Article 삭제
  async deleteById(id: string): Promise<IArticle | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const result = await this.collection.findOneAndDelete({
      _id: new ObjectId(id),
    });
    return result || null;
  }

  // 조회수 증가
  async incrementViews(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      return;
    }

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { views: 1 }, $set: { updated_at: new Date() } }
    );
  }

  // 좋아요 수 업데이트
  async updateLikesCount(id: string, increment: number): Promise<void> {
    if (!ObjectId.isValid(id)) {
      return;
    }

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { likes_count: increment },
        $set: { updated_at: new Date() },
      }
    );
  }

  // 작성자별 Article 조회
  async findByAuthor(
    authorId: string,
    options: {
      page?: number;
      limit?: number;
      includeUnpublished?: boolean;
    } = {}
  ): Promise<{ articles: IArticle[]; total: number }> {
    if (!ObjectId.isValid(authorId)) {
      return { articles: [], total: 0 };
    }

    const { page = 1, limit = 20, includeUnpublished = false } = options;
    const skip = (page - 1) * limit;

    const filter: any = { author_id: new ObjectId(authorId) };
    if (!includeUnpublished) {
      filter.is_published = true;
    }

    const [articles, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { articles, total };
  }

  // 텍스트 검색
  async search(
    query: string,
    options: {
      page?: number;
      limit?: number;
      publishedOnly?: boolean;
    } = {}
  ): Promise<{ articles: IArticle[]; total: number }> {
    const { page = 1, limit = 20, publishedOnly = true } = options;
    const skip = (page - 1) * limit;

    const filter: any = { $text: { $search: query } };
    if (publishedOnly) {
      filter.is_published = true;
    }

    const [articles, total] = await Promise.all([
      this.collection
        .find(filter, { projection: { score: { $meta: "textScore" } } })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { articles, total };
  }
}

// 전역 Article 인스턴스
let articleModel: ArticleModel;

// Article 모델 초기화
export const initializeArticleModel = (db: Db): ArticleModel => {
  articleModel = new ArticleModel(db);
  return articleModel;
};

// Article 모델 인스턴스 가져오기
export const getArticleModel = (): ArticleModel => {
  if (!articleModel) {
    throw new Error("Article 모델이 초기화되지 않았습니다.");
  }
  return articleModel;
};

export const Article = {
  init: initializeArticleModel,
  get: getArticleModel,
};
