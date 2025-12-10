import express from 'express';
import {
  AppError,
  UnauthorizedError,
  BadRequestError,
  InternalServerError,
} from '../../utils/errors/customErrors';
import { ErrorCodes } from '../../utils/errors/errorCodes';

/**
 * 로그인 필수 미들웨어
 * 세션과 MongoDB UserSession의 유효성을 모두 확인
 */
export const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.session || !req.session.user) {
    throw new UnauthorizedError(
      '로그인이 필요합니다.',
      ErrorCodes.AUTH_UNAUTHORIZED,
    );
  }

  // 🔒 PRIORITY CHECK: Verify session is not in invalidation list
  // This prevents race condition where session is deleted during an active request
  try {
    const { redisClient } = await import('../../app');
    if (redisClient.status === 'ready') {
      const invalidationKey = `invalidated:${req.sessionID}`;
      const isInvalidated = await redisClient.get(invalidationKey);

      if (isInvalidated) {
        // Session is marked for deletion - destroy immediately without saving
        req.session.destroy(() => {});
        throw new UnauthorizedError(
          '세션이 만료되었거나 다른 기기에서 로그인되었습니다.',
          ErrorCodes.AUTH_TOKEN_EXPIRED,
        );
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('[Auth] Failed to check invalidation list:', error);
  }

  // MongoDB UserSession 존재 여부 확인 (세션이 무효화되었는지 체크)
  try {
    const { UserSessionModel } = await import('../../models/auth/userSession');
    const userSessionModel = new UserSessionModel();
    const sessionExists = await userSessionModel.findBySessionId(req.sessionID);

    if (!sessionExists) {
      // MongoDB에 세션이 없으면 로그아웃 처리
      req.session.destroy(() => {});
      throw new UnauthorizedError(
        '세션이 만료되었거나 다른 기기에서 로그인되었습니다.',
        ErrorCodes.AUTH_TOKEN_EXPIRED,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    // UserSession 조회 실패 시 로그만 남기고 계속 진행
    console.error('[Auth] Failed to verify UserSession:', error);
  }

  next();
};

/**
 * 비로그인 필수 미들웨어
 * MongoDB UserSession을 확인하여 실제로 유효한 세션인지 검증
 */
export const requireNoAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.session) {
    throw new InternalServerError(
      '세션이 초기화되지 않았습니다.',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }

  if (req.session.user) {
    // force 파라미터가 true이면 강제 로그인 허용
    const { force } = req.body as { force?: boolean };
    if (force === true) {
      console.log('[Auth] Force login requested, allowing login');
      next();
      return;
    }

    // MongoDB UserSession 존재 여부 확인
    try {
      const { UserSessionModel } = await import(
        '../../models/auth/userSession'
      );
      const userSessionModel = new UserSessionModel();
      const sessionExists = await userSessionModel.findBySessionId(
        req.sessionID,
      );

      if (!sessionExists) {
        // MongoDB에 세션이 없으면 세션 user 정보만 삭제하고 계속 진행
        // req.session.destroy()를 호출하면 req.session이 undefined가 되어
        // 컨트롤러에서 req.session.regenerate() 호출 시 에러 발생
        delete req.session.user;
        console.log(
          '[Auth] Session user cleared (MongoDB session not found), allowing login',
        );
        // 세션이 무효하므로 로그인 허용
        next();
        return;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      // UserSession 조회 실패 시 로그만 남기고 기존 로직 유지
      console.error('[Auth] Failed to verify UserSession:', error);
    }

    // 유효한 세션이 존재하면 로그인 차단
    throw new BadRequestError(
      '이미 로그인되어 있습니다.',
      ErrorCodes.AUTH_ALREADY_LOGGED_IN,
    );
  }

  next();
};

export const requireAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.session || !req.session.user) {
    throw new UnauthorizedError(
      '로그인이 필요합니다.',
      ErrorCodes.AUTH_UNAUTHORIZED,
    );
  }
  next();
};
