import express from "express";
import {
  uploadConcert,
  getConcert,
  getAllConcerts,
  updateConcert,
  deleteConcert,
} from "../controllers/concertController";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Concerts
 *   description: 콘서트 관리 API
 */

// === 인증이 불필요한 라우트들 ===

/**
 * 모든 콘서트 목록 조회 (페이지네이션, 필터링 지원)
 * GET /api/concert
 * 누구나 콘서트 목록을 볼 수 있음
 */
router.get("/", getAllConcerts);

/**
 * 특정 콘서트 조회
 * GET /api/concert/:id
 * 누구나 콘서트 상세 정보를 볼 수 있음
 */
router.get("/:id", getConcert);

// === 인증이 필요한 라우트들 ===

/**
 * 콘서트 업로드
 * POST /api/concert
 * 로그인된 사용자만 콘서트를 업로드할 수 있음
 */
router.post("/", requireAuth, uploadConcert);

/**
 * 콘서트 정보 수정
 * PUT /api/concert/:id
 * 로그인된 사용자만 (본인이 업로드한 콘서트 또는 관리자)
 */
router.put("/:id", requireAuth, updateConcert);

/**
 * 콘서트 삭제
 * DELETE /api/concert/:id
 * 로그인된 사용자만 (본인이 업로드한 콘서트 또는 관리자)
 */
router.delete("/:id", requireAuth, deleteConcert);

export default router;