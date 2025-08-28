import { UserModel, UserStatus } from "../../models/auth/user";
import { User } from "../../types/auth/authTypes";
import { TermsModel, TermsType, ITerms } from "../../models/auth/terms"; // New import
import { TermsAgreementModel } from "../../models/auth/termsAgreement"; // New import
import { IAgreementInput } from "../../types/auth/termsTypes"; // New import
import { getClient } from "../../utils/db"; // New import for transaction
import { ClientSession } from "mongodb"; // New import for transaction

export class UserService {
  private userModel: UserModel | null = null;
  private termsModel: TermsModel | null = null;
  private termsAgreementModel: TermsAgreementModel | null = null;

  // UserModel을 지연 초기화하는 함수
  private getUserModel(): UserModel {
    if (!this.userModel) {
      this.userModel = new UserModel();
    }
    return this.userModel;
  }

  private getTermsModel(): TermsModel {
    if (!this.termsModel) {
      this.termsModel = new TermsModel();
    }
    return this.termsModel;
  }

  private getTermsAgreementModel(): TermsAgreementModel {
    if (!this.termsAgreementModel) {
      this.termsAgreementModel = new TermsAgreementModel();
    }
    return this.termsAgreementModel;
  }

  async findByEmail(email: string): Promise<User | null> {
    return (await this.getUserModel().findByEmail(email)) as User | null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return (await this.getUserModel().findByUsername(username)) as User | null;
  }

  async findById(id: string): Promise<User | null> {
    return (await this.getUserModel().findById(id)) as User | null;
  }

  async createUser(userData: {
    email: string;
    username: string;
    passwordHash: string;
    profileImage?: string;
    agreements?: IAgreementInput[]; // Added agreements
  }): Promise<User> {
    const session = getClient().startSession();
    session.startTransaction(); // Start transaction

    try {
      const newUser = (await this.getUserModel().createUser(userData, { session })) as User; // Pass session to createUser

      if (userData.agreements && userData.agreements.length > 0) {
        const termsModel = this.getTermsModel();
        const termsAgreementModel = this.getTermsAgreementModel();

        for (const agreementInput of userData.agreements) {
          if (agreementInput.agreed) {
            // Find the latest version of the terms or a specific version if provided
            let terms: ITerms | null = null;
            if (agreementInput.version) {
              terms = await termsModel.findTermsByTypeAndVersion(agreementInput.type, agreementInput.version);
            } else {
              terms = await termsModel.findLatestTermsByType(agreementInput.type);
            }

            if (!terms) {
              throw new Error(`Terms of type ${agreementInput.type} (version ${agreementInput.version || 'latest'}) not found.`);
            }

            await termsAgreementModel.createTermsAgreement({
              userId: newUser._id!,
              termsId: terms._id!,
            }, { session }); // Pass session to createTermsAgreement
          }
        }
      }

      await session.commitTransaction(); // Commit transaction
      return newUser;
    } catch (error) {
      await session.abortTransaction(); // Abort transaction on error
      throw error;
    } finally {
      session.endSession(); // End session
    }
  }

  async updateUser(
    id: string,
    updateData: Partial<User>
  ): Promise<User | null> {
    return (await this.getUserModel().updateUser(
      id,
      updateData
    )) as User | null;
  }

  async generateUsername(
    email: string,
    baseUsername?: string
  ): Promise<string> {
    let username = baseUsername || email.split("@")[0];
    username = username.replace(/[^a-zA-Z0-9가-힣]/g, "").toLowerCase();

    if (username.length < 2) username = "user";
    if (username.length > 15) username = username.substring(0, 15);

    let finalUsername = username;
    let counter = 1;

    while (await this.findByUsername(finalUsername)) {
      finalUsername = `${username}${counter}`;
      counter++;

      if (counter > 9999) {
        finalUsername = `${username}${Date.now().toString().slice(-4)}`;
        break;
      }
    }

    return finalUsername;
  }

  async getAllUsers(limit: number = 50, skip: number = 0): Promise<User[]> {
    return (await this.getUserModel().findAllUsers(limit, skip)) as User[];
  }

  async countUsers(): Promise<number> {
    return await this.getUserModel().countUsers();
  }
}
