import { Collection } from 'mongodb';
import { IConcert } from '../base/ConcertTypes';

export class ConcertSearch {
  collection: Collection<IConcert>;

  constructor(collection: Collection<IConcert>) {
    this.collection = collection;
  }

  async findUpcoming(): Promise<IConcert[]> {
    return await this.collection
      .find({
        datetime: { $elemMatch: { $gte: new Date() } },
        status: { $ne: 'cancelled' },
      })
      .sort({ datetime: 1 })
      .toArray();
  }

  async findByArtist(artist: string): Promise<IConcert[]> {
    return await this.collection
      .find({ artist: { $in: [new RegExp(artist, 'i')] } })
      .sort({ datetime: 1 })
      .toArray();
  }

  async searchConcerts(query: string): Promise<IConcert[]> {
    // 부분 문자열 검색을 위한 정규표현식 (대소문자 무시)
    const regex = new RegExp(query, 'i');

    // title, artist, description, location 등 여러 필드에서 검색
    return await this.collection
      .find({
        $or: [
          { title: { $regex: regex } },
          { artist: { $elemMatch: { $regex: regex } } },
          { description: { $regex: regex } },
          { location: { $elemMatch: { $regex: regex } } },
        ],
      })
      .sort({ datetime: 1, createdAt: -1 })
      .toArray();
  }

  async findByStatus(status: IConcert['status']): Promise<IConcert[]> {
    return await this.collection
      .find({ status })
      .sort({ datetime: 1 })
      .toArray();
  }

  async findByCategory(category: string): Promise<IConcert[]> {
    return await this.collection
      .find({ category: { $in: [category] } })
      .sort({ datetime: 1 })
      .toArray();
  }
}
