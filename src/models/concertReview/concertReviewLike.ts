import {
  Collection,
  Db,
  ObjectId,
  InsertOneResult,
  DeleteResult,
} from 'mongodb';

/**
 * 콘서트 리뷰 좋아요 인터페이스
 */
export interface IConcertReviewLike {
  _id: ObjectId;
  reviewId: ObjectId;
  userId: string;
  createdAt: Date;
}

/**
 * 콘서트 리뷰 좋아요 모델
 */
export class ConcertReviewLikeModel {
  private collection: Collection<IConcertReviewLike>;
  private indexesCreated = false;

  constructor(db: Db) {
    this.collection = db.collection<IConcertReviewLike>('concert_review_likes');
  }

  /**
   * 인덱스 생성 (처음 호출시에만 실행)
   */
  private async ensureIndexes(): Promise<void> {
    if (this.indexesCreated) return;

    // 복합 유니크 인덱스: 한 사용자가 같은 리뷰에 중복 좋아요 방지
    await this.collection.createIndex(
      { reviewId: 1, userId: 1 },
      { unique: true },
    );
    await this.collection.createIndex({ userId: 1, createdAt: -1 });
    await this.collection.createIndex({ reviewId: 1 });

    this.indexesCreated = true;
  }

  /**
   * 좋아요 추가
   */
  async create(
    reviewId: string | ObjectId,
    userId: string,
  ): Promise<InsertOneResult<IConcertReviewLike>> {
    await this.ensureIndexes();

    const objectId =
      typeof reviewId === 'string' ? new ObjectId(reviewId) : reviewId;

    const like: Omit<IConcertReviewLike, '_id'> = {
      reviewId: objectId,
      userId,
      createdAt: new Date(),
    };

    return await this.collection.insertOne(like as IConcertReviewLike);
  }

  /**
   * 좋아요 삭제
   */
  async delete(
    reviewId: string | ObjectId,
    userId: string,
  ): Promise<DeleteResult> {
    await this.ensureIndexes();

    const objectId =
      typeof reviewId === 'string' ? new ObjectId(reviewId) : reviewId;

    return await this.collection.deleteOne({
      reviewId: objectId,
      userId,
    });
  }

  /**
   * 사용자가 특정 리뷰에 좋아요를 눌렀는지 확인
   */
  async exists(reviewId: string | ObjectId, userId: string): Promise<boolean> {
    await this.ensureIndexes();

    const objectId =
      typeof reviewId === 'string' ? new ObjectId(reviewId) : reviewId;

    const count = await this.collection.countDocuments({
      reviewId: objectId,
      userId,
    });

    return count > 0;
  }

  /**
   * 특정 리뷰의 좋아요 수 조회
   */
  async countByReview(reviewId: string | ObjectId): Promise<number> {
    await this.ensureIndexes();

    const objectId =
      typeof reviewId === 'string' ? new ObjectId(reviewId) : reviewId;

    return await this.collection.countDocuments({ reviewId: objectId });
  }

  /**
   * 사용자가 좋아요한 리뷰 ID 목록 조회 (페이지네이션)
   */
  async findReviewIdsByUser(
    userId: string,
    skip: number = 0,
    limit: number = 20,
  ): Promise<ObjectId[]> {
    await this.ensureIndexes();

    const likes = await this.collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return likes.map((like) => like.reviewId);
  }

  /**
   * 특정 사용자가 좋아요한 리뷰 수 조회
   */
  async countByUser(userId: string): Promise<number> {
    await this.ensureIndexes();

    return await this.collection.countDocuments({ userId });
  }

  /**
   * 여러 리뷰에 대해 사용자가 좋아요를 눌렀는지 일괄 확인
   */
  async checkMultipleReviews(
    reviewIds: (string | ObjectId)[],
    userId: string,
  ): Promise<Map<string, boolean>> {
    await this.ensureIndexes();

    const objectIds = reviewIds.map((id) =>
      typeof id === 'string' ? new ObjectId(id) : id,
    );

    const likes = await this.collection
      .find({
        reviewId: { $in: objectIds },
        userId,
      })
      .toArray();

    const likedMap = new Map<string, boolean>();
    reviewIds.forEach((id) => {
      const idStr = typeof id === 'string' ? id : id.toString();
      likedMap.set(idStr, false);
    });

    likes.forEach((like) => {
      likedMap.set(like.reviewId.toString(), true);
    });

    return likedMap;
  }
}

// Singleton 패턴
let concertReviewLikeModel: ConcertReviewLikeModel;

export const initializeConcertReviewLikeModel = (
  db: Db,
): ConcertReviewLikeModel => {
  if (!concertReviewLikeModel) {
    concertReviewLikeModel = new ConcertReviewLikeModel(db);
  }
  return concertReviewLikeModel;
};

export const getConcertReviewLikeModel = (): ConcertReviewLikeModel => {
  if (!concertReviewLikeModel) {
    throw new Error(
      'ConcertReviewLike 모델이 초기화되지 않았습니다. initializeConcertReviewLikeModel()을 먼저 호출하세요.',
    );
  }
  return concertReviewLikeModel;
};
