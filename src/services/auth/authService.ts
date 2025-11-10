import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, TermsConsent } from '../../models/auth/user';

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  createSessionData(
    user: Pick<
      User,
      | 'email'
      | 'username'
      | 'name'
      | 'birthDate'
      | 'status'
      | 'statusReason'
      | 'profileImage'
      | 'termsConsents'
      | 'createdAt'
      | 'updatedAt'
    > & {
      _id?: { toHexString(): string };
      likedConcerts?: unknown;
      likedArticles?: unknown;
    },
    loginProvider: 'email' | 'google' | 'apple',
  ): {
    userId: string;
    email: string;
    username: string;
    name?: string;
    birthDate?: Date;
    status: string;
    statusReason?: string;
    profileImage?: string;
    termsConsents: TermsConsent[];
    createdAt: Date;
    updatedAt: Date;
    likedConcerts?: unknown;
    likedArticles?: unknown;
    loginTime: string;
    loginProvider: 'email' | 'google' | 'apple';
  } {
    return {
      userId: user._id!.toHexString(), // ObjectId를 string으로 변환
      email: user.email,
      username: user.username,
      name: user.name,
      birthDate: user.birthDate,
      status: user.status,
      statusReason: user.statusReason,
      profileImage: user.profileImage,
      termsConsents: user.termsConsents || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      likedConcerts: user.likedConcerts,
      likedArticles: user.likedArticles,
      loginTime: new Date().toISOString(),
      loginProvider,
    };
  }
}
