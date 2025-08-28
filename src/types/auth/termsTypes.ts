import { ObjectId } from 'mongodb';

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

export interface ITermsAgreement {
  _id?: ObjectId;
  userId: ObjectId;
  termsId: ObjectId;
  agreedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgreementInput {
  type: TermsType;
  version: string;
  agreed: boolean;
}
