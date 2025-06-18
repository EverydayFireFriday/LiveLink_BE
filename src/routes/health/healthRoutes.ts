import express from "express";
import {
  basicHealthCheck,
  detailedHealthCheck,
  redisHealthCheck,
  databaseHealthCheck,
  readinessCheck,
  livenessCheck,
} from "../../controllers/health/healthController";
import { requireAdmin } from "../../middlewares/auth/adminMiddleware";

const router = express.Router();

/**
 * @route GET /health
 * @desc 기본 서버 상태 확인
 * @access Admin only
 */
router.get("/", requireAdmin, basicHealthCheck);

/**
 * @route GET /health/detailed
 * @desc 상세 서버 상태 확인 (모든 서비스)
 * @access Admin only
 */
router.get("/detailed", requireAdmin, detailedHealthCheck);

/**
 * @route GET /health/redis
 * @desc Redis 연결 상태 확인
 * @access Admin only
 */
router.get("/redis", requireAdmin, redisHealthCheck);

/**
 * @route GET /health/database
 * @desc 데이터베이스 연결 상태 확인
 * @access Admin only
 */
router.get("/database", requireAdmin, databaseHealthCheck);

/**
 * @route GET /health/readiness
 * @desc 서비스 준비 상태 확인 (Kubernetes Readiness Probe)
 * @access Admin only
 */
router.get("/readiness", requireAdmin, readinessCheck);

/**
 * @route GET /health/liveness
 * @desc 서비스 생존 상태 확인 (Kubernetes Liveness Probe)
 * @access Admin only
 */
router.get("/liveness", requireAdmin, livenessCheck);

export default router;
