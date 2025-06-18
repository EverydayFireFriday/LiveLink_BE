import express from "express";
import session from "express-session";
import { createClient } from "redis";
import dotenv from "dotenv";
import cors from "cors";

// ✅ Swagger import (새로 추가)
import { swaggerSpec, swaggerUi, swaggerUiOptions } from "./swagger";

// 🔧 환경변수 로드 (맨 먼저!)
dotenv.config();

// 🔍 관리자 설정 디버깅
console.log("\n🔧 환경변수 검증 중...");
console.log("📧 EMAIL_USER:", process.env.EMAIL_USER ? "✅ 설정됨" : "❌ 누락");
console.log("🔄 REDIS_URL:", process.env.REDIS_URL ? "✅ 설정됨" : "❌ 누락");
console.log("👑 ADMIN_EMAILS 원본:", process.env.ADMIN_EMAILS);
console.log(
  "👑 ADMIN_EMAILS 존재:",
  !!process.env.ADMIN_EMAILS ? "✅ 설정됨" : "❌ 누락"
);

if (process.env.ADMIN_EMAILS) {
  const adminEmails = process.env.ADMIN_EMAILS.split(",").map((email) =>
    email.trim()
  );
  console.log("👑 관리자 계정 개수:", adminEmails.length);
} else {
  console.warn("⚠️  ADMIN_EMAILS가 설정되지 않았습니다!");
}
console.log("");

// 데이터베이스 연결 함수들
import {
  connectDatabase as connectUserDB,
  disconnectDatabase as disconnectUserDB,
} from "./models/user";
import {
  connectDB as connectConcertDB,
  initializeConcertModel,
} from "./utils/db";

// 🔧 라우터 import 수정 - Health Check 추가
import authRouter from "./routes/auth/index"; // ✅ Auth 통합 라우터
import concertRouter from "./routes/concert/index"; // ✅ Concert 통합 라우터 (수정됨)
import healthRouter from "./routes/health/healthRoutes"; // ✅ Health Check 라우터

// connect-redis v6.1.3 방식
const RedisStore = require("connect-redis")(session);

const app = express();
const PORT = process.env.PORT || 3000;

// 기본 보안 헤더 설정 (helmet 대신)
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  }
);

// 기본 로깅 (morgan 대신)
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.url} - ${req.ip}`);
    next();
  }
);

// 기본 Rate limiting (express-rate-limit 대신)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15분
const RATE_LIMIT_MAX = 100; // 최대 100 요청

app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientId = req.ip || "unknown";
    const now = Date.now();

    const clientData = rateLimitMap.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      rateLimitMap.set(clientId, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW,
      });
      next();
    } else if (clientData.count < RATE_LIMIT_MAX) {
      clientData.count++;
      next();
    } else {
      res.status(429).json({
        error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
      return;
    }
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

// Redis 이벤트 핸들링 (에러 필터링)
redisClient.on("connect", () => console.log("✅ Redis connected"));
redisClient.on("error", (err) => {
  if (
    err.message?.includes("Disconnects client") ||
    err.message?.includes("destroy") ||
    err.message?.includes("Connection is closed")
  ) {
    return;
  }
  console.error("❌ Redis Error:", err.message);
});
redisClient.on("end", () => console.log("ℹ️ Redis connection ended"));

redisClient.connect().catch(console.error);

// 미들웨어 설정
app.use(
  express.json({
    limit: "10mb",
    verify: (req: express.Request, res: express.Response, buf: Buffer) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        // ❌ 기존: res.status().json() 호출 후 throw Error (중복 응답)
        // ✅ 수정: throw만 하고 에러 핸들러에게 위임
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

// 데이터베이스 연결 상태 확인 미들웨어 (수정됨)
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/auth") && !isUserDBConnected) {
      res.status(503).json({
        message: "사용자 데이터베이스 연결이 준비되지 않았습니다.",
      });
      return;
    }

    // ✅ API prefix와 일치
    if (req.path.startsWith("/api/concert") && !isConcertDBConnected) {
      res.status(503).json({
        message: "콘서트 데이터베이스 연결이 준비되지 않았습니다.",
      });
      return;
    }

    next();
  }
);

// ✅ 새로운 깔끔한 Swagger 설정
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);

// 기본 라우트 (API 정보) - 수정됨
app.get("/", (req: express.Request, res: express.Response) => {
  res.json({
    message: "LiveLink",
    version: "1.0.0",
    description:
      "Authentication & Concert Management API with MongoDB Native Driver and Redis Session",
    endpoints: {
      documentation: "/api-docs",
      health: "/health", // ✅ Health Check 추가
      auth: "/auth",
      concerts: "/api/concert", // ✅ API prefix 추가
    },
    features: [
      "User Authentication (MongoDB Native Driver + Redis Session)",
      "Concert Management System",
      "Profile Image Support",
      "Session Management with Redis",
      "Rate Limiting",
      "Security Headers",
      "Swagger API Documentation",
    ],
    documentation: `http://localhost:${PORT}/api-docs`,
    timestamp: new Date().toISOString(),
  });
});

// 🔧 라우터 연결 - Health Check 추가
app.use("/health", healthRouter); // ✅ Health Check 라우터
app.use("/auth", authRouter); // ✅ Auth 라우터
app.use("/api/concert", concertRouter); // ✅ Concert API 라우터 (/api prefix 추가)

// 에러 핸들링 미들웨어
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // 응답이 이미 전송되었는지 확인
    if (res.headersSent) {
      return next(err);
    }

    console.error("🔥 Error:", err);
    const isDevelopment = process.env.NODE_ENV === "development";

    // JSON 파싱 에러 특별 처리
    if (err.type === "entity.parse.failed" || err.message?.includes("JSON")) {
      return res.status(400).json({
        message: "잘못된 JSON 형식입니다.",
        error: isDevelopment ? err.message : "Invalid JSON format",
        timestamp: new Date().toISOString(),
      });
    }

    // 일반 에러 처리
    res.status(err.status || 500).json({
      message: err.message || "서버 내부 에러",
      error: isDevelopment
        ? { stack: err.stack, details: err.message }
        : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
);

// 404 핸들러 - 수정됨
app.use("*", (req: express.Request, res: express.Response) => {
  res.status(404).json({
    message: "요청한 경로를 찾을 수 없습니다.",
    requestedPath: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      documentation: "GET /api-docs",
      health: "/health/*", // ✅ Health Check 추가
      auth: "/auth/*",
      concert: "/api/concert/*", // ✅ API prefix 추가
    },
    timestamp: new Date().toISOString(),
  });
});

// 우아한 종료 처리
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  try {
    if (redisClient?.isOpen) {
      await redisClient.disconnect();
    }
    console.log("✅ Redis disconnected");

    await disconnectUserDB();
    console.log("✅ User MongoDB disconnected");

    console.log("👋 Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.log("👋 Graceful shutdown completed");
    process.exit(0);
  }
};

// 데이터베이스 초기화 함수
const initializeDatabases = async () => {
  try {
    console.log("🔌 Connecting to User Database...");
    await connectUserDB();
    isUserDBConnected = true;
    console.log("✅ User Database connected");

    console.log("🔌 Connecting to Concert Database...");
    const concertDB = await connectConcertDB();
    initializeConcertModel(concertDB);
    isConcertDBConnected = true;
    console.log("✅ Concert Database connected and models initialized");

    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

// DB와 Redis 연결 후 서버 시작 - 로그 메시지 수정됨
Promise.all([initializeDatabases(), redisClient.ping()])
  .then(() => {
    app.listen(PORT, () => {
      console.log("🎉 ================================");
      console.log(`🚀 Unified API Server running at http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/auth`);
      console.log(`🎵 Concert API: http://localhost:${PORT}/api/concert`); // ✅ API prefix 추가
      console.log(`💾 Database: MongoDB Native Driver`);
      console.log(`🗄️  Session Store: Redis`);
      console.log("🎉 ================================");
    });
  })
  .catch((err) => {
    console.error("❌ Startup failed", err);
    process.exit(1);
  });

// 종료 시그널 처리
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

export { redisClient };
