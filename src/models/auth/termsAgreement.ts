import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDB } from '../../utils/db';

export interface ITermsAgreement {
  _id?: ObjectId;
  userId: ObjectId;
  termsId: ObjectId; // Reference to the specific terms document
  agreedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class TermsAgreementModel {
  private collection: Collection<ITermsAgreement>;

  constructor() {
    this.collection = getDB().collection<ITermsAgreement>('termsAgreements');
    this.initializeIndexes();
  }

  private async initializeIndexes() {
    try {
      await this.collection.createIndex({ userId: 1, termsId: 1 }, { unique: true });
      await this.collection.createIndex({ userId: 1 });
      // Add other indexes as needed
    } catch (error) {
      console.error('Failed to create indexes for termsAgreements collection:', error);
    }
  }

  async createTermsAgreement(agreementData: Omit<ITermsAgreement, '_id' | 'createdAt' | 'updatedAt' | 'agreedAt'>, options?: { session?: ClientSession }): Promise<ITermsAgreement> {
    const now = new Date();
    const agreement: Omit<ITermsAgreement, '_id'> = {
      ...agreementData,
      agreedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(agreement, options); // Pass options here
    return { _id: result.insertedId, ...agreement };
  }

  async findUserAgreement(userId: ObjectId, termsId: ObjectId): Promise<ITermsAgreement | null> {
    return await this.collection.findOne({ userId, termsId });
  }

  async findUserAgreements(userId: ObjectId): Promise<ITermsAgreement[]> {
    return await this.collection.find({ userId }).toArray();
  }
}
