import express from "express";
import session from "express-session";
import { createClient } from "redis";
import logger from "../utils/logger";

// connect-redis v6.1.3 방식
const RedisStore = require("connect-redis")(session);

// Redis 클라이언트 생성 (index.ts와 동일하게)
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  legacyMode: true, // 중요!
});

// Redis 이벤트 핸들링 (에러 필터링)
redisClient.on("connect", () => logger.info("✅ Redis connected (session)"));
redisClient.on("error", (err) => {
  // 종료 과정에서 발생하는 에러는 무시
  if (err.message?.includes('Disconnects client') || 
      err.message?.includes('destroy')) {
    return;
  }
  logger.info("❌ Redis Error (session):", err);
});

// Redis 연결
redisClient.connect().catch(logger.error);

export const sessionMiddleware = (app: express.Application) => {
  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET || "yourSecretKey",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 1일
      },
    })
  );
};

// Redis 클라이언트를 다른 모듈에서 사용할 수 있도록 export
export { redisClient };

// 우아한 종료를 위한 disconnect 함수
export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient?.isOpen) {
      await redisClient.disconnect();
    }
    logger.info("✅ Redis disconnected (session)");
  } catch (error) {
    logger.info("✅ Redis disconnected (session)");
  }
};