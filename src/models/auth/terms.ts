import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDB } from '../../utils/db';

export enum TermsType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  MARKETING_CONSENT = 'MARKETING_CONSENT',
}

export interface ITerms {
  _id?: ObjectId;
  type: TermsType;
  version: string;
  content: string;
  effectiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class TermsModel {
  private collection: Collection<ITerms>;

  constructor() {
    this.collection = getDB().collection<ITerms>('terms');
    this.initializeIndexes();
  }

  private async initializeIndexes() {
    try {
      await this.collection.createIndex({ type: 1, version: 1 }, { unique: true });
      // Add other indexes as needed, e.g., for effectiveDate
    } catch (error) {
      console.error('Failed to create indexes for terms collection:', error);
    }
  }

  async createTerms(termsData: Omit<ITerms, '_id' | 'createdAt' | 'updatedAt'>, options?: { session?: ClientSession }): Promise<ITerms> {
    const now = new Date();
    const terms: Omit<ITerms, '_id'> = {
      ...termsData,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(terms, options); // Pass options here
    return { _id: result.insertedId, ...terms };
  }

  async findTermsByTypeAndVersion(type: TermsType, version: string): Promise<ITerms | null> {
    return await this.collection.findOne({ type, version });
  }

  async findLatestTermsByType(type: TermsType): Promise<ITerms | null> {
    // Assuming 'version' can be sorted lexicographically or is a semantic version
    // For robust versioning, a more complex sorting might be needed.
    return await this.collection.findOne({ type }, { sort: { version: -1, effectiveDate: -1 } });
  }

  async findById(id: string | ObjectId): Promise<ITerms | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.collection.findOne({ _id: objectId });
  }
}