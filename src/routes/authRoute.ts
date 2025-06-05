import express from "express";
import {
  register,
  login,
  logout,
  checkSession,
  getProfile,
  updateProfile,
  getAllUsers,
  // 별명 관련 함수들
  updateUsername,
  checkUsername,
  // 이메일 인증 관련 함수들
  resetPasswordRequest,
  verifyResetPassword,
  resendVerificationCode,
  changePassword,
} from "../controllers/authController";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";

const router = express.Router();

// === 인증이 불필요한 라우트들 ===

// 기본 인증 관련
router.post("/register", register);
router.post("/login", login);

// 비밀번호 재설정 (이메일 인증)
router.post("/reset-password", resetPasswordRequest);
router.post("/verify-reset-password", verifyResetPassword);

// 인증 코드 재전송
router.post("/resend-code", resendVerificationCode);

// 별명 중복 체크 (회원가입 시에도 필요하므로 인증 불필요)
router.post("/check-username", checkUsername);

// === 인증이 필요한 라우트들 ===

// 로그아웃 (로그인된 사용자만)
router.post("/logout", requireAuth, logout);

// 세션 확인 (로그인된 사용자만)
router.get("/session", requireAuth, checkSession);

// 프로필 관련 (로그인된 사용자만)
router.get("/profile", requireAuth, getProfile);
router.put("/profile", requireAuth, updateProfile);
router.put('/change-password', requireAuth, changePassword);


// 별명 수정 (로그인된 사용자만)
router.put("/update-username", requireAuth, updateUsername);

// === 관리자 권한이 필요한 라우트들 ===
router.get("/users", requireAdmin, getAllUsers);

export default router;