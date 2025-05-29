import express from "express";
import {
  register,
  login,
  logout,
  checkSession,
  getProfile,
  updateProfile,
  getAllUsers,
  findUsername,
  verifyUsernameCode,
  resetPasswordRequest,
  verifyResetPassword,
  resendVerificationCode,
} from "../controllers/authController";

const router = express.Router();

// 기본 인증 관련
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// 🆕 아이디 찾기 (이메일 인증)
router.post("/find-username", findUsername);
router.post("/verify-username", verifyUsernameCode);

// 🆕 비밀번호 재설정 (이메일 인증)
router.post("/reset-password", resetPasswordRequest);
router.post("/verify-reset-password", verifyResetPassword);

// 🆕 인증 코드 재전송
router.post("/resend-code", resendVerificationCode);

// 세션 관련
router.get("/session", checkSession);

// 프로필 관련
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// 관리자 기능
router.get("/users", getAllUsers);

export default router;