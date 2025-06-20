import express from "express";
import {
  getLikeStatus,
  addLike,
  removeLike,
  getLikedConcerts,
} from "../../controllers/concert/concertLikeController";
import { requireAuth, requireAdmin } from "../../middlewares/auth/authMiddleware";

const router = express.Router();

/**
 * @route GET /concert/liked
 * @desc 사용자가 좋아요한 콘서트 목록 조회
 * @access Private (인증 필요)
 */
router.get("/liked", requireAuth, getLikedConcerts);

/**
 * @route GET /concert/:id/like/status
 * @desc 콘서트 좋아요 상태 확인
 * @access Private (인증 필요)
 */
router.get("/:id/like/status", requireAuth, getLikeStatus);

/**
 * @route POST /concert/:id/like
 * @desc 콘서트 좋아요 추가
 * @access Private (인증 필요)
 */
router.post("/:id/like", requireAuth, addLike);

/**
 * @route DELETE /concert/:id/like
 * @desc 콘서트 좋아요 삭제
 * @access Private (인증 필요)
 */
router.delete("/:id/like", requireAuth, removeLike);

export default router;
