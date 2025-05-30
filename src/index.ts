import express from "express";
import session from "express-session";
import { createClient } from "redis";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// 데이터베이스 연결 함수들
import {
  connectDatabase as connectUserDB,
  disconnectDatabase as disconnectUserDB,
} from "./models/user";
import {
  connectDB as connectConcertDB,
  initializeConcertModel,
} from "./utils/db";

// 라우터 import
import authRouter from "./routes/authRoute";
import concertRouter from "./routes/concertRoute";

// connect-redis v6.1.3 방식
const RedisStore = require("connect-redis")(session);

dotenv.config();

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
  // 종료 과정에서 발생하는 에러는 무시
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

// Redis 연결
redisClient.connect().catch(console.error);

// 미들웨어 설정
app.use(
  express.json({
    limit: "10mb",
    verify: (req: express.Request, res: express.Response, buf: Buffer) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        res.status(400).json({ message: "잘못된 JSON 형식입니다." });
        throw new Error("Invalid JSON");
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
      maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400000"), // 1일
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
    name: "app.session.id",
  })
);

// 데이터베이스 연결 상태 확인
let isUserDBConnected = false;
let isConcertDBConnected = false;

// 데이터베이스 연결 상태 확인 미들웨어
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Auth 관련 요청은 User DB 필요
    if (req.path.startsWith("/auth") && !isUserDBConnected) {
      res.status(503).json({
        message: "사용자 데이터베이스 연결이 준비되지 않았습니다.",
      });
      return;
    }

    // Concert 관련 요청은 Concert DB 필요
    if (req.path.startsWith("/api/concert") && !isConcertDBConnected) {
      res.status(503).json({
        message: "콘서트 데이터베이스 연결이 준비되지 않았습니다.",
      });
      return;
    }

    next();
  }
);

// Swagger 설정
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Unified API Server",
      version: "1.0.0",
      description:
        "Authentication & Concert Management API with Redis Session & MongoDB Native Driver",
      contact: {
        name: "API Support",
        email: "support@api.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
      ...(process.env.PRODUCTION_URL
        ? [
            {
              url: process.env.PRODUCTION_URL,
              description: "Production server",
            },
          ]
        : []),
    ],
    tags: [
      {
        name: "Auth",
        description: "사용자 인증 관리 (MongoDB Native Driver + Redis Session)",
      },
      {
        name: "Concerts",
        description: "콘서트 관리 API",
      },
    ],
    components: {
      schemas: {
        // User 스키마 (Auth API용)
        User: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: {
              type: "string",
              description: "사용자명 (3-30자, 영문/숫자/_만 허용)",
              example: "john_doe",
              minLength: 3,
              maxLength: 30,
              pattern: "^[a-zA-Z0-9_]+$",
            },
            password: {
              type: "string",
              description: "비밀번호 (최소 8자)",
              example: "password123",
              minLength: 8,
            },
            profileImage: {
              type: "string",
              description: "프로필 이미지 URL (선택사항)",
              example: "https://example.com/profile.jpg",
            },
          },
        },
        UserResponse: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "사용자 ID",
            },
            username: {
              type: "string",
              description: "사용자명",
            },
            profileImage: {
              type: "string",
              description: "프로필 이미지 URL",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "계정 생성일",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "마지막 수정일",
            },
          },
        },
        // Concert 스키마 (Concert API용)
        Concert: {
          type: "object",
          required: ["uid", "title", "artist", "location", "datetime"],
          properties: {
            uid: {
              type: "string",
              description: "사용자 지정 ID (timestamp 포함)",
              example: "concert_1703123456789_abc123",
            },
            title: {
              type: "string",
              description: "콘서트 제목",
              example: "아이유 콘서트 2024",
            },
            artist: {
              type: "array",
              items: {
                type: "string",
              },
              description: "아티스트명 배열",
              example: ["아이유", "특별 게스트"],
            },
            location: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  venue: {
                    type: "string",
                    description: "공연장명",
                  },
                  address: {
                    type: "string",
                    description: "공연장 주소",
                  },
                  city: {
                    type: "string",
                    description: "도시",
                  },
                },
              },
              description: "공연 장소 정보 배열",
            },
            datetime: {
              type: "array",
              items: {
                type: "string",
                format: "date-time",
              },
              description: "공연 날짜 및 시간 배열",
            },
            status: {
              type: "string",
              enum: ["upcoming", "ongoing", "completed", "cancelled"],
              description: "콘서트 상태",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "에러 메시지",
            },
            error: {
              type: "string",
              description: "상세 에러 정보",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "에러 발생 시각",
            },
          },
        },
      },
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "app.session.id",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI 설정
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info h1 { color: #3b82f6 }
      .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
    `,
    customSiteTitle: "LiveLink",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  })
);

// 기본 라우트 (API 정보)
app.get("/", (req: express.Request, res: express.Response) => {
  res.json({
    message: "LiveLink",
    version: "1.0.0",
    description:
      "Authentication & Concert Management API with MongoDB Native Driver and Redis Session",
    endpoints: {
      documentation: "/api-docs",
      auth: "/auth",
      concerts: "/api/concert",
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

// 라우터 연결
app.use("/auth", authRouter);
app.use("/concert", concertRouter);

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
app.use("*", (req: express.Request, res: express.Response) => {
  res.status(404).json({
    message: "요청한 경로를 찾을 수 없습니다.",
    requestedPath: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      documentation: "GET /api-docs",
      auth: "/auth/*",
      concert: "/api/concert/*",
    },
    timestamp: new Date().toISOString(),
  });
});

// 우아한 종료 처리
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  try {
    // Redis 연결 해제
    try {
      if (redisClient?.isOpen) {
        await redisClient.disconnect();
      }
      console.log("✅ Redis disconnected");
    } catch (redisError) {
      console.log("✅ Redis disconnected");
    }

    // User MongoDB 연결 해제
    try {
      await disconnectUserDB();
      console.log("✅ User MongoDB disconnected");
    } catch (mongoError) {
      console.log("✅ User MongoDB disconnected");
    }

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
    // User DB 연결
    console.log("🔌 Connecting to User Database...");
    await connectUserDB();
    isUserDBConnected = true;
    console.log("✅ User Database connected");

    // Concert DB 연결 및 모델 초기화
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

// DB와 Redis 연결 후 서버 시작
Promise.all([initializeDatabases(), redisClient.ping()])
  .then(() => {
    app.listen(PORT, () => {
      console.log("🎉 ================================");
      console.log(`🚀 Unified API Server running at http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/auth`);
      console.log(`🎵 Concert API: http://localhost:${PORT}/api/concert`);
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
