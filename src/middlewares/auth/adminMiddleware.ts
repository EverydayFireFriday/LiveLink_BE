import express from 'express';
import logger from '../../utils/logger/logger';

// 관리자 이메일 목록 확인
const getAdminEmails = (): string[] => {
  const adminEmailsString = process.env.ADMIN_EMAILS;
  if (!adminEmailsString) {
    logger.warn('⚠️ ADMIN_EMAILS 환경변수가 설정되지 않았습니다.');
    return [];
  }

  return adminEmailsString
    .split(',')
    .map((email) => email.trim().toLowerCase());
};

/**
 * 관리자 권한 확인 미들웨어
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

  // 관리자 권한 확인
  const adminEmails = getAdminEmails();
  const userEmail = req.session.user.email.toLowerCase();

  if (!adminEmails.includes(userEmail)) {
    logger.info(
      `🚫 관리자 권한 없음: ${userEmail} (허용된 관리자: ${adminEmails.join(', ')})`,
    );
    res.status(403).json({
      message: '관리자 권한이 필요합니다.',
      currentUser: req.session.user.email,
      requiredRole: 'admin',
    });
    return;
  }

  // 관리자 접근 로그
  logger.info(`👑 관리자 접근: ${userEmail} → ${req.method} ${req.path}`);

  next();
};

/**
 * 관리자 권한 확인 (응답 반환)
 */
export const checkAdminStatus = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.session.user) {
    res.status(401).json({
      isAdmin: false,
      message: '로그인이 필요합니다.',
    });
    return;
  }

  const adminEmails = getAdminEmails();
  const userEmail = req.session.user.email.toLowerCase();
  const isAdmin = adminEmails.includes(userEmail);

  res.status(200).json({
    isAdmin,
    user: req.session.user,
    adminEmails: isAdmin ? adminEmails : undefined, // 관리자만 전체 목록 조회 가능
  });
};
