// src/report/reportService.ts

import { Collection, ObjectId, Db, Filter, FindOptions } from 'mongodb';
import { Report } from './reportModel';
import { ReportStatus } from './reportEnums';
import logger from '../utils/logger/logger';

// MongoDB Index 타입
interface MongoIndex {
  name?: string;
  [key: string]: unknown;
}

export class ReportService {
  private reportsCollection: Collection<Report>;
  private db: Db;

  constructor(db: Db) {
    this.db = db;
    this.reportsCollection = db.collection<Report>('reports');
    void this.ensureIndexes();
  }

  private async ensureIndexes(): Promise<void> {
    try {
      // Check if collection exists by listing collections
      const collections = await this.db
        .listCollections({ name: 'reports' })
        .toArray();

      // If collection doesn't exist yet, create indexes anyway - they'll be applied when collection is created
      if (collections.length === 0) {
        logger.info(
          'Reports collection does not exist yet, creating indexes...',
        );
      }

      // 기존 인덱스 목록 조회 (only if collection exists)
      let existingIndexes: unknown[] = [];
      if (collections.length > 0) {
        existingIndexes = await this.reportsCollection.listIndexes().toArray();

        // 오래된 contentId 관련 인덱스 삭제
        for (const index of existingIndexes as MongoIndex[]) {
          const indexName = index.name;
          if (indexName?.includes('contentId')) {
            await this.reportsCollection.dropIndex(indexName);
            logger.info(`Dropped old index: ${indexName}`);
          }
        }
      }

      // 새로운 인덱스 생성
      await this.reportsCollection.createIndex({
        reportedEntityType: 1,
        reportedEntityId: 1,
      });
      await this.reportsCollection.createIndex({ reporterId: 1 });
      await this.reportsCollection.createIndex({ status: 1, createdAt: -1 });
      // Optimized compound index for queries filtering by status and entity type, and sorting by creation date
      await this.reportsCollection.createIndex({
        status: 1,
        reportedEntityType: 1,
        createdAt: -1,
      });

      logger.info('Report indexes ensured successfully');
    } catch (error) {
      logger.error('Error ensuring indexes:', error);
    }
  }

  async createReport(
    reportData: Omit<Report, '_id' | 'createdAt' | 'updatedAt' | 'status'>,
  ): Promise<Report> {
    const newReport: Report = {
      ...reportData,
      status: ReportStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.reportsCollection.insertOne(newReport);
    return { ...newReport, _id: result.insertedId };
  }

  async getReportById(id: ObjectId): Promise<Report | null> {
    return this.reportsCollection.findOne({ _id: id });
  }

  async getReports(
    filter: Filter<Report> = {},
    options: FindOptions<Report> = {},
  ): Promise<Report[]> {
    return this.reportsCollection.find(filter, options).toArray();
  }

  async updateReportStatus(
    id: ObjectId,
    status: ReportStatus,
  ): Promise<Report | null> {
    const result = await this.reportsCollection.findOneAndUpdate(
      { _id: id },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    return result;
  }

  async deleteReport(id: ObjectId): Promise<boolean> {
    const result = await this.reportsCollection.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }
}
