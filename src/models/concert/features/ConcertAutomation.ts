import { Collection } from 'mongodb';
import { IConcert } from '../base/ConcertTypes';

export class ConcertAutomation {
  collection: Collection<IConcert>;

  constructor(collection: Collection<IConcert>) {
    this.collection = collection;
  }

  async updateExpiredConcerts(): Promise<number> {
    const now = new Date();
    const result = await this.collection.updateMany(
      {
        datetime: { $elemMatch: { $lt: now } },
        status: { $in: ['upcoming', 'ongoing'] },
      },
      {
        $set: {
          status: 'completed',
          updatedAt: now,
        },
      },
    );
    return result.modifiedCount;
  }
}
