// src/report/reportResolvers.ts

import { ObjectId } from 'mongodb';
import { ReportService } from './reportService';
import { ReportStatus, ReportEntityType, ReportType } from './reportEnums';

// GraphQL AST types
interface StringValueNode {
  kind: 'StringValue';
  value: string;
}

// Custom ObjectId scalar
const ObjectIdScalar = {
  __serialize(value: ObjectId): string {
    return value.toHexString(); // Convert ObjectId to string for output
  },
  __parseValue(value: string): ObjectId {
    return new ObjectId(value); // Convert input string to ObjectId
  },
  __parseLiteral(ast: StringValueNode): ObjectId | undefined {
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

// GraphQL resolver parent/context types (adjust based on your GraphQL setup)
interface GraphQLParent {
  [key: string]: unknown;
}

// Query arguments
interface GetReportArgs {
  id: ObjectId;
}

interface GetReportsArgs {
  status?: ReportStatus;
  reportedEntityType?: ReportEntityType;
}

// Mutation arguments
interface CreateReportArgs {
  input: CreateReportInput;
}

interface UpdateReportStatusArgs {
  id: ObjectId;
  input: UpdateReportStatusInput;
}

interface DeleteReportArgs {
  id: ObjectId;
}

// Filter type for reports query
interface ReportFilter {
  status?: ReportStatus;
  reportedEntityType?: ReportEntityType;
}

export const reportResolvers = (
  reportService: ReportService,
): Record<string, unknown> => ({
  ObjectId: ObjectIdScalar,
  Query: {
    getReport: async (_parent: GraphQLParent, { id }: GetReportArgs) => {
      return reportService.getReportById(id);
    },
    getReports: async (
      _parent: GraphQLParent,
      { status, reportedEntityType }: GetReportsArgs,
    ) => {
      const filter: ReportFilter = {};
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
    createReport: async (
      _parent: GraphQLParent,
      { input }: CreateReportArgs,
    ) => {
      const {
        reporterId,
        reportedEntityType,
        reportedEntityId,
        reportType,
        reason,
      } = input;
      return reportService.createReport({
        reporterId: new ObjectId(reporterId),
        reportedEntityType,
        reportedEntityId: new ObjectId(reportedEntityId),
        reportType,
        reason,
      });
    },
    updateReportStatus: async (
      _parent: GraphQLParent,
      { id, input }: UpdateReportStatusArgs,
    ) => {
      const { status } = input;
      return reportService.updateReportStatus(id, status);
    },
    deleteReport: async (_parent: GraphQLParent, { id }: DeleteReportArgs) => {
      return reportService.deleteReport(id);
    },
  },
});
