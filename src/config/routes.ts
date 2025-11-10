import express from 'express';
import { ReportService } from '../report/reportService';
import { defaultLimiter } from '../middlewares/security/rateLimitMiddleware';
import {
  errorHandler,
  notFoundHandler,
} from '../middlewares/error/errorHandler';

// 라우터 import
import authRouter from '../routes/auth/index';
import concertRouter from '../routes/concert/index';
import testRouter from '../routes/test/testRoutes';
import healthRouter from '../routes/health/healthRoutes';
import swaggerRouter from '../routes/swagger/swaggerRoutes';
import termsRouter from '../routes/terms/index';
import notificationRouter from '../routes/notification/index';
import { createReportRouterWithService } from '../routes/report/index';

/**
 * Setup all routes
 */
export const setupRoutes = async (
  app: express.Application,
  reportService: ReportService,
): Promise<void> => {
  // 정적 라우터 연결
  app.use('/health', healthRouter);
  app.use('/swagger-json', swaggerRouter);
  app.use('/terms', termsRouter);

  // 메인 라우터 연결 (rate limiter 적용)
  app.use(defaultLimiter);
  app.use('/auth', authRouter);
  app.use('/concert', concertRouter);
  app.use('/test', testRouter);
  app.use('/', notificationRouter);

  // 동적 라우터 로드 - Article
  const { default: articleRouter } = await import('../routes/article/index');
  app.use('/article', articleRouter);

  // 동적 라우터 로드 - Chat
  const { default: chatRouter } = await import('../routes/chat/index');
  app.use('/chat', chatRouter);

  // Report REST API
  const reportRouter = createReportRouterWithService(reportService);
  app.use('/report', reportRouter);

  // 404 핸들러 (모든 라우터 뒤에, 에러 핸들러 앞에 위치)
  app.use('*', notFoundHandler);

  // 전역 에러 핸들러 (가장 마지막에 위치)
  app.use(errorHandler);
};
