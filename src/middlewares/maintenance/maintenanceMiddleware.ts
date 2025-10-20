import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../../utils/logger/logger';

/**
 * 유지보수 모드 미들웨어
 *
 * 다음 두 가지 방법으로 유지보수 모드를 활성화할 수 있습니다:
 * 1. 환경 변수: MAINTENANCE_MODE=true
 * 2. 파일 생성: 프로젝트 루트에 maintenance.lock 파일 생성
 *
 * 유지보수 모드가 활성화되면:
 * - 헬스체크 엔드포인트는 정상 작동 (K8s 등에서 사용)
 * - 화이트리스트에 등록된 관리자 IP는 정상 접근 가능
 * - 일반 사용자는 점검 페이지로 리다이렉트 (HTML) 또는 503 에러 (API)
 */
export const maintenanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  try {
    // 1. 헬스체크 엔드포인트는 항상 통과 (K8s liveness/readiness probe용)
    if (
      req.path.startsWith('/health') ||
      req.path === '/metrics' // Prometheus 메트릭도 허용
    ) {
      return next();
    }

    // 2. 유지보수 모드 확인
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

    // 3. maintenance.lock 파일 존재 여부 확인
    const maintenanceLockPath = path.join(
      __dirname,
      '../../../maintenance.lock'
    );
    const hasMaintenanceLock = fs.existsSync(maintenanceLockPath);

    // 4. 유지보수 모드가 아니면 정상 처리
    if (!isMaintenanceMode && !hasMaintenanceLock) {
      return next();
    }

    // 5. 관리자 IP 화이트리스트 확인
    const allowedIPs = (process.env.MAINTENANCE_ALLOWED_IPS || '')
      .split(',')
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    // 클라이언트 IP 추출
    const clientIP =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      '';

    // 6. 화이트리스트에 있는 IP는 통과
    if (allowedIPs.length > 0 && allowedIPs.includes(clientIP)) {
      logger.info(`Maintenance mode: Allowed IP ${clientIP} accessed`, {
        path: req.path,
        method: req.method,
      });
      return next();
    }

    // 7. 유지보수 모드 활성화 - 응답 처리
    logger.info(`Maintenance mode: Blocked request from ${clientIP}`, {
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });

    // HTML 요청이면 점검 페이지 반환
    const acceptsHtml = req.accepts('html');
    if (acceptsHtml) {
      const maintenancePage = path.join(
        __dirname,
        '../../../public/maintenance.html'
      );

      // 점검 페이지가 존재하는지 확인
      if (fs.existsSync(maintenancePage)) {
        return res.status(503).sendFile(maintenancePage);
      } else {
        // 점검 페이지가 없으면 기본 HTML 응답
        logger.warn('maintenance.html not found, sending default HTML');
        return res.status(503).send(`
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>서비스 점검 중</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
              }
              h1 { font-size: 2.5rem; margin-bottom: 1rem; }
              p { font-size: 1.2rem; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🔧 서비스 점검 중</h1>
              <p>더 나은 서비스를 제공하기 위해<br>시스템 점검을 진행하고 있습니다.</p>
              <p>잠시 후 다시 시도해 주세요.</p>
            </div>
          </body>
          </html>
        `);
      }
    }

    // API 요청이면 JSON 응답
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: '서비스 점검 중입니다. 잠시 후 다시 시도해 주세요.',
      code: 'MAINTENANCE_MODE',
      retryAfter: 3600, // 1시간 후 재시도 권장 (초 단위)
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // 미들웨어 에러는 로그만 남기고 정상 처리 (서비스 중단 방지)
    logger.error('Error in maintenance middleware', { error });
    return next();
  }
};
