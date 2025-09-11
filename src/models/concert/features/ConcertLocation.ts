import { Collection } from 'mongodb';
import { IConcert } from '../base/ConcertTypes';

export class ConcertLocation {
  collection: Collection<IConcert>;

  constructor(collection: Collection<IConcert>) {
    this.collection = collection;
  }

  async findByLocation(location: string): Promise<IConcert[]> {
    return await this.collection
      .find({ location: new RegExp(location, 'i') })
      .sort({ datetime: 1 })
      .toArray();
  }
}
