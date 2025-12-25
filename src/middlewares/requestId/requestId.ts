import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID 트래킹 미들웨어
 *
 * 주요 기능:
 * - 각 요청에 고유한 ID 부여
 * - 클라이언트가 제공한 X-Request-ID 헤더 사용 (있는 경우)
 * - 없으면 UUID v4로 자동 생성
 * - 응답 헤더에 X-Request-ID 포함하여 클라이언트에 전달
 * - req.id에 저장하여 다른 미들웨어/로거에서 사용 가능
 *
 * 사용 예시:
 * - 로그 추적: 모든 로그에 requestId 포함
 * - 디버깅: 특정 요청의 전체 처리 과정 추적
 * - 분산 추적: 마이크로서비스 간 요청 추적
 *
 * @example
 * // 사용 방법
 * app.use(requestIdMiddleware);
 *
 * // 라우터/컨트롤러에서 접근
 * const requestId = req.id; // TypeScript 타입 지원
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // 클라이언트가 제공한 Request ID 사용, 없으면 새로 생성
  const requestId =
    (req.headers['x-request-id'] as string | undefined) || uuidv4();

  // Request 객체에 requestId 추가 (타입 정의는 src/types/etc/express.d.ts 참조)
  req.id = requestId;

  // 응답 헤더에 Request ID 포함
  res.setHeader('X-Request-ID', requestId);

  next();
};
