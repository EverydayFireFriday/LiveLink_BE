// src/report/reportTypeDefs.ts

import { gql } from 'apollo-server-express';

export const reportTypeDefs = gql`
  scalar ObjectId

  enum ReportEntityType {
    POST
    COMMENT
    USER
    MESSAGE
  }

  enum ReportType {
    SPAM
    HARASSMENT
    INAPPROPRIATE
    COPYRIGHT
    FAKE_INFO
    HATE_SPEECH
    OTHER
  }

  enum ReportStatus {
    PENDING
    REVIEWING
    RESOLVED
    REJECTED
  }

  type Report {
    _id: ObjectId!
    reporterId: ObjectId!
    reportedEntityType: ReportEntityType!
    reportedEntityId: ObjectId!
    reportType: ReportType!
    reason: String
    status: ReportStatus!
    createdAt: String!
    updatedAt: String!
  }

  input CreateReportInput {
    reporterId: ObjectId!
    reportedEntityType: ReportEntityType!
    reportedEntityId: ObjectId!
    reportType: ReportType!
    reason: String
  }

  input UpdateReportStatusInput {
    status: ReportStatus!
  }

  type Query {
    getReport(id: ObjectId!): Report
    getReports(
      status: ReportStatus
      reportedEntityType: ReportEntityType
    ): [Report]
  }

  type Mutation {
    createReport(input: CreateReportInput!): Report!
    updateReportStatus(id: ObjectId!, input: UpdateReportStatusInput!): Report
    deleteReport(id: ObjectId!): Boolean!
  }
`;
