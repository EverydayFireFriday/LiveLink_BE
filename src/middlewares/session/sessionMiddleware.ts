import express from 'express';
import session from 'express-session';
import crypto from 'crypto';
import connectRedis from 'connect-redis';
import { redisClient } from '../../config/redis/redisClient';

// connect-redis v6.1.3 방식
const RedisStore = connectRedis(session);

export const sessionMiddleware = (app: express.Application) => {
  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret:
        process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 1일
      },
    }),
  );
};

// Redis 클라이언트를 다른 모듈에서 사용할 수 있도록 export
export { redisClient };
