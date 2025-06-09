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
} from "../controllers/authController";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";

const router = express.Router();

// ==============================================
// 인증이 불필요한 라우트들 (Public Routes)
// ==============================================

// 이메일 인증 회원가입 (권장 방식)
router.post("/register-request", registerRequest); // 1단계: 이메일 인증 코드 전송
router.post("/verify-register", verifyRegister); // 2단계: 인증 완료 및 가입

// 즉시 회원가입 (기존 방식, 호환성 유지)
router.post("/register", register);

// 로그인
router.post("/login", login);

// 비밀번호 재설정 (이메일 인증)
router.post("/reset-password", resetPasswordRequest); // 비밀번호 재설정 요청
router.post("/verify-reset-password", verifyResetPassword); // 비밀번호 재설정 완료

// 인증 코드 관리
router.post("/resend-code", resendVerificationCode); // 인증 코드 재전송
router.post("/verification-status", getVerificationStatus); // 인증 상태 확인
router.post("/cancel-verification", cancelVerification); // 인증 프로세스 취소

// 사용자명 관리 (회원가입 시 필요하므로 public)
router.post("/check-username", checkUsername); // 사용자명 중복 확인
router.get("/generate-username", generateUsernameAPI); // 사용자명 자동 생성

// 시스템 상태 확인
router.get("/health", healthCheck);

// ==============================================
// 인증이 필요한 라우트들 (Protected Routes)
// ==============================================

// 세션 관리
router.post("/logout", requireAuth, logout); // 로그아웃
router.get("/session", requireAuth, checkSession); // 세션 상태 확인

// 프로필 관리
router.get("/profile", requireAuth, getProfile); // 프로필 조회
router.put("/profile", requireAuth, updateProfile); // 프로필 이미지 업데이트
router.put("/update-username", requireAuth, updateUsername); // 사용자명 변경

//비밀번호 변경 (로그인된 사용자)
router.put("/change-password", requireAuth, changePassword); // 현재 비밀번호로 새 비밀번호 설정

// ==============================================
// 관리자 권한 라우트들 (Admin Only Routes)
// ==============================================

// 사용자 관리
router.get("/users", requireAdmin, getAllUsers); // 전체 사용자 목록 조회

export default router;
