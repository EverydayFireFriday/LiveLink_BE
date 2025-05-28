import express from "express";
import session from "express-session";
import { createClient } from "redis";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// MongoDB 네이티브 드라이버 연결 함수 import
import { connectDatabase, disconnectDatabase } from "./models/user";

// 라우터 import
import authRouter from "./routes/auth";

// connect-redis v6.1.3 방식
const RedisStore = require("connect-redis")(session);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Redis 클라이언트 생성 (legacyMode 추가)
const redisClient = createClient({
  url: process.env.REDIS_URL,
  legacyMode: true, // ← 중요!
});

// Redis 이벤트 핸들링 (에러 필터링)
redisClient.on("connect", () => console.log("✅ Redis connected"));
redisClient.on("error", (err) => {
  // 종료 과정에서 발생하는 에러는 무시
  if (err.message?.includes('Disconnects client') || 
      err.message?.includes('destroy')) {
    return; // 에러 출력 안함
  }
  console.error("❌ Redis Error", err);
});
redisClient.on("end", () => console.log("ℹ️ Redis connection ended"));

// Redis 연결
redisClient.connect().catch(console.error);

// 미들웨어 설정
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 세션 미들웨어 설정
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1일
    },
  })
);

// Swagger 설정
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth API",
      version: "1.0.0",
      description: "사용자 인증 API with Redis Session & MongoDB Native Driver",
      contact: {
        name: "API Support",
        email: "support@authapi.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "사용자 인증 관리 (MongoDB Native Driver + Redis Session)",
      },
    ],
    components: {
      schemas: {
        User: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: {
              type: "string",
              description: "Username",
              example: "john_doe",
            },
            password: {
              type: "string",
              description: "Password (minimum 6 characters)",
              example: "password123",
            },
            profileImage: {
              type: "string",
              description: "Profile image URL (optional)",
              example: "https://example.com/profile.jpg",
            },
          },
        },
        UserResponse: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "User ID",
            },
            username: {
              type: "string",
              description: "Username",
            },
            profileImage: {
              type: "string",
              description: "Profile image URL",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time", 
              description: "Last update date",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
            },
            error: {
              type: "string",
              description: "Detailed error information",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"], // Swagger 주석이 있는 파일들
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI 설정
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Auth API Documentation",
    customfavIcon: "/favicon.ico",
  })
);

// 기본 라우트
app.get("/", (req, res) => {
  res.json({
    message: "Auth API Server",
    version: "1.0.0",
    description: "User Authentication API with MongoDB Native Driver and Redis Session",
    endpoints: {
      documentation: "/api-docs",
      auth: "/auth",
    },
    features: [
      "User Authentication (MongoDB Native Driver + Redis Session)",
      "Profile Image Support",
      "Session Management",
      "Swagger API Documentation",
    ],
    swagger: `http://localhost:${PORT}/api-docs`,
    timestamp: new Date().toISOString(),
  });
});

// 헬스체크 라우트 (MongoDB 네이티브 드라이버용으로 수정)
app.get("/health", async (req, res) => {
  try {
    // MongoDB 연결 상태 확인 (네이티브 드라이버)
    let mongoStatus = "disconnected";
    try {
      const { getDatabase } = await import("./models/user");
      const db = getDatabase();
      await db.admin().ping();
      mongoStatus = "connected";
    } catch (mongoError) {
      mongoStatus = "disconnected";
    }

    // Redis 연결 상태 확인
    const redisStatus = redisClient.isOpen ? "connected" : "disconnected";

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStatus,
        redis: redisStatus,
      },
      driver: "MongoDB Native Driver",
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 라우터 연결
app.use("/auth", authRouter);

// 에러 핸들링 미들웨어
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("🔥 Error:", err);

    // 개발 환경에서는 상세 에러, 프로덕션에서는 간단한 메시지
    const isDevelopment = process.env.NODE_ENV === "development";

    res.status(err.status || 500).json({
      message: err.message || "서버 내부 에러",
      error: isDevelopment
        ? {
            stack: err.stack,
            details: err.message,
          }
        : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
);

// 404 핸들러
app.use("*", (req, res) => {
  res.status(404).json({
    message: "요청한 경로를 찾을 수 없습니다.",
    requestedPath: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      documentation: "GET /api-docs",
      health: "GET /health",
      auth: "/auth/*",
    },
    timestamp: new Date().toISOString(),
  });
});

// 우아한 종료 처리 (에러 숨기기)
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  try {
    // Redis 연결 해제 (에러 무시)
    try {
      if (redisClient?.isOpen) {
        await redisClient.disconnect();
      }
      console.log("✅ Redis disconnected");
    } catch (redisError) {
      // Redis 종료 에러는 무시
      console.log("✅ Redis disconnected");
    }

    // MongoDB 연결 해제 (네이티브 드라이버)
    try {
      await disconnectDatabase();
    } catch (mongoError) {
      console.log("✅ MongoDB disconnected");
    }

    console.log("👋 Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.log("👋 Graceful shutdown completed");
    process.exit(0);
  }
};

// DB와 Redis 연결 후 서버 시작
Promise.all([
  connectDatabase(), // mongoose.connect 대신 네이티브 드라이버 연결
  redisClient.ping()
])
  .then(() => {
    app.listen(PORT, () => {
      console.log("🎉 ================================");
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/auth`);
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

// 처리되지 않은 예외 처리
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Redis 클라이언트를 다른 모듈에서 사용할 수 있도록 export
export { redisClient };