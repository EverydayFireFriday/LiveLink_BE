import { Collection } from 'mongodb';
import { IConcert } from '../base/ConcertTypes';

export class ConcertTicketing {
  collection: Collection<IConcert>;

  constructor(collection: Collection<IConcert>) {
    this.collection = collection;
  }

  async findUpcomingTicketOpen(): Promise<IConcert[]> {
    const now = new Date();
    return await this.collection
      .find({ ticketOpenDate: { $gte: now }, status: 'upcoming' })
      .sort({ ticketOpenDate: 1 })
      .toArray();
  }
}
