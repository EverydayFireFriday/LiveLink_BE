import express from "express";

export const requireAuth = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!req.session || !req.session.user) {
    res.status(401).json({ message: "로그인이 필요합니다." });
    return;
  }
  next();
};

export const requireNoAuth = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!req.session) {
    res.status(500).json({ message: "세션이 초기화되지 않았습니다." });
    return;
  }
  if (req.session.user) {
    res.status(400).json({ message: "이미 로그인되어 있습니다." });
    return;
  }
  next();
};

export const requireAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!req.session || !req.session.user) {
    res.status(401).json({ message: "로그인이 필요합니다." });
    return;
  }
  next();
};
