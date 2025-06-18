import express from "express";

export const requireAuth = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!req.session.user) {
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
  if (!req.session.user) {
    res.status(401).json({ message: "로그인이 필요합니다." });
    return;
  }
  next();
};
