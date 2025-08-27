import { ObjectId } from 'mongodb';
import { Terms, TermsModel } from '../../models/auth/terms';
import { UserAgreement, UserAgreementModel } from '../../models/auth/userAgreement';

export class TermsService {
  private termsModel: TermsModel;
  private userAgreementModel: UserAgreementModel;

  constructor() {
    this.termsModel = new TermsModel();
    this.userAgreementModel = new UserAgreementModel();
  }

  async getLatestTerms(type: 'terms_of_service' | 'privacy_policy'): Promise<Terms | null> {
    return this.termsModel.findLatest(type);
  }

  async agreeToTerms(userId: ObjectId, termsId: ObjectId): Promise<UserAgreement> {
    const agreement: Omit<UserAgreement, '_id'> = {
      userId,
      termsId,
      agreedAt: new Date(),
    };
    return this.userAgreementModel.create(agreement);
  }

  async getUserAgreements(userId: ObjectId): Promise<UserAgreement[]> {
    return this.userAgreementModel.findByUserId(userId);
  }
}
