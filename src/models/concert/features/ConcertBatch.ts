import { Collection, ObjectId } from 'mongodb';
import { IConcert } from '../base/ConcertTypes';

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

  async insertMany(concerts: any[]): Promise<IConcert[]> {
    if (!concerts || concerts.length === 0) return [];
    const processedConcerts = concerts.map((concert) => {
      const now = new Date();
      return {
        ...concert,
        status: concert.status || 'upcoming',
        likes: concert.likes || [],
        likesCount: concert.likesCount || 0,
        createdAt: concert.createdAt || now,
        updatedAt: concert.updatedAt || now,
        datetime: concert.datetime.map((dt: any) => new Date(dt)),
        ticketOpenDate: concert.ticketOpenDate
          ? new Date(concert.ticketOpenDate)
          : undefined,
      };
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

  async bulkWrite(operations: any[]): Promise<any> {
    if (!operations || operations.length === 0) {
      return { modifiedCount: 0, upsertedCount: 0, insertedCount: 0 };
    }
    return await this.collection.bulkWrite(operations, { ordered: false });
  }

  async batchLikeOperations(
    operations: Array<{
      concertId: string;
      userId: string;
      action: 'add' | 'remove';
    }>,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!operations || operations.length === 0)
      return { success: 0, failed: 0, errors: [] };

    const bulkOps: any[] = [];
    const errors: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const op of operations) {
      try {
        const { concertId, userId, action } = op;
        if (!concertId || !userId || !['add', 'remove'].includes(action)) {
          errors.push({ ...op, error: '잘못된 매개변수' });
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
          ...op,
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
