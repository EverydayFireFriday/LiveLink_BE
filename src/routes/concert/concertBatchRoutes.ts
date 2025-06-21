import express from "express";
import {
  batchUploadConcerts,
  batchUpdateConcerts,
  batchDeleteConcerts,
  batchLikeConcerts,
} from "../../controllers/concert/concertBatchController";
import {
  requireAuth,
  requireAdmin,
} from "../../middlewares/auth/authMiddleware";

const router = express.Router();

/**
 * @route POST /concert/batch
 * @desc 여러 콘서트 일괄 등록 (성능 최적화)
 * @access Private (관리자 권한 필요)
 */
router.post("/batch", requireAdmin, batchUploadConcerts);

/**
 * @route PUT /concert/batch
 * @desc 여러 콘서트 일괄 수정 (성능 최적화)
 * @access Private (관리자 권한 필요)
 */
router.put("/batch", requireAdmin, batchUpdateConcerts);

/**
 * @route DELETE /concert/batch
 * @desc 여러 콘서트 일괄 삭제 (성능 최적화)
 * @access Private (관리자 권한 필요)
 */
router.delete("/batch", requireAdmin, batchDeleteConcerts);

/**
 * @route POST /concert/batch/like
 * @desc 여러 콘서트 일괄 좋아요 처리 (성능 최적화)
 * @access Private (인증 필요)
 */
router.post("/batch/like", requireAuth, batchLikeConcerts);

export default router;
