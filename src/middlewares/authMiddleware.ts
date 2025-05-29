// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  // 세션에서 사용자 정보 확인
  if (!req.session || !req.session.user) {
    res.status(401).json({
      success: false,
      message: "로그인이 필요합니다."
    });
    return;
  }
  
  // 사용자 정보를 req.user에 저장 (컨트롤러에서 사용 가능)
  req.user = {
    userId: req.session.user.userId,
    email: req.session.user.email,
    username: req.session.user.username,
    profileImage: req.session.user.profileImage,
    loginTime: req.session.user.loginTime
  };
  
  next();
};

// 관리자 권한 확인 미들웨어 (예시 - 실제 구현에 맞게 수정 필요)
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session || !req.session.user) {
    res.status(401).json({
      success: false,
      message: "로그인이 필요합니다."
    });
    return;
  }
  
  // 관리자 권한 확인 (예: 특정 이메일 도메인 또는 별도 관리자 플래그)
  // 실제 구현에서는 데이터베이스의 role 필드나 특정 조건으로 확인
  const adminEmails: string[] = ['admin@example.com']; // 예시
  if (!adminEmails.includes(req.session.user.email)) {
    res.status(403).json({
      success: false,
      message: "관리자 권한이 필요합니다."
    });
    return;
  }
  
  req.user = {
    userId: req.session.user.userId,
    email: req.session.user.email,
    username: req.session.user.username,
    profileImage: req.session.user.profileImage,
    loginTime: req.session.user.loginTime
  };
  
  next();
};