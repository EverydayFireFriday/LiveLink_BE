import express from 'express';
import logger from '../../utils/logger/logger';
import { UserRole } from '../../models/auth/user';

/**
 * 관리자 권한 확인 미들웨어 (ADMIN 또는 SUPERADMIN)
 */
export const requireAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  // 로그인 확인
  if (!req.session.user) {
    res.status(401).json({
      message: '로그인이 필요합니다.',
      redirectTo: '/auth/login',
    });
    return;
  }

  // 관리자 권한 확인 (ADMIN 또는 SUPERADMIN)
  const userRole = req.session.user.role;
  const isAdmin =
    userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

  if (!isAdmin) {
    logger.info(
      `🚫 관리자 권한 없음: ${req.session.user.email} (현재 역할: ${userRole})`,
    );
    res.status(403).json({
      message: '관리자 권한이 필요합니다.',
      currentUser: req.session.user.email,
      currentRole: userRole,
      requiredRole: 'admin or superadmin',
    });
    return;
  }

  // 관리자 접근 로그
  logger.info(
    `👑 관리자 접근: ${req.session.user.email} (${userRole}) → ${req.method} ${req.path}`,
  );

  next();
};

/**
 * 슈퍼 관리자 권한 확인 미들웨어 (SUPERADMIN만)
 */
export const requireSuperAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  // 로그인 확인
  if (!req.session.user) {
    res.status(401).json({
      message: '로그인이 필요합니다.',
      redirectTo: '/auth/login',
    });
    return;
  }

  // 슈퍼 관리자 권한 확인
  const userRole = req.session.user.role;

  if (userRole !== UserRole.SUPERADMIN) {
    logger.info(
      `🚫 슈퍼 관리자 권한 없음: ${req.session.user.email} (현재 역할: ${userRole})`,
    );
    res.status(403).json({
      message: '슈퍼 관리자 권한이 필요합니다.',
      currentUser: req.session.user.email,
      currentRole: userRole,
      requiredRole: 'superadmin',
    });
    return;
  }

  // 슈퍼 관리자 접근 로그
  logger.info(
    `👑👑 슈퍼 관리자 접근: ${req.session.user.email} → ${req.method} ${req.path}`,
  );

  next();
};

/**
 * 관리자 권한 확인 (응답 반환)
 */
export const checkAdminStatus = (
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) => {
  if (!req.session.user) {
    res.status(401).json({
      isAdmin: false,
      message: '로그인이 필요합니다.',
    });
    return;
  }

  const userRole = req.session.user.role;
  const isAdmin =
    userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;
  const isSuperAdmin = userRole === UserRole.SUPERADMIN;

  res.status(200).json({
    isAdmin,
    isSuperAdmin,
    role: userRole,
    user: req.session.user,
  });
};
