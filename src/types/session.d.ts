import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      username: string;
      email: string;
      userId: string;
      profileImage?: string;
      loginTime: string;
    };
  }
}