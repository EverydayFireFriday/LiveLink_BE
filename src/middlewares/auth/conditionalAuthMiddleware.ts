import express from 'express';
import { requireAuth } from './authMiddleware';
import logger from '../../utils/logger/logger';

// SessionData 인터페이스 참조
declare module 'express-session' {
  interface SessionData {
    user?: {
      email: string; // 아이디로 사용되는 이메일
      userId: string;
      username: string; // 이름(수정 가능)
      profileImage?: string;
      loginTime: string;
    };
  }
}

/**
 * 개발환경에서만 인증을 스킵하는 미들웨어
 * 프로덕션에서는 정상적인 인증 체크
 */
export const requireAuthInProductionMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  // Only skip authentication if SKIP_AUTH is explicitly true
  if (process.env.SKIP_AUTH === 'true') {
    logger.info('⚠️ SKIP_AUTH 환경변수로 인증 스킵됨');

    // 개발환경에서 세션이 없으면 임시 세션 생성
    if (!req.session?.user) {
      createDevSessionIfNeeded(req);
    }

    return next();
  }
  return requireAuth(req, res, next);
};

/**
 * 환경변수 SKIP_AUTH가 true일 때도 인증 스킵 (디버깅용)
 */
export const requireAuthWithSkipOptionMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  // 개발환경에서 스킵
  if (process.env.NODE_ENV === 'development') {
    logger.info('🚀 개발 환경: 인증 스킵');

    if (!req.session?.user) {
      createDevSessionIfNeeded(req);
    }

    return next();
  }

  // SKIP_AUTH 환경변수로 스킵
  if (process.env.SKIP_AUTH === 'true') {
    logger.info('⚠️ SKIP_AUTH 환경변수로 인증 스킵됨');

    if (!req.session?.user) {
      createDevSessionIfNeeded(req);
    }

    return next();
  }

  return requireAuth(req, res, next);
};

/**
 * GET 요청은 항상 허용, 나머지는 개발환경에서만 스킵
 */
export const requireAuthForWriteOnlyMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  // GET 요청은 항상 허용 (세션 생성하지 않음)
  if (req.method === 'GET') {
    logger.info('📖 GET 요청: 인증 없이 허용');
    return next();
  }

  // 나머지 요청은 개발환경에서만 스킵
  if (process.env.NODE_ENV === 'development') {
    logger.info(`🚀 개발 환경: ${req.method} 요청 인증 스킵`);

    if (!req.session?.user) {
      createDevSessionIfNeeded(req);
    }

    return next();
  }

  return requireAuth(req, res, next);
};

/**
 * 개발환경에서 임시 사용자 세션 생성 헬퍼
 * SessionData 인터페이스에 맞춰 생성
 */
export const createDevSessionIfNeeded = (
  req: express.Request,
  options: {
    email?: string;
    userId?: string;
    username?: string;
    profileImage?: string;
  } = {},
) => {
  if (process.env.NODE_ENV === 'development' && !req.session?.user) {
    const timestamp = new Date().toISOString();
    const randomId = Math.random().toString(36).substring(2, 8);

    const {
      email = `dev-${randomId}@localhost`,
      userId = `dev-user-${Date.now()}`,
      username = `dev-user-${randomId}`,
      profileImage = undefined,
    } = options;

    // SessionData 인터페이스에 맞춰 세션 생성
    req.session.user = {
      email,
      userId,
      username,
      profileImage,
      loginTime: timestamp,
    };

    logger.info(`👤 개발환경 임시 세션 생성:`);
    logger.info(`   - 이메일: ${email}`);
    logger.info(`   - 사용자ID: ${userId}`);
    logger.info(`   - 사용자명: ${username}`);
    logger.info(`   - 로그인시간: ${timestamp}`);
  }
};

/**
 * 현재 세션 정보 확인 미들웨어 (디버깅용)
 */
export const logSessionInfoMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (req.session?.user) {
    logger.info(`👤 현재 세션 정보:`);
    logger.info(`   - 이메일: ${req.session.user.email}`);
    logger.info(`   - 사용자ID: ${req.session.user.userId}`);
    logger.info(`   - 사용자명: ${req.session.user.username}`);
    logger.info(`   - 로그인시간: ${req.session.user.loginTime}`);
    if (req.session.user.profileImage) {
      logger.info(`   - 프로필이미지: ${req.session.user.profileImage}`);
    }
  } else {
    logger.info(`👻 세션 없음: ${req.method} ${req.path}`);
  }

  next();
};

/**
 * 세션 사용자 정보 응답 헬퍼
 */
export const getCurrentUserInfo = (req: express.Request) => {
  if (!req.session?.user) {
    return null;
  }

  return {
    email: req.session.user.email,
    userId: req.session.user.userId,
    username: req.session.user.username,
    profileImage: req.session.user.profileImage,
    loginTime: req.session.user.loginTime,
    isAuthenticated: true,
  };
};

/**
 * 사용자 정보 업데이트 헬퍼
 */
export const updateSessionUser = (
  req: express.Request,
  updates: Partial<{
    email: string;
    username: string;
    profileImage: string;
  }>,
) => {
  if (req.session?.user) {
    if (updates.email) req.session.user.email = updates.email;
    if (updates.username) req.session.user.username = updates.username;
    if (updates.profileImage !== undefined)
      req.session.user.profileImage = updates.profileImage;

    logger.info(
      `🔄 세션 정보 업데이트: ${req.session.user.username} (${req.session.user.email})`,
    );
    return true;
  }
  return false;
};

// 개발환경 설정 정보 출력
if (process.env.NODE_ENV === 'development') {
  logger.info('\n🔧 조건부 인증 미들웨어 설정:');
  logger.info(`  - NODE_ENV: ${process.env.NODE_ENV}`);
  logger.info(`  - SKIP_AUTH: ${process.env.SKIP_AUTH || 'false'}`);
  logger.info(`  - 개발환경 인증 스킵: ✅ 활성화됨`);
  logger.info(
    `  - 세션 구조: email, userId, username, profileImage?, loginTime`,
  );
}
