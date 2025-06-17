import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId; // string 대신 ObjectId 사용
  email: string;
  username: string;
  passwordHash: string;
  profileImage?: string;
  createdAt: Date;
  updatedAt?: Date;
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
