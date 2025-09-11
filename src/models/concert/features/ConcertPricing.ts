import { Collection } from 'mongodb';
import { IConcert } from '../base/ConcertTypes';

export class ConcertPricing {
  collection: Collection<IConcert>;

  constructor(collection: Collection<IConcert>) {
    this.collection = collection;
  }

  // Add pricing related methods here in the future
}
