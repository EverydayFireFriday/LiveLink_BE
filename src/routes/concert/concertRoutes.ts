import express from "express";
import {
  uploadConcert,
  getConcert,
  getAllConcerts,
  updateConcert,
  deleteConcert,
} from "../../controllers/concert/concertController";
import { requireAuth, requireAdmin } from "../../middlewares/auth/authMiddleware";

const router = express.Router();

/**
 * @route POST /concert
 * @desc 콘서트 정보 업로드
 * @access Private (인증 필요)
 */
router.post("/", requireAuth, uploadConcert);

/**
 * @route GET /concert
 * @desc 콘서트 목록 조회 (페이지네이션, 필터링, 정렬 지원)
 * @access Public
 */
router.get("/", getAllConcerts);

/**
 * @route GET /concert/:id
 * @desc 특정 콘서트 정보 조회
 * @access Public
 */
router.get("/:id", getConcert);

/**
 * @route PUT /concert/:id
 * @desc 콘서트 정보 수정
 * @access Private (인증 필요)
 */
router.put("/:id", requireAuth, updateConcert);

/**
 * @route DELETE /concert/:id
 * @desc 콘서트 삭제
 * @access Private (인증 필요)
 */
router.delete("/:id", requireAuth, deleteConcert);

export default router;
