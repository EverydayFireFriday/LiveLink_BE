// src/types/express-session.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      email: string;        // 아이디로 사용되는 이메일
      userId: string;
      username: string;     // 이름(수정 가능)
      profileImage?: string;
      loginTime: string;
    };
  }
}