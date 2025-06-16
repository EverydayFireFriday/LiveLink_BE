import express from "express";
import { PasswordController } from "../../controllers/auth/passwordController";
import { requireAuth } from "../../middlewares/auth/authMiddleware";

const router = express.Router();
const passwordController = new PasswordController();

// 비밀번호 재설정 (로그인 없이)
router.post("/reset-password", passwordController.resetPasswordRequest);
router.post("/verify-reset-password", passwordController.verifyResetPassword);

// 비밀번호 변경 (로그인 필요)
router.put("/change-password", requireAuth, passwordController.changePassword);

export default router;
