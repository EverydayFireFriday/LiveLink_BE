import { Collection } from 'mongodb';
import { IConcert } from '../base/ConcertTypes';

export class ConcertStats {
  collection: Collection<IConcert>;

  constructor(collection: Collection<IConcert>) {
    this.collection = collection;
  }

  async getStats(): Promise<{
    total: number;
    upcoming: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    totalLikes: number;
    averageLikes: number;
  }> {
    const [statusStats, likeStats] = await Promise.all([
      this.collection.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray(),
      this.collection.aggregate([
        { $group: { _id: null, totalLikes: { $sum: '$likesCount' }, totalConcerts: { $sum: 1 } } },
      ]).toArray(),
    ]);

    const result = { total: 0, upcoming: 0, ongoing: 0, completed: 0, cancelled: 0, totalLikes: 0, averageLikes: 0 };

    statusStats.forEach((stat: any) => {
      result[stat._id as keyof typeof result] = stat.count;
      result.total += stat.count;
    });

    if (likeStats.length > 0) {
      result.totalLikes = likeStats[0].totalLikes || 0;
      result.averageLikes = result.total > 0 ? Math.round((result.totalLikes / result.total) * 100) / 100 : 0;
    }

    return result;
  }
}
