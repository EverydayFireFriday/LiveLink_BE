import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../../utils/db';

export interface UserAgreement {
  _id?: ObjectId;
  userId: ObjectId;
  termsId: ObjectId;
  agreedAt: Date;
}

export class UserAgreementModel {
  private collection: Collection<UserAgreement>;

  constructor() {
    this.collection = getDatabase().collection<UserAgreement>('user_agreements');
    this.collection.createIndex({ userId: 1, termsId: 1 }, { unique: true });
  }

  async create(agreement: Omit<UserAgreement, '_id'>): Promise<UserAgreement> {
    const result = await this.collection.insertOne(agreement);
    return { ...agreement, _id: result.insertedId };
  }

  async findByUserId(userId: ObjectId): Promise<UserAgreement[]> {
    return this.collection.find({ userId }).toArray();
  }
}
