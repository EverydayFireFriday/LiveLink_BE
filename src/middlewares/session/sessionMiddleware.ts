import express from 'express';
import session, { Store } from 'express-session';
import crypto from 'crypto';
import RedisStore from 'connect-redis';
import { redisClient } from '../../config/redis/redisClient';

// connect-redis v7.1.1 방식 (named export)
export const sessionMiddleware = (app: express.Application) => {
  const store = new (RedisStore as any)({ client: redisClient }) as Store;

  app.use(
    session({
      store: store,
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
