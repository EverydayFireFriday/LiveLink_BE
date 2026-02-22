import {
  Collection,
  Db,
  ObjectId,
  InsertOneResult,
  UpdateResult,
  DeleteResult,
} from 'mongodb';
import {
  IConcertReview,
  ICreateConcertReviewInput,
  IUpdateConcertReviewInput,
  IConcertReviewFilter,
  IPaginationOptions,
  IPaginatedConcertReviews,
} from '../../types/concertReview/concertReviewTypes';

/**
 * 콘서트 리뷰 모델
 */
export class ConcertReviewModel {
  private collection: Collection<IConcertReview>;
  private indexesCreated = false;

  constructor(db: Db) {
    this.collection = db.collection<IConcertReview>('concert_reviews');
  }

  /**
   * 인덱스 생성 (처음 호출시에만 실행)
   */
  private async ensureIndexes(): Promise<void> {
    if (this.indexesCreated) return;

    await this.collection.createIndex({ 'user.id': 1, createdAt: -1 });
    await this.collection.createIndex({ 'concert.id': 1, createdAt: -1 });
    await this.collection.createIndex({ createdAt: -1 });
    await this.collection.createIndex({ likeCount: -1 });
    await this.collection.createIndex({ hashtags: 1 });
    await this.collection.createIndex({ tags: 1 });
    await this.collection.createIndex({ isPublic: 1, createdAt: -1 });
    await this.collection.createIndex({
      'user.id': 1,
      'concert.id': 1,
    });

    this.indexesCreated = true;
  }

  /**
   * 콘서트 리뷰 생성
   */
  async create(
    input: ICreateConcertReviewInput,
  ): Promise<InsertOneResult<IConcertReview>> {
    await this.ensureIndexes();

    const review: Omit<IConcertReview, '_id'> = {
      user: {
        id: input.userId,
        username: input.username,
        profileImage: input.profileImage,
      },
      concert: {
        id: input.concertId,
        title: input.concertTitle,
        posterImage: input.posterImage,
        venue: input.venue,
        date: input.date,
      },
      images: input.images || [],
      content: input.content,
      tags: input.tags || [],
      hashtags: input.hashtags || [],
      likeCount: 0,
      reportCount: 0,
      isPublic: input.isPublic !== undefined ? input.isPublic : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.collection.insertOne(review as IConcertReview);
  }

  /**
   * ID로 콘서트 리뷰 조회
   */
  async findById(id: string | ObjectId): Promise<IConcertReview | null> {
    await this.ensureIndexes();

    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.collection.findOne({ _id: objectId });
  }

  /**
   * 필터 조건으로 리뷰 조회 (페이지네이션)
   */
  async findWithPagination(
    filter: IConcertReviewFilter,
    options: IPaginationOptions,
  ): Promise<IPaginatedConcertReviews> {
    await this.ensureIndexes();

    const query: Record<string, unknown> = {};

    if (filter.userId) {
      query['user.id'] = filter.userId;
    }

    if (filter.concertId) {
      query['concert.id'] = filter.concertId;
    }

    if (filter.isPublic !== undefined) {
      query.isPublic = filter.isPublic;
    }

    if (filter.hashtags && filter.hashtags.length > 0) {
      query.hashtags = { $in: filter.hashtags };
    }

    if (filter.tags && filter.tags.length > 0) {
      query.tags = { $in: filter.tags };
    }

    const sortField = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const skip = (options.page - 1) * options.limit;

    const [reviews, total] = await Promise.all([
      this.collection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(options.limit)
        .toArray(),
      this.collection.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / options.limit);

    return {
      reviews,
      total,
      page: options.page,
      totalPages,
      limit: options.limit,
    };
  }

  /**
   * 콘서트 리뷰 업데이트
   */
  async update(
    id: string | ObjectId,
    input: IUpdateConcertReviewInput,
  ): Promise<UpdateResult> {
    await this.ensureIndexes();

    const objectId = typeof id === 'string' ? new ObjectId(id) : id;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.images !== undefined) {
      updateData.images = input.images;
    }

    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    if (input.tags !== undefined) {
      updateData.tags = input.tags;
    }

    if (input.hashtags !== undefined) {
      updateData.hashtags = input.hashtags;
    }

    if (input.isPublic !== undefined) {
      updateData.isPublic = input.isPublic;
    }

    return await this.collection.updateOne(
      { _id: objectId },
      { $set: updateData },
    );
  }

  /**
   * 콘서트 리뷰 삭제
   */
  async delete(id: string | ObjectId): Promise<DeleteResult> {
    await this.ensureIndexes();

    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.collection.deleteOne({ _id: objectId });
  }

  /**
   * 좋아요 수 증가
   */
  async incrementLikeCount(id: string | ObjectId): Promise<UpdateResult> {
    await this.ensureIndexes();

    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.collection.updateOne(
      { _id: objectId },
      { $inc: { likeCount: 1 } },
    );
  }

  /**
   * 좋아요 수 감소
   */
  async decrementLikeCount(id: string | ObjectId): Promise<UpdateResult> {
    await this.ensureIndexes();

    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.collection.updateOne(
      { _id: objectId },
      { $inc: { likeCount: -1 } },
    );
  }

  /**
   * 신고 수 증가
   */
  async incrementReportCount(id: string | ObjectId): Promise<UpdateResult> {
    await this.ensureIndexes();

    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.collection.updateOne(
      { _id: objectId },
      { $inc: { reportCount: 1 } },
    );
  }

  /**
   * 특정 사용자가 특정 콘서트에 대한 리뷰를 작성했는지 확인
   */
  async existsByUserAndConcert(
    userId: string,
    concertId: string,
  ): Promise<boolean> {
    await this.ensureIndexes();

    const count = await this.collection.countDocuments({
      'user.id': userId,
      'concert.id': concertId,
    });

    return count > 0;
  }

  /**
   * 인기 리뷰 조회 (좋아요 순)
   */
  async findPopular(limit: number = 10): Promise<IConcertReview[]> {
    await this.ensureIndexes();

    return await this.collection
      .find({ isPublic: true })
      .sort({ likeCount: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * 최근 리뷰 조회
   */
  async findRecent(limit: number = 10): Promise<IConcertReview[]> {
    await this.ensureIndexes();

    return await this.collection
      .find({ isPublic: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * 특정 사용자의 리뷰 수 조회
   */
  async countByUser(userId: string): Promise<number> {
    await this.ensureIndexes();

    return await this.collection.countDocuments({
      'user.id': userId,
    });
  }

  /**
   * 특정 콘서트의 리뷰 수 조회
   */
  async countByConcert(concertId: string): Promise<number> {
    await this.ensureIndexes();

    return await this.collection.countDocuments({
      'concert.id': concertId,
      isPublic: true,
    });
  }
}

// Singleton 패턴
let concertReviewModel: ConcertReviewModel;

export const initializeConcertReviewModel = (db: Db): ConcertReviewModel => {
  if (!concertReviewModel) {
    concertReviewModel = new ConcertReviewModel(db);
  }
  return concertReviewModel;
};

export const getConcertReviewModel = (): ConcertReviewModel => {
  if (!concertReviewModel) {
    throw new Error(
      'ConcertReview 모델이 초기화되지 않았습니다. initializeConcertReviewModel()을 먼저 호출하세요.',
    );
  }
  return concertReviewModel;
};
