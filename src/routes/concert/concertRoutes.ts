import express from "express";
import {
  uploadConcert,
  getConcert,
  getAllConcerts,
  updateConcert,
  deleteConcert,
} from "../../controllers/concert/concertController";
import { requireAuth } from "../../middlewares/auth/authMiddleware";
import {
  requireAuthInProductionMiddleware,
  logSessionInfoMiddleware,
  getCurrentUserInfo,
} from "../../middlewares/auth/conditionalAuthMiddleware";

const router = express.Router();

// 개발환경에서 세션 정보 로깅 (선택사항)
if (process.env.NODE_ENV === "development") {
  router.use(logSessionInfoMiddleware);
}

// 콘서트 업로드 - 개발환경에서는 인증 스킵 (임시 세션 자동 생성)
router.post("/", requireAuthInProductionMiddleware, uploadConcert);

// 콘서트 목록 조회 - 인증 없이 가능
router.get("/", getAllConcerts);

// 특정 콘서트 조회 - 인증 없이 가능
router.get("/:id", getConcert);

// 콘서트 수정 - 항상 인증 필요
router.put("/:id", requireAuth, updateConcert);

// 콘서트 삭제 - 항상 인증 필요
router.delete("/:id", requireAuth, deleteConcert);

// 개발환경용 디버깅 라우트
if (process.env.NODE_ENV === "development") {
  // 현재 세션 정보 확인
  router.get("/dev/session", (req, res) => {
    const userInfo = getCurrentUserInfo(req);

    res.json({
      message: "개발환경 세션 정보",
      environment: process.env.NODE_ENV,
      sessionExists: !!req.session?.user,
      userInfo,
      rawSession: req.session?.user,
      timestamp: new Date().toISOString(),
    });
  });

  // 미들웨어 테스트 라우트
  router.get(
    "/dev/test-auth",
    requireAuthInProductionMiddleware,
    (req, res) => {
      res.json({
        message: "개발환경 인증 테스트 성공",
        userInfo: getCurrentUserInfo(req),
        middleware: "requireAuthInProductionMiddleware",
        timestamp: new Date().toISOString(),
      });
    }
  );
}

export default router;
