import { createServer } from "http";
import express from "express";
import session from "express-session";
import { createClient } from "redis";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import logger from "./utils/logger";
import { correlationMiddleware } from "./middlewares/correlationMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";
import logger from "./utils/logger";
import { correlationMiddleware } from "./middlewares/correlationMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";

import logger from "./utils/logger";
import { correlationMiddleware } from "./middlewares/correlationMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";
// ✅ Swagger import (새로 추가)
import { swaggerSpec, swaggerUi, swaggerUiOptions } from "./config/swagger";
import { ChatSocketServer } from "./socket";
import { initializeChatModels } from "./models/chat";

// 🔧 환경변수 로드 (맨 먼저!)
logger.info("환경변수 검증 중...", {
  emailUser: process.env.EMAIL_USER ? "설정됨" : "누락",
  redisUrl: process.env.REDIS_URL ? "설정됨" : "누락",
  adminEmails: !!process.env.ADMIN_EMAILS ? "설정됨" : "누락"
});

if (process.env.ADMIN_EMAILS) {
  const adminEmails = process.env.ADMIN_EMAILS.split(",").map((email) =>
    email.trim()
  );
  logger.info("관리자 설정 완료", { adminAccountCount: adminEmails.length });
} else {
  logger.warn("ADMIN_EMAILS가 설정되지 않았습니다!");
}
  logger.warn("⚠️  ADMIN_EMAILS가 설정되지 않았습니다!");
}
logger.info("");

// 데이터베이스 연결 함수들
import {
  connectDatabase as connectUserDB,
  disconnectDatabase as disconnectUserDB,
} from "./models/auth/user";
import {
  connectDB as connectConcertDB,
  initializeConcertModel,
} from "./utils/db";

// ✅ Article 모델 초기화 함수 추가
import { initializeAllArticleModels } from "./models/article";

// 🔧 라우터 import 수정
import authRouter from "./routes/auth/index"; // ✅ Auth 통합 라우터
import concertRouter from "./routes/concert/index"; // ✅ Concert 통합 라우터 (수정됨)
import healthRouter from "./routes/health/healthRoutes"; // ✅ Health Check 라우터

// connect-redis v6.1.3 방식
const RedisStore = require("connect-redis")(session);

const app = express();
const httpServer = createServer(app);
let chatSocketServer: ChatSocketServer;
const PORT = process.env.PORT || 3000;

// 보안 헤더 설정
app.use(helmet());

// Correlation ID 미들웨어 (가장 먼저 적용)
app.use(correlationMiddleware);

// Correlation ID 미들웨어 (가장 먼저 적용)
app.use(correlationMiddleware);


// Correlation ID 미들웨어 (가장 먼저 적용)
app.use(correlationMiddleware);
// 요청 제한 설정
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 각 IP당 15분에 100개의 요청으로 제한
  standardHeaders: true, // `RateLimit-*` 헤더 사용
  legacyHeaders: false, // `X-RateLimit-*` 헤더 비활성화
  onLimitReached: (req, res) => {
    logger.warn("Rate limit exceeded", {
app.use(limiter);

// 기본 로깅 (morgan 대신)
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const timestamp = new Date().toISOString();
    logger.info(`${timestamp} ${req.method} ${req.url} - ${req.ip}`);
    next();
  }
);

// CORS 설정
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Redis 클라이언트 생성 (legacyMode 추가)
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  legacyMode: true,
});
redisClient.on("connect", () => logger.info("Redis connected"));
// Redis 이벤트 핸들링 (에러 필터링)
redisClient.on("connect", () => logger.info("Redis connected"));
redisClient.on("error", (err) => {
  if (
    err.message?.includes("Disconnects client") ||
    err.message?.includes("destroy") ||
    err.message?.includes("Connection is closed")
  ) {
  logger.error("Redis connection error", { 
    error: err.message,
    category: "DATABASE"
redisClient.on("end", () => logger.info("Redis connection ended"));
  }
  logger.error("Redis connection error", { 
    error: err.message,
    category: 'DATABASE'
  });
});
redisClient.on("end", () => logger.info("Redis connection ended"));

redisClient.connect().catch(console.error);

// 미들웨어 설정
app.use(
  express.json({
    limit: "10mb",
    verify: (req: express.Request, res: express.Response, buf: Buffer) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        const error = new Error("잘못된 JSON 형식입니다.") as any;
        error.status = 400;
        error.type = "entity.parse.failed";
        throw error;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 세션 미들웨어 설정
app.use(
  session({
    store: new RedisStore({
      client: redisClient,
      prefix: "app:sess:",
    }),
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400000"),
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
    name: "app.session.id",
  })
);

// 데이터베이스 연결 상태 확인
let isUserDBConnected = false;
let isConcertDBConnected = false;
let isArticleDBConnected = false;
let isChatDBConnected = false;

// 데이터베이스 연결 상태 확인 미들웨어
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/auth") && !isUserDBConnected) {
      return res.status(503).json({
        message: "사용자 데이터베이스 연결이 준비되지 않았습니다.",
      });
    }
    if (req.path.startsWith("/concert") && !isConcertDBConnected) {
      return res.status(503).json({
        message: "콘서트 데이터베이스 연결이 준비되지 않았습니다.",
      });
    }
    if (req.path.startsWith("/article") && !isArticleDBConnected) {
    if (req.path.startsWith("/chat") && !isChatDBConnected) {
      return res.status(503).json({
        message: "채팅 데이터베이스 연결이 준비되지 않았습니다.",
      });
    }
      return res.status(503).json({
        message: "게시글 데이터베이스 연결이 준비되지 않았습니다.",
      });
    }
    next();
  }
);

// Swagger 설정
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);

// 기본 라우트
app.get("/", (req: express.Request, res: express.Response) => {
  res.json({
    message: "LiveLink API",
    version: "1.0.0",
    endpoints: {
      documentation: "/api-docs",
      health: "/health",
      auth: "/auth",
      concerts: "/concert",
      articles: "/article",
      chat: "/chat",
    },
    timestamp: new Date().toISOString(),
  });
});

// 정적 라우터 연결
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/concert", concertRouter);

// 우아한 종료 처리
const gracefulShutdown = async (signal: string) => {
  logger.info(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  try {
    if (redisClient?.isOpen) {
      await redisClient.disconnect();
    }
    logger.info("✅ Redis disconnected");
    await disconnectUserDB();
    logger.info("✅ User MongoDB disconnected");
    logger.info("👋 Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.info("👋 Graceful shutdown completed");
    process.exit(0);
  }
};

// 데이터베이스 초기화 함수
const initializeDatabases = async () => {
  try {
    logger.info("🔌 Connecting to User Database...");
    await connectUserDB();
    isUserDBConnected = true;
    logger.info("✅ User Database connected");

    logger.info("🔌 Connecting to Concert Database...");
    const concertDB = await connectConcertDB();
    initializeConcertModel(concertDB);
    isConcertDBConnected = true;
    logger.info("✅ Concert Database connected and models initialized");

    logger.info("🔌 Initializing Article Database...");
    initializeAllArticleModels(concertDB);
    isArticleDBConnected = true;
    logger.info("✅ Article Database initialized and models ready");
    logger.info("🔌 Initializing Chat Database...");
    initializeChatModels();
    isChatDBConnected = true;
    logger.info("✅ Chat Database initialized and models ready");

    return true;
  } catch (error) {
    logger.error("❌ Database initialization failed:", error);
    throw error;
  }
};

// 서버 시작 함수
const startServer = async () => {
  try {
    await Promise.all([initializeDatabases(), redisClient.ping()]);

    // 동적 Article 라우터 로드 및 연결
    logger.info("🔌 Loading Article routes...");
    const { default: articleRouter } = await import("./routes/article/index");
    app.use("/article", articleRouter);
    logger.info("✅ Article routes loaded and connected");
    logger.info("🔌 Loading Chat routes...");
    const { default: chatRouter } = await import("./routes/chat/index");
    app.use("/chat", chatRouter);
    logger.info("✅ Chat routes loaded and connected");

            : "알 수 없는 에러",
          timestamp: new Date().toISOString(),
        });
      }
    );

    // 404 핸들러 (가장 마지막에 위치)
      logger.warn("404 Not Found", {
        method: req.method,
        correlationId: req.correlationId,
        correlationId: req.correlationId,
        url: req.originalUrl,
        ip: req.ip,
        correlationId: req.correlationId
      });
    app.use("*", (req: express.Request, res: express.Response) => {
      logger.warn("404 Not Found", {
        method: req.method,
        correlationId: req.correlationId,
        url: req.originalUrl,
        ip: req.ip,
        correlationId: req.correlationId
      });
      res.status(404).json({
        message: "요청한 경로를 찾을 수 없습니다.",
        requestedPath: req.originalUrl,
        method: req.method,
        correlationId: req.correlationId,
        correlationId: req.correlationId,
        availableEndpoints: {
          documentation: "GET /api-docs",
          health: "/health/*",
          auth: "/auth/*",
          concert: "/concert/*",
          article: "/article/*",
          chat: "/chat/*",
        },
        timestamp: new Date().toISOString(),
      });
    });

    httpServer.listen(PORT, () => {
      logger.info("Server started successfully", {
        port: PORT,
        environment: process.env.NODE_ENV,
        endpoints: {
          server: `http://localhost:${PORT}`,
          documentation: `http://localhost:${PORT}/api-docs`,
          auth: `http://localhost:${PORT}/auth`,
          concert: `http://localhost:${PORT}/concert`,
          article: `http://localhost:${PORT}/article`,
          chat: `http://localhost:${PORT}/chat`,
          socket: `http://localhost:${PORT}/socket.io/`
        }
      });
    });
      
      logger.info(`📝 Article API: http://localhost:${PORT}/article`);
        correlationId: req.correlationId,
      logger.info(`💬 Chat API: http://localhost:${PORT}/chat`);
      logger.info(`🔌 Socket.IO: http://localhost:${PORT}/socket.io/`);
      logger.info(`💾 Database: MongoDB Native Driver`);
      logger.info(`🗄️  Session Store: Redis`);
      logger.info("🎉 ================================");
    });
  } catch (err) {
    logger.error("Server startup failed", { error: err });
      logger.info("Server started successfully", {
        port: PORT,
        environment: process.env.NODE_ENV,
        endpoints: {
          server: `http://localhost:${PORT}`,
          documentation: `http://localhost:${PORT}/api-docs`,
          auth: `http://localhost:${PORT}/auth`,
          concert: `http://localhost:${PORT}/concert`,
          article: `http://localhost:${PORT}/article`,
          chat: `http://localhost:${PORT}/chat`,
          socket: `http://localhost:${PORT}/socket.io/`
        }
      });
    logger.error("Server startup failed", { error: err });
  gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", { reason, promise });
  gracefulShutdown("unhandledRejection");
});

export { redisClient, chatSocketServer };