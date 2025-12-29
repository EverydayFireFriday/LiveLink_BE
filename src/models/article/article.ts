import { ObjectId, Collection, Db, ClientSession } from 'mongodb';
import logger from '../../utils/logger/logger';

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
  bookmark_count: number;
}

// MongoDB 에러 타입
interface MongoError extends Error {
  code?: number;
}

// MongoDB Index 타입
interface MongoIndex {
  key?: Record<string, unknown>;
  name?: string;
  [key: string]: unknown;
}

// 필터 타입들
interface ArticleFilter {
  is_published?: boolean;
  category_id?: ObjectId;
  author_id?: ObjectId;
  published_at?: { $gte: Date };
  $text?: { $search: string };
}

// 정렬 옵션 타입
interface SortOption {
  [key: string]: 1 | -1;
}

// 업데이트 데이터 타입
type ArticleUpdateData = Partial<
  Omit<
    IArticle,
    '_id' | 'views' | 'likes_count' | 'bookmark_count' | 'created_at'
  >
>;

// 벌크 업데이트 오퍼레이션 타입
interface BulkUpdateOperation {
  updateOne: {
    filter: { _id: ObjectId };
    update: {
      $set: {
        likes_count: number;
        updated_at: Date;
      };
    };
  };
}

// Article 모델 클래스
export class ArticleModel {
  private db: Db;
  private collection: Collection<IArticle>;
  private indexesCreated = false; // 인덱스 생성 상태 추적

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<IArticle>('articles');
    // 생성자에서 인덱스 생성하지 않음
  }

  // 지연된 인덱스 생성 - 실제 사용 시점에 호출
  private async ensureIndexes(): Promise<void> {
    if (this.indexesCreated) return;

    try {
      await this.createIndexes();
      this.indexesCreated = true;
      logger.info('✅ Article indexes created successfully');
    } catch (error) {
      logger.error('❌ Failed to create Article indexes:', error);
      // 인덱스 생성 실패해도 앱은 계속 실행
    }
  }

  // 모든 데이터베이스 작업 전에 인덱스 확인
  private async withIndexes<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureIndexes();
    return operation();
  }

  private async createIndexes() {
    try {
      logger.info('Article 인덱스 생성 시작...');

      // 1. 기존 텍스트 인덱스 확인 및 삭제
      try {
        const existingIndexes = await this.collection.listIndexes().toArray();
        const textIndex = existingIndexes.find(
          (index: MongoIndex) =>
            index.key && typeof index.key === 'object' && '_fts' in index.key,
        ) as MongoIndex | undefined;

        if (textIndex && textIndex.name) {
          logger.info(
            `🔄 기존 텍스트 인덱스 발견: ${textIndex.name}, 삭제 중...`,
          );
          await this.collection.dropIndex(textIndex.name);
          logger.info('✅ 기존 텍스트 인덱스 삭제 완료');
        }
      } catch {
        logger.info('ℹ️ 기존 텍스트 인덱스 없음 또는 삭제 불가 (정상)');
      }

      // 2. 새 텍스트 검색 인덱스 생성
      await this.collection.createIndex({ title: 'text', content_url: 'text' });
      logger.info('✅ 텍스트 검색 인덱스 생성');

      // 3. 조회 최적화 인덱스들 생성 (개별 생성으로 타입 에러 방지)

      // published_status 인덱스
      try {
        await this.collection.createIndex(
          { is_published: 1, published_at: -1 },
          { name: 'published_status_idx' },
        );
        logger.info('✅ published_status_idx 인덱스 생성');
      } catch (error) {
        const mongoError = error as MongoError;
        if (mongoError.code === 85) {
          logger.info('ℹ️ published_status_idx 인덱스가 이미 존재함 (스킵)');
        } else {
          logger.warn(
            '⚠️ published_status_idx 인덱스 생성 실패:',
            mongoError.message,
          );
        }
      }

      // author_created 인덱스
      try {
        await this.collection.createIndex(
          { author_id: 1, created_at: -1 },
          { name: 'author_created_idx' },
        );
        logger.info('✅ author_created_idx 인덱스 생성');
      } catch (error) {
        const mongoError = error as MongoError;
        if (mongoError.code === 85) {
          logger.info('ℹ️ author_created_idx 인덱스가 이미 존재함 (스킵)');
        } else {
          logger.warn(
            '⚠️ author_created_idx 인덱스 생성 실패:',
            mongoError.message,
          );
        }
      }

      // category_created 인덱스
      try {
        await this.collection.createIndex(
          { category_id: 1, created_at: -1 },
          { name: 'category_created_idx' },
        );
        logger.info('✅ category_created_idx 인덱스 생성');
      } catch (error) {
        const mongoError = error as MongoError;
        if (mongoError.code === 85) {
          logger.info('ℹ️ category_created_idx 인덱스가 이미 존재함 (스킵)');
        } else {
          logger.warn(
            '⚠️ category_created_idx 인덱스 생성 실패:',
            mongoError.message,
          );
        }
      }

      logger.info('🎉 Article 인덱스 생성 완료');
    } catch (error) {
      logger.error('❌ 인덱스 생성 중 오류:', error);
      // 인덱스 생성 실패해도 애플리케이션은 계속 실행
      logger.info('⚠️ 인덱스 없이 계속 진행합니다...');
    }
  }

  // 모든 메서드에 withIndexes() 적용
  async create(
    articleData: Omit<
      IArticle,
      | '_id'
      | 'created_at'
      | 'updated_at'
      | 'views'
      | 'likes_count'
      | 'bookmark_count'
    >,
  ): Promise<IArticle> {
    return this.withIndexes(async () => {
      const now = new Date();
      const article: IArticle = {
        _id: new ObjectId(),
        ...articleData,
        views: 0,
        likes_count: 0,
        bookmark_count: 0,
        created_at: now,
        updated_at: now,
      };

      const result = await this.collection.insertOne(article);
      if (!result.insertedId) {
        throw new Error('게시글 생성에 실패했습니다.');
      }

      return article;
    });
  }

  async findById(id: string): Promise<IArticle | null> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return null;
      }
      return await this.collection.findOne({ _id: new ObjectId(id) });
    });
  }

  async findByIds(ids: string[]): Promise<IArticle[]> {
    return this.withIndexes(async () => {
      if (ids.length === 0) return [];

      const validIds = ids.filter((id) => ObjectId.isValid(id));
      if (validIds.length === 0) return [];

      const objectIds = validIds.map((id) => new ObjectId(id));

      const articles = await this.collection
        .find({ _id: { $in: objectIds } })
        .sort({ created_at: -1 })
        .toArray();

      const articlesMap = new Map(
        articles.map((article) => [article._id.toString(), article]),
      );
      return validIds
        .map((id) => articlesMap.get(id))
        .filter(Boolean) as IArticle[];
    });
  }

  async findMany(
    filter: ArticleFilter = {},
    options: {
      page?: number;
      limit?: number;
      sort?: SortOption;
    } = {},
  ): Promise<{ articles: IArticle[]; total: number }> {
    return this.withIndexes(async () => {
      const { page = 1, limit = 20, sort = { created_at: -1 } } = options;
      const skip = (page - 1) * limit;

      const [articles, total] = await Promise.all([
        this.collection
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments(filter),
      ]);

      return { articles, total };
    });
  }

  async findPublished(
    options: {
      page?: number;
      limit?: number;
      category_id?: string;
    } = {},
  ): Promise<{ articles: IArticle[]; total: number }> {
    return this.withIndexes(async () => {
      const { page = 1, limit = 20, category_id } = options;
      const skip = (page - 1) * limit;

      const filter: ArticleFilter = { is_published: true };
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
    });
  }

  async updateById(
    id: string,
    updateData: Partial<IArticle>,
  ): Promise<IArticle | null> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      const cleanUpdateData: ArticleUpdateData = { ...updateData };
      delete (cleanUpdateData as Record<string, unknown>)._id;
      delete (cleanUpdateData as Record<string, unknown>).views;
      delete (cleanUpdateData as Record<string, unknown>).likes_count;
      delete (cleanUpdateData as Record<string, unknown>).bookmark_count;
      delete (cleanUpdateData as Record<string, unknown>).created_at;

      cleanUpdateData.updated_at = new Date();

      if (
        cleanUpdateData.category_id &&
        typeof cleanUpdateData.category_id === 'string'
      ) {
        cleanUpdateData.category_id = new ObjectId(cleanUpdateData.category_id);
      }

      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: cleanUpdateData },
        { returnDocument: 'after' },
      );

      return result || null;
    });
  }

  async deleteById(id: string): Promise<IArticle | null> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      const result = await this.collection.findOneAndDelete({
        _id: new ObjectId(id),
      });
      return result || null;
    });
  }

  async incrementViews(id: string): Promise<void> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return;
      }

      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { views: 1 }, $set: { updated_at: new Date() } },
      );
    });
  }

  async updateLikesCount(
    id: string,
    increment: number,
    session?: ClientSession,
  ): Promise<void> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return;
      }

      const updateOptions = session ? { session } : {};

      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: { likes_count: increment },
          $set: { updated_at: new Date() },
        },
        updateOptions,
      );
    });
  }

  async updateBookmarkCount(
    id: string,
    increment: number,
    session?: ClientSession,
  ): Promise<void> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(id)) {
        return;
      }

      const updateOptions = session ? { session } : {};

      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: { bookmark_count: increment },
          $set: { updated_at: new Date() },
        },
        updateOptions,
      );
    });
  }

  async findByAuthor(
    authorId: string,
    options: {
      page?: number;
      limit?: number;
      includeUnpublished?: boolean;
    } = {},
  ): Promise<{ articles: IArticle[]; total: number }> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(authorId)) {
        return { articles: [], total: 0 };
      }

      const { page = 1, limit = 20, includeUnpublished = false } = options;
      const skip = (page - 1) * limit;

      const filter: ArticleFilter = { author_id: new ObjectId(authorId) };
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
    });
  }

  async search(
    query: string,
    options: {
      page?: number;
      limit?: number;
      publishedOnly?: boolean;
    } = {},
  ): Promise<{ articles: IArticle[]; total: number }> {
    return this.withIndexes(async () => {
      const { page = 1, limit = 20, publishedOnly = true } = options;
      const skip = (page - 1) * limit;

      const filter: ArticleFilter = { $text: { $search: query } };
      if (publishedOnly) {
        filter.is_published = true;
      }

      const [articles, total] = await Promise.all([
        this.collection
          .find(filter, { projection: { score: { $meta: 'textScore' } } })
          .sort({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments(filter),
      ]);

      return { articles, total };
    });
  }

  async findPopular(
    options: {
      page?: number;
      limit?: number;
      days?: number;
    } = {},
  ): Promise<{ articles: IArticle[]; total: number }> {
    return this.withIndexes(async () => {
      const { page = 1, limit = 20, days = 7 } = options;
      const skip = (page - 1) * limit;

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const filter: ArticleFilter = {
        is_published: true,
        published_at: { $gte: dateThreshold },
      };

      const [articles, total] = await Promise.all([
        this.collection
          .find(filter)
          .sort({
            likes_count: -1,
            views: -1,
            published_at: -1,
          })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments(filter),
      ]);

      return { articles, total };
    });
  }

  async updateStatsForArticles(
    statsUpdates: { id: string; likes_count: number }[],
  ): Promise<void> {
    return this.withIndexes(async () => {
      if (statsUpdates.length === 0) return;

      const bulkOps: BulkUpdateOperation[] = statsUpdates.map((update) => ({
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

  async deleteByAuthor(authorId: string): Promise<number> {
    return this.withIndexes(async () => {
      if (!ObjectId.isValid(authorId)) {
        return 0;
      }

      const result = await this.collection.deleteMany({
        author_id: new ObjectId(authorId),
      });

      return result.deletedCount || 0;
    });
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
    throw new Error('Article 모델이 초기화되지 않았습니다.');
  }
  return articleModel;
};

export const Article = {
  init: initializeArticleModel,
  get: getArticleModel,
};
