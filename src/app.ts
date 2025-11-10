import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { configurePassport } from './config/oauth/passport';
import dotenv from 'dotenv';
import morgan from 'morgan';
import * as http from 'http';
import * as path from 'path';

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

// 분리된 모듈들
import {
  register,
  httpRequestCounter,
  httpRequestDurationMicroseconds,
  activeConnectionsGauge,
  httpErrorCounter,
  redisConnectionGauge,
} from './config/metrics/prometheus';
import { applySecurityMiddlewares } from './config/middleware/security';
import {
  initializeDatabases,
  databaseState,
} from './config/database/initializer';
import {
  shutdownState,
  setupShutdownHandlers,
  setupGlobalErrorHandlers,
} from './services/shutdown/gracefulShutdown';
import { setupRoutes } from './config/routes';
import { setupApolloServer } from './report/apolloServer';

// Redis 클라이언트 import
import {
  redisClient,
  connectRedis as connectRedisClient,
} from './config/redis/redisClient';
import { connectSocketRedis } from './config/redis/socketRedisClient';

// connect-redis v7.1.1 방식
import RedisStore from 'connect-redis';
import { Store } from 'express-session';

// 유지보수 모드 미들웨어
import { maintenanceMiddleware } from './middlewares/maintenance/maintenanceMiddleware';

const app = express();
const httpServer = http.createServer(app);
let chatSocketServer: ChatSocketServer | null = null;

// Prometheus 메트릭 및 요청 추적 미들웨어
app.use((req, res, next) => {
  // Graceful shutdown: 새로운 요청 거부
  if (shutdownState.isShuttingDown) {
    res.set('Connection', 'close');
    return res.status(503).json({
      error: 'Server is shutting down',
      message: '서버가 종료 중입니다. 잠시 후 다시 시도해주세요.',
    });
  }

  // 진행 중인 요청 추적
  shutdownState.activeRequests++;
  activeConnectionsGauge.inc();

  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    const route: string = (req.route?.path as string) || req.path;
    const status = res.statusCode;
    httpRequestCounter.inc({
      method: req.method,
      route,
      status,
    });
    end({ method: req.method, route, status });

    // Track errors
    if (status >= 400) {
      httpErrorCounter.inc({
        method: req.method,
        route,
        status,
      });
    }

    activeConnectionsGauge.dec();
    shutdownState.activeRequests--;
  });

  res.on('close', () => {
    activeConnectionsGauge.dec();
    shutdownState.activeRequests--;
  });

  next();
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  void (async () => {
    try {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Metrics endpoint error:', error);
      res.status(500).send('Internal Server Error');
    }
  })();
});

// 환경별 로그 포맷 설정
const logFormat = isDevelopment() ? 'dev' : 'combined';
app.use(morgan(logFormat, { stream }));

// 보안 미들웨어 적용
applySecurityMiddlewares(app);

// Redis 이벤트 핸들링 (Prometheus 메트릭 추가)
redisClient.on('connect', () => {
  redisConnectionGauge.set(1);
});
redisClient.on('error', () => {
  redisConnectionGauge.set(0);
});
redisClient.on('end', () => {
  redisConnectionGauge.set(0);
});

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../public')));

// Apple App Site Association 파일 제공 (Universal Links용)
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(
    path.join(__dirname, '../public/.well-known/apple-app-site-association'),
  );
});

// 유지보수 모드 미들웨어
app.use(maintenanceMiddleware);

// 🩺 헬스체크 엔드포인트들
app.get('/health/liveness', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/health/readiness', (req: express.Request, res: express.Response) => {
  const allServicesReady =
    databaseState.isUserDBConnected &&
    databaseState.isConcertDBConnected &&
    databaseState.isArticleDBConnected &&
    databaseState.isChatDBConnected;

  const serviceStatus = {
    userDB: databaseState.isUserDBConnected,
    concertDB: databaseState.isConcertDBConnected,
    articleDB: databaseState.isArticleDBConnected,
    chatDB: databaseState.isChatDBConnected,
    redis: redisClient?.status === 'ready' || false,
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

app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    environment: env.NODE_ENV,
    services: {
      userDB: databaseState.isUserDBConnected,
      concertDB: databaseState.isConcertDBConnected,
      articleDB: databaseState.isArticleDBConnected,
      chatDB: databaseState.isChatDBConnected,
      redis: redisClient?.status === 'ready' || false,
    },
  });
});

// 데이터베이스 연결 상태 확인 미들웨어
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/health')) {
      return next();
    }

    if (req.path.startsWith('/auth') && !databaseState.isUserDBConnected) {
      return res.status(503).json({
        message: '사용자 데이터베이스 연결이 준비되지 않았습니다.',
      });
    }
    if (
      req.path.startsWith('/concert') &&
      !databaseState.isConcertDBConnected
    ) {
      return res.status(503).json({
        message: '콘서트 데이터베이스 연결이 준비되지 않았습니다.',
      });
    }
    if (
      req.path.startsWith('/article') &&
      !databaseState.isArticleDBConnected
    ) {
      return res.status(503).json({
        message: '게시글 데이터베이스 연결이 준비되지 않았습니다.',
      });
    }
    if (req.path.startsWith('/chat') && !databaseState.isChatDBConnected) {
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
      games: '/games',
      'health-liveness': '/health/liveness',
      'health-readiness': '/health/readiness',
      'health-general': '/health',
      'health-detailed': '/health/*',
      auth: '/auth',
      concerts: '/concert',
      articles: '/article',
      chat: '/chat',
      'report-rest': '/report',
      'report-graphql': '/graphql',
    },
    features: {
      authenticationSkip: shouldSkipAuth(),
      adminEmails: env.ADMIN_EMAILS.length,
      secureMode: isProduction(),
    },
    timestamp: new Date().toISOString(),
  });
});

// CSP Violation Report Endpoint
app.post(
  '/csp-report',
  express.json({ type: 'application/csp-report' }),
  (req, res) => {
    if (req.body) {
      const cspReport = req.body as Record<string, unknown>;
      logger.warn('CSP Violation:', cspReport['csp-report']);
    } else {
      logger.warn('CSP Violation: No report data received.');
    }
    res.status(204).end();
  },
);

// 서버 시작 함수
const startServer = async (): Promise<void> => {
  try {
    // Firebase 초기화
    try {
      const { initializeFirebase } = await import(
        './config/firebase/firebaseConfig'
      );
      initializeFirebase();
      logger.info('✅ Firebase Admin SDK initialized');
    } catch (firebaseError) {
      logger.warn(
        '⚠️ Firebase initialization failed, notifications will be disabled:',
        firebaseError,
      );
    }

    // Redis 연결 시도 (세션 스토어용)
    const isRedisConnected = await connectRedisClient();

    // 세션 미들웨어 설정
    const sessionConfig: session.SessionOptions = {
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        secure: isProduction() || env.COOKIE_SAMESITE === 'none',
        httpOnly: true,
        maxAge: parseInt(env.SESSION_MAX_AGE_WEB),
        sameSite: env.COOKIE_SAMESITE,
        domain: env.COOKIE_DOMAIN || undefined,
      },
      name: 'app.session.id',
    };

    if (isRedisConnected && redisClient.status === 'ready') {
      logger.info('✅ Session store: Redis');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionConfig.store = new (RedisStore as any)({
        client: redisClient,
        prefix: 'app:sess:',
      }) as Store;
    } else {
      logger.warn(
        '⚠️ Session store: Memory (sessions will not persist across restarts)',
      );
    }

    const sessionMiddleware = session(sessionConfig);
    app.use(sessionMiddleware);

    // Passport 초기화
    app.use(passport.initialize());
    app.use(passport.session());

    // Socket.IO Redis adapter용 Redis 연결
    logger.info('🔌 Connecting to Socket.IO Redis clients...');
    await connectSocketRedis();
    logger.info('✅ Socket.IO Redis clients ready');

    // 데이터베이스 초기화
    await initializeDatabases();

    // Passport 설정
    logger.info('🔌 Configuring Passport...');
    configurePassport(passport);
    logger.info('✅ Passport configured');

    // 라우터 연결
    logger.info('🔌 Connecting routes...');
    await setupRoutes(app, databaseState.reportService!);
    logger.info('✅ Routes connected');

    // Apollo Server 설정
    logger.info('🔌 Setting up Apollo Server...');
    await setupApolloServer(app, httpServer, databaseState.reportService!);
    logger.info('✅ Apollo Server setup complete');

    // Socket.IO 초기화
    logger.info('🔌 Initializing Socket.IO server...');
    chatSocketServer = new ChatSocketServer(httpServer, sessionMiddleware);
    logger.info('✅ Socket.IO server initialized');

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
      logger.info(`📢 Report REST API: http://localhost:${PORT}/report`);
      logger.info(`📊 Report GraphQL API: http://localhost:${PORT}/graphql`);
      logger.info(`🔌 Socket.IO: http://localhost:${PORT}/socket.io/`);
      logger.info(`💾 Database: MongoDB Native Driver`);
      logger.info(
        `🗄️  Session Store: ${sessionConfig.store ? 'Redis' : 'Memory (development)'}`,
      );
      logger.info(
        `🔒 Security: ${isProduction() ? 'Production Mode' : 'Development Mode'}`,
      );
      logger.info('🎉 ================================');

      // PM2 ready 신호 전송
      if (process.send) {
        process.send('ready');
        logger.info(
          '✅ PM2 ready signal sent - Zero-downtime deployment enabled',
        );
      }
    });
  } catch (err) {
    logger.error('❌ Startup failed', { error: err });
    process.exit(1);
  }
};

// 전역 오류 처리 설정
setupGlobalErrorHandlers();

// Graceful shutdown 핸들러 설정
setupShutdownHandlers(httpServer, chatSocketServer);

// 서버 시작
try {
  startServer().catch((error: unknown) => {
    logger.error('❌ Failed to start server:', { error });
    process.exit(1);
  });
} catch (error: unknown) {
  logger.error('❌ Caught an error during server startup:', { error });
  process.exit(1);
}

export { redisClient, chatSocketServer };
