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

  // 🆕 새로 추가된 이메일 서비스 관련 함수들
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

// 비밀번호 변경 (로그인된 사용자)
router.put("/change-password", requireAuth, changePassword); // 현재 비밀번호로 새 비밀번호 설정

// 관리자 권한 확인 (로그인된 사용자)
router.get("/admin-status", requireAuth, checkAdminStatus); // 현재 사용자의 관리자 권한 확인

// ==============================================
// 관리자 권한 라우트들 (Admin Only Routes)
// ==============================================

// 사용자 관리
router.get("/users", requireAdmin, getAllUsers); // 전체 사용자 목록 조회

// 관리자 관리
router.get("/admins", requireAdmin, getAdminList); // 관리자 목록 조회

// ==============================================
// 새로 추가된 이메일 서비스 관련 라우트들
// ==============================================

// 이메일 서비스 상태 확인 (관리자)
router.get("/email-service/status", requireAdmin, checkEmailServiceStatus);

// 이메일 템플릿 미리보기 (관리자)
router.get("/email-service/preview", requireAdmin, previewEmailTemplate);

// Redis 정리 작업 (관리자)
router.post("/cleanup-expired", requireAdmin, async (req, res) => {
  try {
    await cleanupExpiredCodes();
    res.status(200).json({
      message: "만료된 인증 코드 정리 작업이 완료되었습니다.",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("정리 작업 에러:", error);
    res.status(500).json({ message: "정리 작업 실패" });
  }
});

// API 정보 (Public)
router.get("/info", (req, res) => {
  res.status(200).json({
    service: "LiveLink Authentication API",
    version: "2.0.0 - Email Template System",
    description: "Redis 기반 세션 관리와 이메일 인증 시스템",
    features: {
      authentication: [
        "bcrypt 비밀번호 해싱",
        "Redis 세션 관리", 
        "자동 사용자명 생성",
        "이메일 형식 검증"
      ],
      emailVerification: [
        "회원가입 이메일 인증",
        "비밀번호 재설정",
        "환영 이메일 자동 발송",
        "보안 알림 시스템"
      ],
      emailTemplates: [
        "반응형 HTML 템플릿",
        "브랜드 디자인 적용",
        "다크모드 지원",
        "모바일 최적화"
      ],
      security: [
        "3분 TTL 인증 코드",
        "스팸 방지 (1분 쿨다운)",
        "IP 추적 및 로깅",
        "자동 보안 알림"
      ]
    },
    endpoints: {
      auth: {
        basic: [
          "POST /auth/register - 직접 회원가입",
          "POST /auth/login - 로그인",
          "POST /auth/logout - 로그아웃",
          "GET  /auth/session - 세션 확인"
        ],
        emailBased: [
          "POST /auth/register-request - 이메일 인증 회원가입 요청",
          "POST /auth/verify-register - 이메일 인증 회원가입 완료",
          "POST /auth/reset-password - 비밀번호 재설정 요청",
          "POST /auth/verify-reset-password - 비밀번호 재설정 완료"
        ],
        profile: [
          "GET  /auth/profile - 프로필 조회",
          "PUT  /auth/profile - 프로필 업데이트",
          "PUT  /auth/update-username - 별명 변경",
          "PUT  /auth/change-password - 비밀번호 변경"
        ],
        utilities: [
          "GET  /auth/generate-username - 사용자명 자동 생성",
          "POST /auth/check-username - 별명 중복 확인",
          "POST /auth/verification-status - 인증 상태 확인",
          "POST /auth/cancel-verification - 인증 취소"
        ]
      },
      system: [
        "GET /auth/health - 시스템 상태 확인",
        "GET /auth/email-service/status - 이메일 서비스 상태 (관리자)",
        "GET /auth/email-service/preview - 템플릿 미리보기 (관리자)",
        "GET /auth/users - 사용자 목록 (관리자)",
        "POST /auth/cleanup-expired - Redis 정리 (관리자)"
      ]
    },
    technologies: {
      backend: ["Node.js", "Express", "TypeScript"],
      database: ["MongoDB", "Redis"],
      security: ["bcrypt", "express-session"],
      email: ["Nodemailer", "Gmail SMTP"],
      templates: ["HTML5", "CSS3", "Responsive Design"]
    },
    timestamp: new Date().toISOString()
  });
});

export default router;