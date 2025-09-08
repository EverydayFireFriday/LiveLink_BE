import { createServer } from 'http';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { configurePassport } from './config/oauth/passport';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import sanitizeHtml from 'sanitize-html';
import hpp from 'hpp';

// 🔧 환경변수 로드 (맨 먼저!)
dotenv.config();

// ✅ 환경변수 검증 실행 (즉시 검증 및 프로세스 종료)
import {
  env,
  isDevelopment,
  isProduction,
  shouldSkipAuth,
} from './config/env/env';

import logger, { stream } from './utils/logger/logger';
import { swaggerSpec, swaggerUi, swaggerUiOptions } from './config/swagger';
import { ChatSocketServer } from './socket';
import { initializeChatModels } from './models/chat';

// 데이터베이스 연결 함수들
import {
  connectDatabase as connectUserDB,
  disconnectDatabase as disconnectUserDB,
} from './models/auth/user';
import {
  connectDB as connectConcertDB,
  initializeConcertModel,
} from './utils/database/db';
import { initializeAllArticleModels } from './models/article';

// 라우터 import
import authRouter from './routes/auth/index';
import concertRouter from './routes/concert/index';
import healthRouter from './routes/health/healthRoutes';
import { defaultLimiter } from './middlewares/security/rateLimitMiddleware';

// connect-redis v6.1.3 방식
import connectRedis from 'connect-redis';
const RedisStore = connectRedis(session);

const app = express();
const httpServer = createServer(app);
let chatSocketServer: ChatSocketServer | null = null;

// 🔧 프록시 신뢰 설정 (프로덕션 환경에서 로드밸런서/프록시 뒤에 있을 때)
if (isProduction()) {
  app.set('trust proxy', 1);
}

// 보안 헤더 설정
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          //'nonce-RANDOM_NONCE', // 필요 시 nonce 또는 hash 사용
          // 인라인 스크립트가 필요 없는 경우 위와 같이 설정
        ],
        styleSrc: ["'self'", "'unsafe-inline'"], // UI 라이브러리 호환성을 위해 임시 허용
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://appleid.apple.com',
          'https://accounts.google.com',
          'https://oauth2.googleapis.com',
        ],
        frameAncestors: ["'self'"], // 클릭재킹 방지
        objectSrc: ["'none'"], // 플러그인 로드 차단
        // Only upgrade in production; omit in dev to prevent local HTTP breakage
        ...(isProduction() ? { upgradeInsecureRequests: [] } : {}),
        reportUri: isProduction() ? ['/csp-report'] : [], // Add CSP reporting endpoint
      },
    },
    strictTransportSecurity: isProduction()
      ? {
          maxAge: 31536000, // 1년
          includeSubDomains: true,
          preload: true,
        }
      : false,
    // Prefer CSP's frame-ancestors. If you need XFO, keep it consistent with CSP:
    frameguard: { action: 'sameorigin' },
  }),
);

// 환경별 로그 포맷 설정
const logFormat = isDevelopment() ? 'dev' : 'combined';
app.use(morgan(logFormat, { stream }));

// CORS 설정 (환경별)
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Redis 클라이언트 생성
const redisClient = createClient({
  url: env.REDIS_URL,
  legacyMode: true,
});

// Redis 이벤트 핸들링
redisClient.on('connect', () => logger.info('✅ Redis connected'));
redisClient.on('error', (err: Error) => {
  if (
    err.message?.includes('Disconnects client') ||
    err.message?.includes('destroy') ||
    err.message?.includes('Connection is closed')
  ) {
    return;
  }
  logger.error(`❌ Redis Error: ${err.message}`);
});
redisClient.on('end', () => logger.info('ℹ️ Redis connection ended'));

// JSON 파싱 미들웨어
app.use(
  express.json({
    limit: '10mb',
    verify: (req: express.Request, res: express.Response, buf: Buffer) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        const error = new Error('잘못된 JSON 형식입니다.') as Error & {
          status?: number;
          type?: string;
        };
        error.status = 400;
        error.type = 'entity.parse.failed';
        throw error;
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 보안 미들웨어 적용
app.use(mongoSanitize());

// XSS 방어 미들웨어 (sanitize-html 사용)
const sanitizeInput = (input: unknown): unknown => {
  if (typeof input === 'string') {
    return sanitizeHtml(input, {
      allowedTags: [], // 모든 HTML 태그 제거
      allowedAttributes: {}, // 모든 HTML 속성 제거
    });
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item));
  }
  if (typeof input === 'object' && input !== null) {
    const sanitizedObject: { [key: string]: unknown } = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        sanitizedObject[key] = sanitizeInput(
          (input as Record<string, unknown>)[key],
        );
      }
    }
    return sanitizedObject;
  }
  return input;
};

app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  // req.query, req.params 등도 필요에 따라 sanitizeInput 적용 가능
  next();
});
app.use(hpp());

// 정적 파일 서빙
app.use(express.static('public'));

// 세션 미들웨어 설정
app.use(
  session({
    store: new RedisStore({
      client: redisClient,
      prefix: 'app:sess:',
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: isProduction() || env.COOKIE_SAMESITE === 'none', // SameSite=None requires Secure
      httpOnly: true,
      maxAge: parseInt(env.SESSION_MAX_AGE),
      sameSite: env.COOKIE_SAMESITE, // lax | strict | none, // SameSite 정책 (lax, strict, none)
      domain: env.COOKIE_DOMAIN || undefined, // 쿠키 도메인 (설정 시 해당 도메인으로 제한)
    },
    name: 'app.session.id',
  }),
);

// PASSPORT 초기화
app.use(passport.initialize());
app.use(passport.session());

// 데이터베이스 연결 상태 추적
let isUserDBConnected = false;
let isConcertDBConnected = false;
let isArticleDBConnected = false;
let isChatDBConnected = false;

// 🩺 헬스체크 엔드포인트들 (인증 없음 - K8s/로드밸런서용)
// Liveness Probe: 단순 생존 확인
app.get('/health/liveness', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Readiness Probe: 서비스 준비 상태 확인
app.get('/health/readiness', (req: express.Request, res: express.Response) => {
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
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: serviceStatus,
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      services: serviceStatus,
    });
  }
});

// 일반 헬스체크 (호환성)
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
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
    if (req.path.startsWith('/health')) {
      return next();
    }

    if (req.path.startsWith('/auth') && !isUserDBConnected) {
      return res.status(503).json({
        message: '사용자 데이터베이스 연결이 준비되지 않았습니다.',
      });
    }
    if (req.path.startsWith('/concert') && !isConcertDBConnected) {
      return res.status(503).json({
        message: '콘서트 데이터베이스 연결이 준비되지 않았습니다.',
      });
    }
    if (req.path.startsWith('/article') && !isArticleDBConnected) {
      return res.status(503).json({
        message: '게시글 데이터베이스 연결이 준비되지 않았습니다.',
      });
    }
    if (req.path.startsWith('/chat') && !isChatDBConnected) {
      return res.status(503).json({
        message: '채팅 데이터베이스 연결이 준비되지 않았습니다.',
      });
    }
    next();
  },
);

// Swagger 설정
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions),
);

// 기본 라우트
app.get('/', (req: express.Request, res: express.Response) => {
  res.json({
    message: 'Stagelives API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    endpoints: {
      documentation: '/api-docs',
      'health-liveness': '/health/liveness',
      'health-readiness': '/health/readiness',
      'health-general': '/health',
      'health-detailed': '/health/*',
      auth: '/auth',
      concerts: '/concert',
      articles: '/article',
      chat: '/chat',
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
app.use('/health', healthRouter);
// 기본 Rate Limiter 적용
app.use(defaultLimiter);
app.use('/auth', authRouter);
app.use('/concert', concertRouter);

// CSP Violation Report Endpoint
app.post(
  '/csp-report',
  express.json({ type: 'application/csp-report' }),
  (req, res) => {
    if (req.body) {
      logger.warn('CSP Violation:', req.body['csp-report']);
    } else {
      logger.warn('CSP Violation: No report data received.');
    }
    res.status(204).end(); // Respond with No Content
  },
);

// 데이터베이스 초기화 함수
const initializeDatabases = async (): Promise<void> => {
  try {
    logger.info('🔌 Connecting to User Database...');
    await connectUserDB();
    isUserDBConnected = true;
    logger.info('✅ User Database connected');

    logger.info('🔌 Connecting to Concert Database...');
    const concertDB = await connectConcertDB();
    initializeConcertModel(concertDB);
    isConcertDBConnected = true;
    logger.info('✅ Concert Database connected and models initialized');

    logger.info('🔌 Initializing Article Database...');
    initializeAllArticleModels(concertDB);
    isArticleDBConnected = true;
    logger.info('✅ Article Database initialized and models ready');

    logger.info('🔌 Initializing Chat Database...');
    initializeChatModels();
    isChatDBConnected = true;
    logger.info('✅ Chat Database initialized and models ready');
  } catch (error) {
    logger.error('❌ Database initialization failed:', { error });
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
          logger.info('✅ HTTP server closed');
          resolve();
        });
      });
    }

    // Socket.IO 종료
    if (chatSocketServer) {
      logger.info('🔌 Closing Socket.IO server...');
      // Socket.IO 서버 종료 로직이 있다면 여기에 추가
      chatSocketServer = null;
      logger.info('✅ Socket.IO server closed');
    }

    // Redis 연결 종료
    if (redisClient?.isOpen) {
      await redisClient.disconnect();
      logger.info('✅ Redis disconnected');
    }

    // MongoDB 연결 종료
    await disconnectUserDB();
    logger.info('✅ User MongoDB disconnected');

    logger.info('👋 Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Graceful shutdown failed', { error });
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

    // Passport 설정 (DB 연결 후)
    logger.info('🔌 Configuring Passport...');
    configurePassport(passport);
    logger.info('✅ Passport configured');

    // 동적 라우터 로드
    logger.info('🔌 Loading Article routes...');
    const { default: articleRouter } = await import('./routes/article/index');
    app.use('/article', articleRouter);
    logger.info('✅ Article routes loaded and connected');

    logger.info('🔌 Loading Chat routes...');
    const { default: chatRouter } = await import('./routes/chat/index');
    app.use('/chat', chatRouter);
    logger.info('✅ Chat routes loaded and connected');

    // Socket.IO 초기화
    logger.info('🔌 Initializing Socket.IO server...');
    chatSocketServer = new ChatSocketServer(httpServer);
    logger.info('✅ Socket.IO server initialized');

    // 에러 핸들링 미들웨어 (모든 라우터 뒤에 위치)
    app.use(
      (
        err: Error & { status?: number; type?: string },
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (res.headersSent) {
          return next(err);
        }

        logger.error('🔥 Request Error:', {
          error: err.message,
          stack: isDevelopment() ? err.stack : undefined,
          url: req.url,
          method: req.method,
          ip: req.ip,
        });

        if (
          err.type === 'entity.parse.failed' ||
          err.message?.includes('JSON')
        ) {
          return res.status(400).json({
            message: '잘못된 JSON 형식입니다.',
            error: isDevelopment() ? err.message : 'Invalid JSON format',
            timestamp: new Date().toISOString(),
          });
        }

        res.status(err.status || 500).json({
          message: err.message || '서버 내부 에러',
          error: isDevelopment()
            ? { stack: err.stack, details: err.message }
            : '알 수 없는 에러',
          timestamp: new Date().toISOString(),
        });
      },
    );

    // 404 핸들러 (가장 마지막에 위치)
    app.use('*', (req: express.Request, res: express.Response) => {
      logger.warn(
        `404 Not Found: ${req.method} ${req.originalUrl} from ${req.ip}`,
      );
      res.status(404).json({
        message: '요청한 경로를 찾을 수 없습니다.',
        requestedPath: req.originalUrl,
        method: req.method,
        availableEndpoints: {
          documentation: 'GET /api-docs',
          'health-liveness': 'GET /health/liveness',
          'health-readiness': 'GET /health/readiness',
          health: '/health/*',
          auth: '/auth/*',
          concert: '/concert/*',
          article: '/article/*',
          chat: '/chat/*',
        },
        timestamp: new Date().toISOString(),
      });
    });

    // HTTP 서버 시작
    const PORT = parseInt(env.PORT);
    httpServer.listen(PORT, () => {
      logger.info('🎉 ================================');
      logger.info(
        `🚀 Stagelives API Server running at http://localhost:${PORT}`,
      );
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(
        `🩺 Health Check (Liveness): http://localhost:${PORT}/health/liveness`,
      );
      logger.info(
        `🩺 Health Check (Readiness): http://localhost:${PORT}/health/readiness`,
      );
      logger.info(`🔐 Auth API: http://localhost:${PORT}/auth`);
      logger.info(`🎵 Concert API: http://localhost:${PORT}/concert`);
      logger.info(`📝 Article API: http://localhost:${PORT}/article`);
      logger.info(`💬 Chat API: http://localhost:${PORT}/chat`);
      logger.info(`🔌 Socket.IO: http://localhost:${PORT}/socket.io/`);
      logger.info(`💾 Database: MongoDB Native Driver`);
      logger.info(`🗄️  Session Store: Redis`);
      logger.info(
        `🔒 Security: ${isProduction() ? 'Production Mode' : 'Development Mode'}`,
      );
      logger.info('🎉 ================================');
    });
  } catch (err) {
    logger.error('❌ Startup failed', { error: err });
    process.exit(1);
  }
};

// 🚨 전역 오류 처리 (MUST)
process.on('unhandledRejection', (reason) => {
  logger.error('💥 UnhandledRejection:', { reason });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('💥 UncaughtException:', { err });
  process.exit(1);
});

// 🛑 그레이스풀 셧다운 (MUST)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 🚀 서버 시작
startServer().catch((error) => {
  logger.error('❌ Failed to start server:', { error });
  process.exit(1);
});

export { redisClient, chatSocketServer };
