import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger/logger';
import {
  httpRequestCounter,
  httpRequestDurationMicroseconds,
  activeConnectionsGauge,
  httpErrorCounter,
} from '../../config/metrics/prometheus';
import { shutdownState } from '../../services/shutdown/gracefulShutdown';

/**
 * API 응답 시간 측정 및 성능 모니터링 미들웨어
 *
 * 주요 기능:
 * - 요청별 응답 시간 측정 및 Prometheus 메트릭 기록
 * - 느린 API 감지 및 경고 로깅 (기본 500ms 이상)
 * - HTTP 상태 코드별 메트릭 수집
 * - Graceful shutdown 중 요청 거부
 * - 활성 연결 추적
 *
 * @param slowApiThreshold - 느린 API로 간주할 응답 시간 (ms), 기본값: 500ms
 */
export const createResponseTimeMiddleware = (
  slowApiThreshold: number = 500,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Graceful shutdown: 새로운 요청 거부
    if (shutdownState.isShuttingDown) {
      res.set('Connection', 'close');
      res.status(503).json({
        error: 'Server is shutting down',
        message: '서버가 종료 중입니다. 잠시 후 다시 시도해주세요.',
      });
      return;
    }

    // 요청 시작 시간 기록
    const startTime = Date.now();

    // 진행 중인 요청 추적
    shutdownState.activeRequests++;
    activeConnectionsGauge.inc();

    // Prometheus 타이머 시작
    const prometheusTimer = httpRequestDurationMicroseconds.startTimer();

    // 응답 완료 이벤트 핸들러
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const route: string = req.route?.path || req.path;
      const status = res.statusCode;

      // Prometheus 메트릭 기록
      httpRequestCounter.inc({
        method: req.method,
        route,
        status,
      });

      prometheusTimer({
        method: req.method,
        route,
        status,
      });

      // HTTP 에러 추적 (4xx, 5xx)
      if (status >= 400) {
        httpErrorCounter.inc({
          method: req.method,
          route,
          status,
        });
      }

      // 느린 API 경고 로깅
      if (duration > slowApiThreshold) {
        // requestId 타입 안전하게 처리
        const requestId =
          'id' in req && typeof req.id === 'string' ? req.id : undefined;

        logger.warn(`Slow API detected`, {
          duration: `${duration}ms`,
          method: req.method,
          path: req.path,
          route,
          statusCode: status,
          userAgent: req.get('user-agent') || 'Unknown',
          // requestId가 있다면 포함 (express-request-id 등 사용 시)
          ...(requestId && { requestId }),
        });
      }

      // 활성 연결 감소
      activeConnectionsGauge.dec();
      shutdownState.activeRequests--;
    });

    // 클라이언트 연결 종료 이벤트 핸들러
    res.on('close', () => {
      // finish 이벤트 없이 종료된 경우 (클라이언트가 연결을 끊은 경우)
      if (!res.writableEnded) {
        activeConnectionsGauge.dec();
        shutdownState.activeRequests--;

        // 연결 종료 로깅
        logger.warn('Client connection closed prematurely', {
          method: req.method,
          path: req.path,
          duration: `${Date.now() - startTime}ms`,
        });
      }
    });

    next();
  };
};

/**
 * 기본 설정으로 생성된 응답 시간 미들웨어
 * 느린 API 임계값: 500ms
 */
export const responseTimeMiddleware = createResponseTimeMiddleware(500);
