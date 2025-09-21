// src/report/reportEnums.ts

export enum ReportEntityType {
  POST = 'POST',
  COMMENT = 'COMMENT',
  USER = 'USER',
  MESSAGE = 'MESSAGE',
}

export enum ReportType {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  INAPPROPRIATE = 'INAPPROPRIATE',
  COPYRIGHT = 'COPYRIGHT',
  FAKE_INFO = 'FAKE_INFO',
  HATE_SPEECH = 'HATE_SPEECH',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}
