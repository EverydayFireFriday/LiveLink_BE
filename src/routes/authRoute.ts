import express from "express";

import {
  // 기본 인증
  register,
  login,
  logout,
  checkSession,

  // 프로필 관리
  getProfile,
  updateProfile,
  getAllUsers,

  // 사용자명 관리
  updateUsername,
  checkUsername,
  generateUsernameAPI,

  // 이메일 인증 회원가입
  registerRequest,
  verifyRegister,

  // 비밀번호 관리
  resetPasswordRequest,
  verifyResetPassword,
  changePassword,

  // 인증 코드 관리
  resendVerificationCode,
  getVerificationStatus,
  cancelVerification,

  // 시스템 상태
  healthCheck,
  checkEmailServiceStatus,
  previewEmailTemplate,
  cleanupExpiredCodes,
} from "../controllers/authController";

import {
  requireAuth,
  requireAdmin,
  checkAdminStatus,
  getAdminList,
} from "../middlewares/authMiddleware";

const router = express.Router();

// ==============================================
// Public Routes (인증 불필요)
// ==============================================

// 회원가입
router.post("/register-request", registerRequest);
router.post("/verify-register", verifyRegister);
router.post("/register", register);

// 로그인
router.post("/login", login);

// 비밀번호 재설정
router.post("/reset-password", resetPasswordRequest);
router.post("/verify-reset-password", verifyResetPassword);

// 사용자명 관리
router.get("/generate-username", generateUsernameAPI);
router.post("/check-username", checkUsername);

// 인증 코드 관리
router.post("/verification/status", getVerificationStatus);
router.post("/verification/cancel", cancelVerification);
router.post("/verification/resend", resendVerificationCode);

// 시스템 상태
router.get("/health", healthCheck);

// ==============================================
// Protected Routes (로그인 필요)
// ==============================================

// 세션 관리
router.get("/session", requireAuth, checkSession);
router.post("/logout", requireAuth, logout);

// 프로필 관리
router.get("/profile", requireAuth, getProfile);
router.put("/profile", requireAuth, updateProfile);
router.put("/username", requireAuth, updateUsername);
router.put("/change-password", requireAuth, changePassword);

// 관리자 권한 확인
router.get("/admin-status", requireAuth, checkAdminStatus);

// ==============================================
// Admin Routes (관리자 전용)
// ==============================================

// 사용자 관리
router.get("/users", requireAdmin, getAllUsers);
router.get("/admins", requireAdmin, getAdminList);

// 이메일 서비스
router.get("/email-service/status", requireAdmin, checkEmailServiceStatus);
router.get("/email-service/preview", requireAdmin, previewEmailTemplate);

// 시스템 관리
router.post("/cleanup-expired", requireAdmin, async (req, res) => {
  try {
    await cleanupExpiredCodes();
    res.status(200).json({
      message: "만료된 인증 코드 정리 완료",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("정리 작업 에러:", error);
    res.status(500).json({ message: "정리 작업 실패" });
  }
});

export default router;
