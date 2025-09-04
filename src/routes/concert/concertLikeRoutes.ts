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
 * @route GET /concert/like/status/:id
 * @desc 콘서트 좋아요 상태 확인
 * @access Private (인증 필요)
 */
router.get("/like/status/:id", requireAuth, getLikeStatus);

/**
 * @route POST /concert/like/:id
 * @desc 콘서트 좋아요 추가
 * @access Private (인증 필요)
 */
router.post("/like/:id", requireAuth, addLike);

/**
 * @route DELETE /concert/like/:id
 * @desc 콘서트 좋아요 삭제
 * @access Private (인증 필요)
 */
router.delete("/like/:id", requireAuth, removeLike);

export default router;
