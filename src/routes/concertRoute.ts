import express from "express";
import {
  uploadConcert,
  getConcert,
  getAllConcerts,
  updateConcert,
  deleteConcert,
} from "../controllers/concertController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Concerts
 *   description: 콘서트 관리 API
 */

/**
 * 콘서트 업로드
 * POST /api/concert
 */
router.post("/", uploadConcert);

/**
 * 모든 콘서트 목록 조회 (페이지네이션, 필터링 지원)
 * GET /api/concert
 */
router.get("/", getAllConcerts);

/**
 * 특정 콘서트 조회
 * GET /api/concert/:id
 */
router.get("/:id", getConcert);

/**
 * 콘서트 정보 수정
 * PUT /api/concert/:id
 */
router.put("/:id", updateConcert);

/**
 * 콘서트 삭제
 * DELETE /api/concert/:id
 */
router.delete("/:id", deleteConcert);

export default router;