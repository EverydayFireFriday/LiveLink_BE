import { createServer } from "http";
import express from "express";
import session from "express-session";
import { createClient } from "redis";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

// 🔧 환경변수 로드 (맨 먼저!)
dotenv.config();

// ✅ 환경변수 검증 실행 (즉시 검증 및 프로세스 종료)
import { env, isDevelopment, isProduction, shouldSkipAuth } from "./config/env";

import logger, { stream } from "./utils/logger";
import { swaggerSpec, swaggerUi, swaggerUiOptions } from "./config/swagger";
import { ChatSocketServer } from "./socket";
import { initializeChatModels } from "./models/chat";

// 데이터베이스 연결 함수들
import {
  connectDatabase as connectUserDB,
  disconnectDatabase as disconnectUserDB,
} from "./models/auth/user";
import {
  connectDB as connectConcertDB,
  initializeConcertModel,
} from "./utils/db";
import { initializeAllArticleModels } from "./models/article";

// 라우터 import
import authRouter from "./routes/auth/index";
import concertRouter from "./routes/concert/index";
import healthRouter from "./routes/health/healthRoutes";

// connect-redis v6.1.3 방식
const RedisStore = require("connect-redis")(session);

const app = express();
const httpServer = createServer(app);
let chatSocketServer: ChatSocketServer | null = null;

// 🔧 프록시 신뢰 설정 (프로덕션 환경에서 로드밸런서/프록시 뒤에 있을 때)
if (isProduction()) {
  app.set("trust proxy", 1);
}

// 보안 헤더 설정
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// 요청 제한 설정
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
    retryAfter: 15 * 60,
  },
});
app.use(limiter);

// 환경별 로그 포맷 설정
const logFormat = isDevelopment() ? "dev" : "combined";
app.use(morgan(logFormat, { stream }));

// CORS 설정 (환경별)
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Redis 클라이언트 생성
const redisClient = createClient({
  url: env.REDIS_URL,
  legacyMode: true,
});

// Redis 이벤트 핸들링
redisClient.on("connect", () => logger.info("✅ Redis connected"));
redisClient.on("error", (err: Error) => {
  if (
    err.message?.includes("Disconnects client") ||
    err.message?.includes("destroy") ||
    err.message?.includes("Connection is closed")
  ) {
    return;
  }
  logger.error(`❌ Redis Error: ${err.message}`);
});
redisClient.on("end", () => logger.info("ℹ️ Redis connection ended"));

// JSON 파싱 미들웨어
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

// 정적 파일 서빙
app.use(express.static('public'));

// 세션 미들웨어 설정
app.use(
  session({
    store: new RedisStore({
      client: redisClient,
      prefix: "app:sess:",
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: isProduction(), // HTTPS에서만 쿠키 전송
      httpOnly: true,
      maxAge: parseInt(env.SESSION_MAX_AGE),
      sameSite: isProduction() ? "none" : "lax",
    },
    name: "app.session.id",
  })
);

// 데이터베이스 연결 상태 추적
let isUserDBConnected = false;
let isConcertDBConnected = false;
let isArticleDBConnected = false;
let isChatDBConnected = false;

// 🩺 헬스체크 엔드포인트들 (인증 없음 - K8s/로드밸런서용)
// Liveness Probe: 단순 생존 확인
app.get("/health/liveness", (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Readiness Probe: 서비스 준비 상태 확인
app.get("/health/readiness", (req: express.Request, res: express.Response) => {
  const allServicesReady =
    isUserDBConnected &&
    isConcertDBConnected &&
    isArticleDBConnected &&
    isChatDBConnected &&
    (redisClient?.isOpen || false);

  const serviceStatus = {
    userDB: isUserDBConnected,
    concertDB: isConcertDBConnected,
    articleDB: isArticleDBConnected,
    chatDB: isChatDBConnected,
    redis: redisClient?.isOpen || false,
  };

  if (allServicesReady) {
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
      services: serviceStatus,
    });
  } else {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      services: serviceStatus,
    });
  }
});

// 일반 헬스체크 (호환성)
app.get("/health", (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || "1.0.0",
    environment: env.NODE_ENV,
    services: {
      userDB: isUserDBConnected,
      concertDB: isConcertDBConnected,
      articleDB: isArticleDBConnected,
      chatDB: isChatDBConnected,
      redis: redisClient?.isOpen || false,
    },
  });
});

// 데이터베이스 연결 상태 확인 미들웨어
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 헬스체크는 항상 통과
    if (req.path.startsWith("/health")) {
      return next();
    }

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
      return res.status(503).json({
        message: "게시글 데이터베이스 연결이 준비되지 않았습니다.",
      });
    }
    if (req.path.startsWith("/chat") && !isChatDBConnected) {
      return res.status(503).json({
        message: "채팅 데이터베이스 연결이 준비되지 않았습니다.",
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
    environment: env.NODE_ENV,
    endpoints: {
      documentation: "/api-docs",
      "health-liveness": "/health/liveness",
      "health-readiness": "/health/readiness",
      "health-general": "/health",
      "health-detailed": "/health/*",
      auth: "/auth",
      concerts: "/concert",
      articles: "/article",
      chat: "/chat",
    },
    features: {
      authenticationSkip: shouldSkipAuth(),
      adminEmails: env.ADMIN_EMAILS.length,
      secureMode: isProduction(),
    },
    timestamp: new Date().toISOString(),
  });
});

// 정적 라우터 연결
app.use("/auth", authRouter);
app.use("/concert", concertRouter);
app.use("/health", healthRouter); // 상세한 헬스체크용

// 데이터베이스 초기화 함수
const initializeDatabases = async (): Promise<void> => {
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
  } catch (error) {
    logger.error("❌ Database initialization failed:", { error });
    throw error;
  }
};

// 우아한 종료 처리
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  try {
    // HTTP 서버 종료
    if (httpServer.listening) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => {
          logger.info("✅ HTTP server closed");
          resolve();
        });
      });
    }

    // Socket.IO 종료
    if (chatSocketServer) {
      logger.info("🔌 Closing Socket.IO server...");
      // Socket.IO 서버 종료 로직이 있다면 여기에 추가
      chatSocketServer = null;
      logger.info("✅ Socket.IO server closed");
    }

    // Redis 연결 종료
    if (redisClient?.isOpen) {
      await redisClient.disconnect();
      logger.info("✅ Redis disconnected");
    }

    // MongoDB 연결 종료
    await disconnectUserDB();
    logger.info("✅ User MongoDB disconnected");

    logger.info("👋 Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Graceful shutdown failed", { error });
    process.exit(1);
  }
};

// 서버 시작 함수
const startServer = async (): Promise<void> => {
  try {
    // Redis 연결 확인
    await redisClient.connect();
    await redisClient.ping();

    // 데이터베이스 초기화
    await initializeDatabases();

    // 동적 라우터 로드
    logger.info("🔌 Loading Article routes...");
    const { default: articleRouter } = await import("./routes/article/index");
    app.use("/article", articleRouter);
    logger.info("✅ Article routes loaded and connected");

    logger.info("🔌 Loading Chat routes...");
    const { default: chatRouter } = await import("./routes/chat/index");
    app.use("/chat", chatRouter);
    logger.info("✅ Chat routes loaded and connected");

    // Socket.IO 초기화
    logger.info("🔌 Initializing Socket.IO server...");
    chatSocketServer = new ChatSocketServer(httpServer);
    logger.info("✅ Socket.IO server initialized");

    // 에러 핸들링 미들웨어 (모든 라우터 뒤에 위치)
    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        if (res.headersSent) {
          return next(err);
        }

        logger.error("🔥 Request Error:", {
          error: err.message,
          stack: isDevelopment() ? err.stack : undefined,
          url: req.url,
          method: req.method,
          ip: req.ip,
        });

        if (
          err.type === "entity.parse.failed" ||
          err.message?.includes("JSON")
        ) {
          return res.status(400).json({
            message: "잘못된 JSON 형식입니다.",
            error: isDevelopment() ? err.message : "Invalid JSON format",
            timestamp: new Date().toISOString(),
          });
        }

        res.status(err.status || 500).json({
          message: err.message || "서버 내부 에러",
          error: isDevelopment()
            ? { stack: err.stack, details: err.message }
            : "알 수 없는 에러",
          timestamp: new Date().toISOString(),
        });
      }
    );

    // 404 핸들러 (가장 마지막에 위치)
    app.use("*", (req: express.Request, res: express.Response) => {
      logger.warn(
        `404 Not Found: ${req.method} ${req.originalUrl} from ${req.ip}`
      );
      res.status(404).json({
        message: "요청한 경로를 찾을 수 없습니다.",
        requestedPath: req.originalUrl,
        method: req.method,
        availableEndpoints: {
          documentation: "GET /api-docs",
          "health-liveness": "GET /health/liveness",
          "health-readiness": "GET /health/readiness",
          health: "/health/*",
          auth: "/auth/*",
          concert: "/concert/*",
          article: "/article/*",
          chat: "/chat/*",
        },
        timestamp: new Date().toISOString(),
      });
    });

    // HTTP 서버 시작
    const PORT = parseInt(env.PORT);
    httpServer.listen(PORT, () => {
      logger.info("🎉 ================================");
      logger.info(`🚀 LiveLink API Server running at http://localhost:${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(
        `🩺 Health Check (Liveness): http://localhost:${PORT}/health/liveness`
      );
      logger.info(
        `🩺 Health Check (Readiness): http://localhost:${PORT}/health/readiness`
      );
      logger.info(`🔐 Auth API: http://localhost:${PORT}/auth`);
      logger.info(`🎵 Concert API: http://localhost:${PORT}/concert`);
      logger.info(`📝 Article API: http://localhost:${PORT}/article`);
      logger.info(`💬 Chat API: http://localhost:${PORT}/chat`);
      logger.info(`🔌 Socket.IO: http://localhost:${PORT}/socket.io/`);
      logger.info(`💾 Database: MongoDB Native Driver`);
      logger.info(`🗄️  Session Store: Redis`);
      logger.info(
        `🔒 Security: ${isProduction() ? "Production Mode" : "Development Mode"}`
      );
      logger.info("🎉 ================================");
    });
  } catch (err) {
    logger.error("❌ Startup failed", { error: err });
    process.exit(1);
  }
};

// 🚨 전역 오류 처리 (MUST)
process.on("unhandledRejection", (reason) => {
  logger.error("💥 UnhandledRejection:", { reason });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("💥 UncaughtException:", { err });
  process.exit(1);
});

// 🛑 그레이스풀 셧다운 (MUST)
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// 🚀 서버 시작
startServer().catch((error) => {
  logger.error("❌ Failed to start server:", { error });
  process.exit(1);
});

export { redisClient, chatSocketServer };
