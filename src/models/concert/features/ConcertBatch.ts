import {
  Collection,
  ObjectId,
  AnyBulkWriteOperation,
  BulkWriteResult,
} from 'mongodb';
import { IConcert } from '../base/ConcertTypes';

/**
 * Concert Like Entry
 */
interface IConcertLike {
  userId: ObjectId;
  likedAt: Date;
}

/**
 * Concert with Likes
 */
interface IConcertWithLikes extends IConcert {
  likes?: IConcertLike[];
}

/**
 * Concert Insert Input (without generated fields)
 */
export interface IConcertInsertInput {
  uid: string;
  title: string;
  artist: string[];
  location: string[];
  datetime?: (Date | string)[];
  price?: Array<{ tier: string; amount: number }>;
  description?: string;
  category?: string[];
  ticketLink?: Array<{ platform: string; url: string }>;
  ticketOpenDate?: Array<{ openTitle: string; openDate: Date }>;
  posterImage?: string;
  infoImages?: string[];
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  likes?: IConcertLike[];
  likesCount?: number;
  youtubePlaylistUrl?: string;
  spotifyPlaylistUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Batch Operation Error
 */
interface IBatchOperationError {
  concertId?: string;
  userId?: string;
  action?: string;
  error: string;
}

export class ConcertBatch {
  collection: Collection<IConcert>;

  constructor(collection: Collection<IConcert>) {
    this.collection = collection;
  }

  async findByUids(uids: string[]): Promise<IConcert[]> {
    if (!uids || uids.length === 0) return [];
    return await this.collection.find({ uid: { $in: uids } }).toArray();
  }

  async findByIds(ids: string[]): Promise<IConcert[]> {
    if (!ids || ids.length === 0) return [];
    const objectIds = ids.map((id) => new ObjectId(id));
    return await this.collection.find({ _id: { $in: objectIds } }).toArray();
  }

  async insertMany(concerts: IConcertInsertInput[]): Promise<IConcert[]> {
    if (!concerts || concerts.length === 0) return [];
    const processedConcerts = concerts.map((concert) => {
      const now = new Date();
      return {
        ...concert,
        _id: new ObjectId(),
        status: (concert.status || 'upcoming') as
          | 'upcoming'
          | 'ongoing'
          | 'completed'
          | 'cancelled',
        likes: concert.likes || [],
        likesCount: concert.likesCount || 0,
        createdAt: concert.createdAt || now,
        updatedAt: concert.updatedAt || now,
        datetime: concert.datetime
          ? concert.datetime.map((dt: Date | string) => new Date(dt))
          : [],
      } as IConcert;
    });
    const result = await this.collection.insertMany(processedConcerts, {
      ordered: false,
    });
    const insertedIds = Object.values(result.insertedIds);
    return await this.collection.find({ _id: { $in: insertedIds } }).toArray();
  }

  async deleteByIds(ids: string[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const objectIds = ids.map((id) => new ObjectId(id));
    const result = await this.collection.deleteMany({
      _id: { $in: objectIds },
    });
    return result.deletedCount || 0;
  }

  async bulkWrite(
    operations: AnyBulkWriteOperation<IConcert>[],
  ): Promise<BulkWriteResult> {
    if (!operations || operations.length === 0) {
      // For empty operations, create a minimal dummy operation and clean up
      const dummyId = new ObjectId();
      const dummyConcert = {
        _id: dummyId,
        uid: `dummy-${dummyId.toString()}`,
        title: 'dummy',
        artist: [],
        location: [],
        status: 'upcoming' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IConcert;

      const emptyResult = await this.collection.bulkWrite(
        [{ insertOne: { document: dummyConcert } }],
        { ordered: false },
      );
      // Immediately delete the dummy document
      await this.collection.deleteOne({ _id: dummyId });

      return emptyResult;
    }
    return await this.collection.bulkWrite(operations, { ordered: false });
  }

  async batchLikeOperations(
    operations: Array<{
      concertId: string;
      userId: string;
      action: 'add' | 'remove';
    }>,
  ): Promise<{ success: number; failed: number; errors: IBatchOperationError[] }> {
    if (!operations || operations.length === 0)
      return { success: 0, failed: 0, errors: [] };

    const bulkOps: AnyBulkWriteOperation<IConcertWithLikes>[] = [];
    const errors: IBatchOperationError[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const op of operations) {
      try {
        const { concertId, userId, action } = op;
        if (!concertId || !userId || !['add', 'remove'].includes(action)) {
          errors.push({ concertId, userId, action, error: '잘못된 매개변수' });
          failedCount++;
          continue;
        }
        const query = ObjectId.isValid(concertId)
          ? { _id: new ObjectId(concertId) }
          : { uid: concertId };
        const userObjectId = new ObjectId(userId);

        if (action === 'add') {
          bulkOps.push({
            updateOne: {
              filter: { ...query, 'likes.userId': { $ne: userObjectId } },
              update: {
                $push: { likes: { userId: userObjectId, likedAt: new Date() } },
                $inc: { likesCount: 1 },
                $set: { updatedAt: new Date() },
              },
            },
          });
        } else {
          bulkOps.push({
            updateOne: {
              filter: query,
              update: {
                $pull: { likes: { userId: userObjectId } },
                $inc: { likesCount: -1 },
                $set: { updatedAt: new Date() },
              },
            },
          });
        }
        successCount++;
      } catch (error) {
        errors.push({
          concertId: op.concertId,
          userId: op.userId,
          action: op.action,
          error: error instanceof Error ? error.message : '알 수 없는 에러',
        });
        failedCount++;
      }
    }

    if (bulkOps.length > 0) {
      await this.bulkWrite(bulkOps);
    }

    return { success: successCount, failed: failedCount, errors };
  }
}
