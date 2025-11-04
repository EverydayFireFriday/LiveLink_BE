import 'express-session';

// 약관 동의 정보 타입
interface TermsConsent {
  type: string; // 'terms' | 'privacy' | 'marketing'
  isAgreed: boolean;
  version: string;
  agreedAt?: Date;
}

// 알림 설정 타입
interface NotificationPreference {
  ticketOpenNotification: number[]; // [10, 30, 60, 1440]
  concertStartNotification: number[]; // [60, 180, 1440]
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
      fcmToken?: string;
      fcmTokenUpdatedAt?: Date;
      notificationPreference?: NotificationPreference; // ✅ 알림 설정 추가
      loginTime: string;
    };
  }
}
