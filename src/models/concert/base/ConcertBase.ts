import { ObjectId, Collection, Db } from 'mongodb';
import logger from '../../../utils/logger/logger';
import { IConcert } from './ConcertTypes';

export class ConcertBase {
  db: Db;
  collection: Collection<IConcert>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<IConcert>('concerts');
    this.createMinimalIndexes();
  }

  private async createMinimalIndexes() {
    try {
      logger.info('Concert 최소 인덱스 생성 시작...');
      await this.collection.createIndex({ uid: 1 }, { unique: true });
      await this.collection.createIndex({ title: 'text', artist: 'text', location: 'text', description: 'text' });
      await this.collection.createIndex({ 'likes.userId': 1 });
      await this.collection.createIndex({ _id: 1 });
      logger.info('🎉 Concert 최소 인덱스 생성 완료');
    } catch (error) {
      logger.error('❌ 인덱스 생성 중 오류:', error);
    }
  }

  async create(concertData: Omit<IConcert, 'createdAt' | 'updatedAt'>): Promise<IConcert> {
    const now = new Date();
    const concert: IConcert = {
      ...concertData,
      status: concertData.status || 'upcoming',
      likes: concertData.likes || [],
      likesCount: concertData.likesCount || 0,
      createdAt: now,
      updatedAt: now,
    };

    if (concert.datetime) {
      concert.datetime = concert.datetime.map(dt => (dt instanceof Date ? dt : new Date(dt)));
    }
    if (concert.ticketOpenDate && !(concert.ticketOpenDate instanceof Date)) {
      concert.ticketOpenDate = new Date(concert.ticketOpenDate);
    }

    const result = await this.collection.insertOne(concert);
    if (!result.insertedId) {
      throw new Error('콘서트 생성에 실패했습니다.');
    }
    return concert;
  }

  async findById(id: string): Promise<IConcert | null> {
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { uid: id };
    return await this.collection.findOne(query);
  }

  async findByUid(uid: string): Promise<IConcert | null> {
    return await this.collection.findOne({ uid });
  }

  async findMany(
    filter: any = {},
    options: { page?: number; limit?: number; sort?: any } = {},
  ): Promise<{ concerts: IConcert[]; total: number }> {
    const { page = 1, limit = 20, sort = { datetime: 1, createdAt: -1 } } = options;
    const skip = (page - 1) * limit;
    const [concerts, total] = await Promise.all([
      this.collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { concerts, total };
  }

  async updateById(id: string, updateData: Partial<IConcert>): Promise<IConcert | null> {
    if (updateData.uid) delete updateData.uid;
    if (updateData.likes) delete updateData.likes;
    if (updateData.likesCount) delete updateData.likesCount;

    updateData.updatedAt = new Date();

    if (updateData.datetime && Array.isArray(updateData.datetime)) {
      updateData.datetime = updateData.datetime.map(dt => new Date(dt));
    }
    if (updateData.ticketOpenDate && !(updateData.ticketOpenDate instanceof Date)) {
      updateData.ticketOpenDate = new Date(updateData.ticketOpenDate);
    }

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { uid: id };
    const result = await this.collection.findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: 'after' },
    );
    return result ? result : null;
  }

  async deleteById(id: string): Promise<IConcert | null> {
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { uid: id };
    const result = await this.collection.findOneAndDelete(query);
    return result ? result : null;
  }
}
