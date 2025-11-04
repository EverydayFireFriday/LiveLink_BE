import 'express-session';

// 약관 동의 정보 타입
interface TermsConsent {
  type: string; // 'terms' | 'privacy' | 'marketing'
  isAgreed: boolean;
  version: string;
  agreedAt?: Date;
}

declare module 'express-session' {
  interface SessionData {
    user?: {
      userId: string;
      email: string;
      username: string;
      name?: string;
      birthDate?: Date;
      status: string;
      statusReason?: string;
      profileImage?: string;
      termsConsents: TermsConsent[]; // ✅ 최신 배열 구조
      createdAt: Date;
      updatedAt: Date;
      provider?: string;
      socialId?: string;
      likedConcerts: string[];
      likedArticles: string[];
      loginTime: string;
    };
  }
}
