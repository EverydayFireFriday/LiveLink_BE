import { IncomingMessage } from 'http';
import logger from '../../utils/logger/logger';
import { redisClient } from '../../config/redis/redisClient';

/**
 * ⚠️ IMPORTANT: WebSocket 연결 전 인증 체크
 *
 * 보안 원칙:
 * - WebSocket 핸드셰이크 전에 세션 검증
 * - 무효 세션은 연결 자체를 차단 (DoS 방지)
 * - Redis 연결 실패 시 연결 거부
 *
 * 처리 흐름:
 * 1. 쿠키 헤더에서 세션 ID 추출
 * 2. Redis에서 세션 데이터 조회
 * 3. 세션 유효성 검증
 * 4. 인증 실패 시 즉시 연결 거부
 */

/**
 * 쿠키 문자열에서 특정 쿠키 값 추출
 * @param cookieString - 전체 쿠키 문자열
 * @param cookieName - 추출할 쿠키 이름
 * @returns 쿠키 값 또는 null
 */
export function parseCookie(
  cookieString: string | undefined,
  cookieName: string,
): string | null {
  if (!cookieString) return null;

  const cookies = cookieString.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  return cookies[cookieName] || null;
}

/**
 * 세션 ID에서 실제 Redis 키로 변환
 * @param sessionId - 세션 ID (서명 포함)
 * @returns Redis 세션 키
 */
export function getRedisSessionKey(sessionId: string): string {
  // express-session의 세션 ID는 "s:" prefix와 서명이 포함되어 있을 수 있음
  // 예: "s:sessionId.signature" -> "sessionId"
  let cleanSessionId = sessionId;

  if (sessionId.startsWith('s:')) {
    // "s:" prefix 제거
    cleanSessionId = sessionId.substring(2);
    // 서명 부분 제거 (. 이후)
    const dotIndex = cleanSessionId.indexOf('.');
    if (dotIndex !== -1) {
      cleanSessionId = cleanSessionId.substring(0, dotIndex);
    }
  }

  return `app:sess:${cleanSessionId}`;
}

/**
 * Redis에서 세션 데이터 조회
 * @param sessionId - 세션 ID
 * @returns 세션 데이터 또는 null
 */
export async function getSessionFromRedis(
  sessionId: string,
): Promise<Record<string, unknown> | null> {
  try {
    if (!redisClient.isOpen) {
      logger.warn('[Socket.IO] Redis client is not connected');
      return null;
    }

    const sessionKey = getRedisSessionKey(sessionId);
    const sessionData = await redisClient.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    return JSON.parse(sessionData) as Record<string, unknown>;
  } catch (error) {
    logger.error('[Socket.IO] Failed to get session from Redis:', error);
    return null;
  }
}

/**
 * 세션 데이터가 유효한지 검증
 * @param sessionData - Redis에서 조회한 세션 데이터
 * @returns 유효 여부
 */
export function validateSession(
  sessionData: Record<string, unknown> | null,
): boolean {
  if (!sessionData) return false;

  // passport 세션 검증
  const passport = sessionData.passport as Record<string, unknown> | undefined;
  if (!passport || !passport.user) {
    return false;
  }

  const user = passport.user as Record<string, unknown>;
  return !!(user.userId && user.username && user.email);
}

/**
 * WebSocket 연결 전 세션 인증 체크
 * Socket.IO allowRequest 옵션에서 사용
 *
 * @param req - HTTP 요청 객체
 * @param callback - 인증 결과 콜백
 */
export async function authenticateSocketConnection(
  req: IncomingMessage,
  callback: (err: string | null | undefined, success: boolean) => void,
): Promise<void> {
  try {
    // 1. 쿠키에서 세션 ID 추출
    const cookieHeader = req.headers.cookie;
    const sessionCookieName = 'app.session.id'; // app.ts에서 설정한 세션 쿠키 이름
    const sessionId = parseCookie(cookieHeader, sessionCookieName);

    if (!sessionId) {
      logger.warn('[Socket.IO] Connection rejected: No session cookie');
      callback('No session cookie', false);
      return;
    }

    // 2. Redis에서 세션 조회
    const sessionData = await getSessionFromRedis(sessionId);

    // 3. 세션 유효성 검증
    if (!validateSession(sessionData)) {
      logger.warn(
        `[Socket.IO] Connection rejected: Invalid session (${sessionId.substring(0, 10)}...)`,
      );
      callback('Invalid or expired session', false);
      return;
    }

    // 4. 인증 성공
    const passport = sessionData!.passport as Record<string, unknown>;
    const user = passport.user as Record<string, unknown>;
    const username =
      typeof user.username === 'string' ? user.username : 'unknown';
    logger.info(
      `[Socket.IO] Connection authenticated: ${username} (${sessionId.substring(0, 10)}...)`,
    );
    callback(null, true);
  } catch (error) {
    logger.error('[Socket.IO] Authentication error:', error);
    callback('Authentication failed', false);
  }
}
