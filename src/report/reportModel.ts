// src/report/reportModel.ts

import { ObjectId } from 'mongodb';
import { ReportEntityType, ReportType, ReportStatus } from './reportEnums';

export interface Report {
  _id?: ObjectId; // Optional for new reports before insertion
  reporterId: ObjectId; // ID of the user who reported
  reportedEntityType: ReportEntityType; // Type of entity being reported (e.g., POST, COMMENT)
  reportedEntityId: ObjectId; // ID of the reported entity
  reportType: ReportType; // Specific type of report (e.g., SPAM, HARASSMENT)
  reason?: string; // Optional reason provided by the reporter
  status: ReportStatus; // Current status of the report
  createdAt: Date;
  updatedAt: Date;
}
