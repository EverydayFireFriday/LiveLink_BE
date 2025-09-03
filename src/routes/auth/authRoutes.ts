import express from "express";
import {
  loginLimiter,
} from "../../middlewares/rateLimitMiddleware";
import {
  requireAuth,
  requireNoAuth,
} from "../../middlewares/auth/authMiddleware";

const router = express.Router();

// 지연 로딩으로 컨트롤러 생성
const getAuthController = () => {
  const { AuthController } = require("../../controllers/auth/authController");
  return new AuthController();
};

// 로그인/로그아웃
router.post("/login", loginLimiter, requireNoAuth, async (req, res) => {
  const authController = getAuthController();
  await authController.login(req, res);
});

router.post("/logout", requireAuth, (req, res) => {
  const authController = getAuthController();
  authController.logout(req, res);
});

// 세션
router.get("/session", (req, res) => {
  const authController = getAuthController();
  authController.checkSession(req, res);
});

export default router;
