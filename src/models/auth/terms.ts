import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../../utils/db';

export interface Terms {
  _id?: ObjectId;
  type: 'terms_of_service' | 'privacy_policy';
  version: string;
  content: string;
  publishedAt: Date;
  createdAt: Date;
}

export class TermsModel {
  private collection: Collection<Terms>;

  constructor() {
    this.collection = getDatabase().collection<Terms>('terms');
    this.collection.createIndex({ type: 1, version: 1 }, { unique: true });
  }

  async create(terms: Omit<Terms, '_id' | 'createdAt'>): Promise<Terms> {
    const now = new Date();
    const newTerms: Omit<Terms, '_id'> = {
      ...terms,
      createdAt: now,
    };
    const result = await this.collection.insertOne(newTerms);
    return { ...newTerms, _id: result.insertedId };
  }

  async findLatest(type: 'terms_of_service' | 'privacy_policy'): Promise<Terms | null> {
    return this.collection.findOne({ type }, { sort: { publishedAt: -1 } });
  }

  async findByVersion(type: 'terms_of_service' | 'privacy_policy', version: string): Promise<Terms | null> {
    return this.collection.findOne({ type, version });
  }

  async findById(id: ObjectId): Promise<Terms | null> {
    return this.collection.findOne({ _id: id });
  }
}
