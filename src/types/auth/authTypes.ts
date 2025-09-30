import { ObjectId } from "mongodb";
import { UserStatus } from "../../models/auth/user";

export interface User {
  _id?: ObjectId;
  email: string;
  username: string;
  passwordHash?: string;
  status: UserStatus;
  statusReason?: string;
  profileImage?: string;
  isTermsAgreed: boolean;
  termsVersion: string;
  createdAt: Date;
  updatedAt: Date;
  provider?: string;
  socialId?: string;
  likedConcerts?: any[]; // Populated with concert objects
  likedArticles?: any[]; // Populated with article objects
}

export interface SessionUser {
  email: string;
  userId: string; // 세션에서는 문자열로 저장
  username: string;
  profileImage?: string;
  loginTime: string;
}

export interface VerificationData {
  code: string;
  email: string;
  type: "password_reset" | "email_verification";
  createdAt: string;
  userData?: {
    username: string;
    passwordHash: string;
    profileImage?: string;
    isTermsAgreed: boolean; // 약관 동의 여부 추가
    termsVersion: string; // 약관 버전 추가
  };
}

export interface RegisterRequest {
  email: string;
  username?: string;
  password: string;
  profileImage?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
  verificationCode: string;
  newPassword: string;
}
