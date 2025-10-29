import { ObjectId } from 'mongodb';
import { UserStatus } from '../../models/auth/user';
import { IConcert } from '../../models/concert/base/ConcertTypes';
import { Article } from '../article/articleTypes';

export interface User {
  _id?: ObjectId;
  email: string;
  username: string;
  name: string;
  birthDate: Date;
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
  likedConcerts?: Array<ObjectId | IConcert>; // Can be ObjectId or populated IConcert
  likedArticles?: Array<string | Article>; // Can be string ID or populated Article
  fcmToken?: string; // FCM 푸시 알림 토큰
  fcmTokenUpdatedAt?: Date; // FCM 토큰 업데이트 시간
}

export interface SessionUser {
  email: string;
  userId: string; // 세션에서는 문자열로 저장
  username: string;
  name: string;
  birthDate: Date;
  status: string;
  statusReason?: string;
  profileImage?: string;
  isTermsAgreed: boolean;
  termsVersion?: string;
  createdAt: Date;
  updatedAt: Date;
  provider?: string;
  socialId?: string;
  likedConcerts: string[];
  likedArticles: string[];
  loginTime: string;
}

export interface VerificationData {
  code: string;
  email: string;
  type: 'password_reset' | 'email_verification';
  createdAt: string;
  userData?: {
    username: string;
    passwordHash: string;
    name: string;
    birthDate: Date;
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

// 새로운 회원가입 플로우 타입 정의
export interface SendVerificationEmailRequest {
  email: string;
}

export interface VerifyEmailRequest {
  email: string;
  verificationCode: string;
}

export interface VerifyEmailResponse {
  verificationToken: string; // 이메일 인증 완료 토큰
  expiresIn: string;
}

export interface CompleteRegistrationRequest {
  verificationToken: string; // 이메일 인증 완료 토큰
  password: string;
  name: string;
  birthDate: string; // YYYY-MM-DD 형식
  username?: string;
  profileImage?: string;
  isTermsAgreed: boolean;
  termsVersion: string;
}

// Redis에 저장될 이메일 인증 완료 토큰 데이터
export interface EmailVerificationToken {
  email: string;
  verified: boolean;
  createdAt: string;
}

// 디바이스 타입 정의
export enum DeviceType {
  MOBILE = 'mobile',
  WEB = 'web',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  UNKNOWN = 'unknown',
}

// 디바이스 정보
export interface DeviceInfo {
  name: string; // "iPhone 14", "Chrome on Windows"
  type: DeviceType;
  userAgent: string;
  ipAddress: string;
}

// UserSession 문서 스키마
export interface UserSession {
  _id?: ObjectId;
  userId: ObjectId; // User 참조
  sessionId: string; // Redis 세션 ID (connect.sid)
  deviceInfo: DeviceInfo;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

// 세션 조회 응답
export interface SessionResponse {
  sessionId: string;
  deviceInfo: DeviceInfo;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean; // 현재 요청의 세션인지 여부
}
