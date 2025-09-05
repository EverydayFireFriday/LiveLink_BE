import { Request, Response, NextFunction } from 'express';
import { isProduction } from '../config/env';

/**
 * 프로덕션 환경에서 HTTP 요청을 HTTPS로 강제 리다이렉션하는 미들웨어
 */
export const forceHttpsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (isProduction() && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
};
