import { Collection } from 'mongodb';
import { IConcert } from '../base/ConcertTypes';

export class ConcertSearch {
  collection: Collection<IConcert>;

  constructor(collection: Collection<IConcert>) {
    this.collection = collection;
  }

  async findUpcoming(): Promise<IConcert[]> {
    return await this.collection
      .find({ datetime: { $elemMatch: { $gte: new Date() } }, status: { $ne: 'cancelled' } })
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
    return await this.collection
      .find({ $text: { $search: query } }, { projection: { score: { $meta: 'textScore' } } })
      .sort({ score: { $meta: 'textScore' } })
      .toArray();
  }

  async findByStatus(status: IConcert['status']): Promise<IConcert[]> {
    return await this.collection.find({ status }).sort({ datetime: 1 }).toArray();
  }

  async findByCategory(category: string): Promise<IConcert[]> {
    return await this.collection.find({ category: { $in: [category] } }).sort({ datetime: 1 }).toArray();
  }

  
}
