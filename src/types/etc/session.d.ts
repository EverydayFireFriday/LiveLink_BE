// src/types/express-session.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      userId: string;
      email: string;
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
    };
  }
}
