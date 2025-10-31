import express from 'express';

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
    res.status(401).json({ message: '로그인이 필요합니다.' });
    return;
  }

  // MongoDB UserSession 존재 여부 확인 (세션이 무효화되었는지 체크)
  try {
    const { UserSessionModel } = await import('../../models/auth/userSession');
    const userSessionModel = new UserSessionModel();
    const sessionExists = await userSessionModel.findBySessionId(req.sessionID);

    if (!sessionExists) {
      // MongoDB에 세션이 없으면 로그아웃 처리
      const sessionToDestroy = req.session;
      res.status(401).json({
        message: '세션이 만료되었거나 다른 기기에서 로그인되었습니다.',
      });

      // 응답 후 세션 삭제 (비동기로 처리)
      setImmediate(() => {
        sessionToDestroy.destroy((err) => {
          if (err) {
            console.error('[Auth] Session destroy error:', err);
          }
        });
      });
      return;
    }
  } catch (error) {
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
    res.status(500).json({ message: '세션이 초기화되지 않았습니다.' });
    return;
  }

  if (req.session.user) {
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
      // UserSession 조회 실패 시 로그만 남기고 기존 로직 유지
      console.error('[Auth] Failed to verify UserSession:', error);
    }

    // 유효한 세션이 존재하면 로그인 차단
    res.status(400).json({ message: '이미 로그인되어 있습니다.' });
    return;
  }

  next();
};

export const requireAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.session || !req.session.user) {
    res.status(401).json({ message: '로그인이 필요합니다.' });
    return;
  }
  next();
};
