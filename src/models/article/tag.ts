import { ObjectId, Collection, Db, Document } from 'mongodb';
import logger from '../../utils/logger/logger';

export interface ITag {
  _id: ObjectId;
  name: string;
  created_at: Date;
}

// MongoDB 에러 타입
interface MongoError extends Error {
  code?: number;
  writeErrors?: unknown[];
}

// 집계 파이프라인 결과 타입들
interface TagArticleCountResult {
  _id: ObjectId;
  name: string;
  created_at: Date;
  articleCount: number;
}

interface PopularTagResult {
  _id: ObjectId;
  name: string;
  created_at: Date;
  articleCount: number;
}

interface RelatedTagResult {
  tag: {
    _id: ObjectId;
    name: string;
    created_at: Date;
  };
  coOccurrenceCount: number;
}

// 필터 타입
interface SearchFilter {
  name?: RegExp;
}

interface ArticleFilter {
  'articles.is_published'?: boolean;
  'articles.created_at'?: { $gte: Date };
}

export class TagModel {
  private db: Db;
  private collection: Collection<ITag>;
  private indexesInitialized = false;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<ITag>('tags');
    // 비동기로 인덱스 생성 - 앱 시작을 블로킹하지 않음

    void this.initializeIndexes();
  }

  private async initializeIndexes() {
    if (this.indexesInitialized) return;

    try {
      logger.info('🔄 Tag 인덱스 백그라운드 초기화 시작...');

      // 컬렉션 존재 여부 확인
      const collections = await this.db
        .listCollections({ name: 'tags' })
        .toArray();

      if (collections.length === 0) {
        // 컬렉션이 없으면 생성
        await this.db.createCollection('tags');
        logger.info('📁 tags 컬렉션 생성 완료');
      }

      // 기존 인덱스 조회로 중복 생성 방지
      const existingIndexes = await this.collection.listIndexes().toArray();
      const indexNames = existingIndexes.map((index) => index.name);

      // name 유니크 인덱스가 없으면 생성
      if (!indexNames.includes('tag_name_unique')) {
        await this.collection.createIndex(
          { name: 1 },
          {
            unique: true,
            name: 'tag_name_unique',
            background: true, // 백그라운드에서 생성
          },
        );
        logger.info('✅ Tag name 유니크 인덱스 생성 완료');
      } else {
        logger.info('ℹ️ Tag name 유니크 인덱스 이미 존재');
      }

      this.indexesInitialized = true;
      logger.info('🎉 Tag 인덱스 백그라운드 초기화 완료');
    } catch (error) {
      logger.error('❌ Tag 인덱스 초기화 실패:', error);
      // 인덱스 생성 실패해도 앱은 계속 동작
    }
  }

  // 인덱스 준비 상태 확인 (선택적)
  async waitForIndexes(timeoutMs = 5000): Promise<boolean> {
    const start = Date.now();
    while (!this.indexesInitialized && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return this.indexesInitialized;
  }

  // Tag 생성 - 인덱스 없어도 동작하도록 최적화
  async create(name: string): Promise<ITag> {
    try {
      const tag: ITag = {
        _id: new ObjectId(),
        name,
        created_at: new Date(),
      };

      const result = await this.collection.insertOne(tag);
      if (!result.insertedId) {
        throw new Error('태그 생성에 실패했습니다.');
      }

      return tag;
    } catch (error) {
      const mongoError = error as MongoError;
      // 중복 키 에러 처리 (인덱스가 있는 경우)
      if (mongoError.code === 11000) {
        throw new Error('이미 존재하는 태그입니다.');
      }

      // 인덱스가 없는 경우 수동으로 중복 검사
      const existingTag = await this.collection.findOne({ name });
      if (existingTag) {
        throw new Error('이미 존재하는 태그입니다.');
      }

      throw error;
    }
  }

  // Tag 조회 (이름으로)
  async findByName(name: string): Promise<ITag | null> {
    return await this.collection.findOne({ name });
  }

  // Tag ID로 조회
  async findById(id: string): Promise<ITag | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  // 여러 Tag ID로 조회 (배치 처리)
  async findByIds(ids: string[]): Promise<ITag[]> {
    if (ids.length === 0) return [];

    const validIds = ids.filter((id) => ObjectId.isValid(id));
    if (validIds.length === 0) return [];

    const objectIds = validIds.map((id) => new ObjectId(id));

    return await this.collection
      .find({ _id: { $in: objectIds } })
      .sort({ name: 1 })
      .toArray();
  }

  // 여러 Tag 이름으로 조회
  async findManyByName(names: string[]): Promise<ITag[]> {
    if (names.length === 0) {
      return [];
    }
    return await this.collection
      .find({ name: { $in: names } })
      .sort({ name: 1 })
      .toArray();
  }

  // Tag 목록 조회
  async findMany(
    options: {
      page?: number;
      limit?: number;
      search?: string;
    } = {},
  ): Promise<{ tags: ITag[]; total: number }> {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const filter: SearchFilter = {};
    if (search) {
      filter.name = new RegExp(search, 'i');
    }

    const [tags, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { tags, total };
  }

  // 모든 Tag 조회 (페이지네이션 없음)
  async findAll(): Promise<ITag[]> {
    return await this.collection.find({}).sort({ name: 1 }).toArray();
  }

  // Tag 업데이트 - 인덱스 없어도 동작하도록 최적화
  async updateById(id: string, name: string): Promise<ITag | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    try {
      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { name } },
        { returnDocument: 'after' },
      );

      return result || null;
    } catch (error) {
      const mongoError = error as MongoError;
      // 중복 키 에러 처리 (인덱스가 있는 경우)
      if (mongoError.code === 11000) {
        throw new Error('이미 존재하는 태그 이름입니다.');
      }

      // 인덱스가 없는 경우 수동으로 중복 검사
      const existingTag = await this.collection.findOne({
        name,
        _id: { $ne: new ObjectId(id) },
      });

      if (existingTag) {
        throw new Error('이미 존재하는 태그 이름입니다.');
      }

      throw error;
    }
  }

  // Tag 삭제
  async deleteById(id: string): Promise<ITag | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const result = await this.collection.findOneAndDelete({
      _id: new ObjectId(id),
    });
    return result || null;
  }

  // 이름으로 Tag 찾거나 생성
  async findOrCreate(name: string): Promise<ITag> {
    const existingTag = await this.findByName(name);
    if (existingTag) {
      return existingTag;
    }
    return await this.create(name);
  }

  // 여러 Tag 이름으로 찾거나 생성 (최적화된 배치 처리)
  async findOrCreateMany(names: string[]): Promise<ITag[]> {
    if (names.length === 0) return [];

    // 중복 제거
    const uniqueNames = [...new Set(names)];

    // 기존 태그들 조회
    const existingTags = await this.findManyByName(uniqueNames);
    const existingNames = new Set(existingTags.map((tag) => tag.name));

    // 생성해야 할 새 태그들
    const newNames = uniqueNames.filter((name) => !existingNames.has(name));

    if (newNames.length === 0) {
      return existingTags;
    }

    // 새 태그들 배치 생성
    const now = new Date();
    const newTags: ITag[] = newNames.map((name) => ({
      _id: new ObjectId(),
      name,
      created_at: now,
    }));

    try {
      await this.collection.insertMany(newTags, { ordered: false });
      return [...existingTags, ...newTags];
    } catch (error) {
      const mongoError = error as MongoError;
      // 중복 에러가 발생하면 개별적으로 처리 (동시성 문제 대응)
      if (mongoError.code === 11000 || mongoError.writeErrors) {
        const tags: ITag[] = [...existingTags];
        for (const name of newNames) {
          try {
            const tag = await this.findOrCreate(name);
            if (!tags.find((t) => t.name === tag.name)) {
              tags.push(tag);
            }
          } catch (createError) {
            logger.warn(`태그 생성 실패: ${name}`, createError);
          }
        }
        return tags;
      }
      throw error;
    }
  }

  // 태그별 게시글 수 조회 (통계용)
  async getTagArticleCounts(): Promise<
    Array<{ tag: ITag; articleCount: number }>
  > {
    const pipeline: Document[] = [
      {
        $lookup: {
          from: 'article_tags',
          localField: '_id',
          foreignField: 'tag_id',
          as: 'articleTags',
        },
      },
      {
        $addFields: {
          articleCount: { $size: '$articleTags' },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          created_at: 1,
          articleCount: 1,
        },
      },
      {
        $sort: { articleCount: -1, name: 1 },
      },
    ];

    const results = await this.collection
      .aggregate<TagArticleCountResult>(pipeline)
      .toArray();

    return results.map((item) => ({
      tag: {
        _id: item._id,
        name: item.name,
        created_at: item.created_at,
      },
      articleCount: item.articleCount,
    }));
  }

  // 인기 태그 조회 (발행된 게시글 수 기준)
  async getPopularTags(
    options: {
      limit?: number;
      publishedOnly?: boolean;
      days?: number;
    } = {},
  ): Promise<Array<{ tag: ITag; articleCount: number }>> {
    const { limit = 20, publishedOnly = true, days } = options;

    const pipeline: Document[] = [
      {
        $lookup: {
          from: 'article_tags',
          localField: '_id',
          foreignField: 'tag_id',
          as: 'articleTags',
        },
      },
    ];

    if (publishedOnly || days) {
      pipeline.push({
        $lookup: {
          from: 'articles',
          localField: 'articleTags.article_id',
          foreignField: '_id',
          as: 'articles',
        },
      });

      const articleFilter: ArticleFilter = {};

      if (publishedOnly) {
        articleFilter['articles.is_published'] = true;
      }

      if (days) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        articleFilter['articles.created_at'] = { $gte: dateThreshold };
      }

      if (Object.keys(articleFilter).length > 0) {
        pipeline.push({
          $addFields: {
            filteredArticles: {
              $filter: {
                input: '$articles',
                as: 'article',
                cond: {
                  $and: Object.entries(articleFilter).map(([field, value]) => ({
                    $eq: [`$$${field}`, value],
                  })),
                },
              },
            },
          },
        });

        pipeline.push({
          $addFields: {
            articleCount: { $size: '$filteredArticles' },
          },
        });
      } else {
        pipeline.push({
          $addFields: {
            articleCount: { $size: '$articles' },
          },
        });
      }
    } else {
      pipeline.push({
        $addFields: {
          articleCount: { $size: '$articleTags' },
        },
      });
    }

    pipeline.push(
      {
        $match: {
          articleCount: { $gt: 0 },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          created_at: 1,
          articleCount: 1,
        },
      },
      {
        $sort: { articleCount: -1, name: 1 },
      },
      {
        $limit: limit,
      },
    );

    const results = await this.collection
      .aggregate<PopularTagResult>(pipeline)
      .toArray();

    return results.map((item) => ({
      tag: {
        _id: item._id,
        name: item.name,
        created_at: item.created_at,
      },
      articleCount: item.articleCount,
    }));
  }

  // 사용되지 않은 태그 조회
  async getUnusedTags(): Promise<ITag[]> {
    const pipeline: Document[] = [
      {
        $lookup: {
          from: 'article_tags',
          localField: '_id',
          foreignField: 'tag_id',
          as: 'articleTags',
        },
      },
      {
        $match: {
          articleTags: { $size: 0 },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          created_at: 1,
        },
      },
      {
        $sort: { name: 1 },
      },
    ];

    const results = await this.collection.aggregate<ITag>(pipeline).toArray();
    return results.map((item) => ({
      _id: item._id,
      name: item.name,
      created_at: item.created_at,
    }));
  }

  // 태그 검색 (자동완성용)
  async searchTags(
    query: string,
    options: {
      limit?: number;
      excludeUnused?: boolean;
    } = {},
  ): Promise<ITag[]> {
    const { limit = 10, excludeUnused = false } = options;

    const pipeline: Document[] = [
      {
        $match: {
          name: new RegExp(query, 'i'),
        },
      },
    ];

    if (excludeUnused) {
      pipeline.push(
        {
          $lookup: {
            from: 'article_tags',
            localField: '_id',
            foreignField: 'tag_id',
            as: 'articleTags',
          },
        },
        {
          $match: {
            articleTags: { $not: { $size: 0 } },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            created_at: 1,
          },
        },
      );
    }

    pipeline.push(
      {
        $sort: { name: 1 },
      },
      {
        $limit: limit,
      },
    );

    const results = await this.collection.aggregate<ITag>(pipeline).toArray();
    return results.map((item) => ({
      _id: item._id,
      name: item.name,
      created_at: item.created_at,
    }));
  }

  // 관련 태그 추천 (같이 사용되는 태그들)
  async getRelatedTags(
    tagId: string,
    options: {
      limit?: number;
    } = {},
  ): Promise<Array<{ tag: ITag; coOccurrenceCount: number }>> {
    if (!ObjectId.isValid(tagId)) return [];

    const { limit = 10 } = options;

    const pipeline: Document[] = [
      // 해당 태그가 사용된 게시글들 찾기
      {
        $match: {
          tag_id: new ObjectId(tagId),
        },
      },

      // 같은 게시글의 다른 태그들 찾기
      {
        $lookup: {
          from: 'article_tags',
          localField: 'article_id',
          foreignField: 'article_id',
          as: 'relatedTags',
        },
      },

      // 배열 풀기
      { $unwind: '$relatedTags' },

      // 자기 자신 제외
      {
        $match: {
          'relatedTags.tag_id': { $ne: new ObjectId(tagId) },
        },
      },

      // 태그별로 그룹핑하여 동시 출현 횟수 세기
      {
        $group: {
          _id: '$relatedTags.tag_id',
          coOccurrenceCount: { $sum: 1 },
        },
      },

      // 태그 정보 조인
      {
        $lookup: {
          from: 'tags',
          localField: '_id',
          foreignField: '_id',
          as: 'tag',
        },
      },

      { $unwind: '$tag' },

      {
        $project: {
          tag: {
            _id: '$tag._id',
            name: '$tag.name',
            created_at: '$tag.created_at',
          },
          coOccurrenceCount: 1,
        },
      },

      { $sort: { coOccurrenceCount: -1, 'tag.name': 1 } },
      { $limit: limit },
    ];

    const articleTagCollection = this.db.collection('article_tags');
    const results = await articleTagCollection
      .aggregate<RelatedTagResult>(pipeline)
      .toArray();

    return results.map((item) => ({
      tag: {
        _id: item.tag._id,
        name: item.tag.name,
        created_at: item.tag.created_at,
      },
      coOccurrenceCount: item.coOccurrenceCount,
    }));
  }

  // 인덱스 강제 생성 (관리용)
  async forceCreateIndexes(): Promise<void> {
    this.indexesInitialized = false; // 플래그 리셋
    await this.initializeIndexes();
  }
}

// 전역 Tag 인스턴스
let tagModel: TagModel;

export const initializeTagModel = (db: Db): TagModel => {
  tagModel = new TagModel(db);
  return tagModel;
};

export const getTagModel = (): TagModel => {
  if (!tagModel) {
    throw new Error('Tag 모델이 초기화되지 않았습니다.');
  }
  return tagModel;
};

export const Tag = {
  init: initializeTagModel,
  get: getTagModel,
};
