import { Collection, ObjectId } from 'mongodb';
import { IConcert, ILike } from '../base/ConcertTypes';
import logger from '../../../utils/logger/logger';

export class ConcertLikes {
  collection: Collection<IConcert>;

  constructor(collection: Collection<IConcert>) {
    this.collection = collection;
  }

  async addLike(concertId: string, userId: string): Promise<IConcert> {
    if (!userId) throw new Error('사용자 ID는 필수입니다.');
    const query = ObjectId.isValid(concertId) ? { _id: new ObjectId(concertId) } : { uid: concertId };
    const userObjectId = new ObjectId(userId);

    const existingConcert = await this.collection.findOne(query);
    if (!existingConcert) throw new Error('콘서트를 찾을 수 없습니다.');

    const isAlreadyLiked = existingConcert.likes?.some((like: ILike) => like.userId.toString() === userId.toString());
    if (isAlreadyLiked) throw new Error('이미 좋아요한 콘서트입니다.');

    const result = await this.collection.findOneAndUpdate(
      query,
      { 
        $push: { likes: { userId: userObjectId, likedAt: new Date() } },
        $inc: { likesCount: 1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' },
    );
    if (!result) throw new Error('좋아요 추가에 실패했습니다.');
    return result;
  }

  async removeLike(concertId: string, userId: string): Promise<IConcert> {
    if (!userId) throw new Error('사용자 ID는 필수입니다.');
    const query = ObjectId.isValid(concertId) ? { _id: new ObjectId(concertId) } : { uid: concertId };

    const existingConcert = await this.collection.findOne(query);
    if (!existingConcert) throw new Error('콘서트를 찾을 수 없습니다.');

    const result = await this.collection.findOneAndUpdate(
      query,
      {
        $pull: { likes: { userId: new ObjectId(userId) } },
        $inc: { likesCount: -1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' },
    );
    if (!result) throw new Error('좋아요 삭제에 실패했습니다.');

    if (result.likesCount && result.likesCount < 0) {
      await this.collection.updateOne(query, { $set: { likesCount: 0 } });
      result.likesCount = 0;
    }
    return result;
  }

  async findLikedByUser(userId: string, options: { page?: number; limit?: number } = {}): Promise<{ concerts: IConcert[]; total: number }> {
    if (!userId) return { concerts: [], total: 0 };
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const userObjectId = new ObjectId(userId);

    const [concerts, total] = await Promise.all([
      this.collection.find({ 'likes.userId': userObjectId }).sort({ 'likes.likedAt': -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments({ 'likes.userId': userObjectId }),
    ]);
    return { concerts, total };
  }

  async findLikeStatusBatch(concertIds: string[], userId: string): Promise<Map<string, boolean>> {
    if (!concertIds || concertIds.length === 0 || !userId) return new Map();

    const objectIds = concertIds.map(id => new ObjectId(id));
    const userObjectId = new ObjectId(userId);

    const concerts = await this.collection.find({ _id: { $in: objectIds } }, { projection: { _id: 1, likes: 1 } }).toArray();
    const likeStatusMap = new Map<string, boolean>();

    concerts.forEach(concert => {
      const isLiked = concert.likes?.some((like: ILike) => like.userId.equals(userObjectId)) || false;
      likeStatusMap.set(concert._id.toString(), isLiked);
    });

    return likeStatusMap;
  }
}
