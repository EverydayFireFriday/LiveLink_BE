import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../../types/auth/authTypes";

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  createSessionData(user: User): any {
    return {
      email: user.email,
      userId: user._id!.toString(), // ObjectId를 string으로 변환
      username: user.username,
      profileImage: user.profileImage,
      loginTime: new Date().toISOString(),
    };
  }
}
