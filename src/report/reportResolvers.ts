// src/report/reportResolvers.ts

import { ObjectId } from 'mongodb';
import { ReportService } from './reportService';
import { ReportStatus, ReportEntityType, ReportType } from './reportEnums';

// Custom ObjectId scalar
const ObjectIdScalar = {
  __serialize(value: ObjectId): string {
    return value.toHexString(); // Convert ObjectId to string for output
  },
  __parseValue(value: string): ObjectId {
    return new ObjectId(value); // Convert input string to ObjectId
  },
  __parseLiteral(ast: any): ObjectId | undefined {
    if (ast.kind === 'StringValue') {
      return new ObjectId(ast.value); // Convert AST string value to ObjectId
    }
    return undefined; // Invalid input
  },
};

interface CreateReportInput {
  reporterId: string;
  reportedEntityType: ReportEntityType;
  reportedEntityId: string;
  reportType: ReportType;
  reason?: string;
}

interface UpdateReportStatusInput {
  status: ReportStatus;
}

export const reportResolvers = (reportService: ReportService): any => ({
  ObjectId: ObjectIdScalar,
  Query: {
    getReport: async (_: any, { id }: { id: ObjectId }) => {
      return reportService.getReportById(id);
    },
    getReports: async (_: any, { status, reportedEntityType }: { status?: ReportStatus, reportedEntityType?: ReportEntityType }) => {
      const filter: any = {};
      if (status) {
        filter.status = status;
      }
      if (reportedEntityType) {
        filter.reportedEntityType = reportedEntityType;
      }
      return reportService.getReports(filter);
    },
  },
  Mutation: {
    createReport: async (_: any, { input }: { input: CreateReportInput }) => {
      const { reporterId, reportedEntityType, reportedEntityId, reportType, reason } = input;
      return reportService.createReport({
        reporterId: new ObjectId(reporterId),
        reportedEntityType,
        reportedEntityId: new ObjectId(reportedEntityId),
        reportType,
        reason,
      });
    },
    updateReportStatus: async (_: any, { id, input }: { id: ObjectId, input: UpdateReportStatusInput }) => {
      const { status } = input;
      return reportService.updateReportStatus(id, status);
    },
    deleteReport: async (_: any, { id }: { id: ObjectId }) => {
      return reportService.deleteReport(id);
    },
  },
});
