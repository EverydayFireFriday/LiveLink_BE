import express from 'express';
import {
  basicHealthCheck,
  detailedHealthCheck,
  redisHealthCheck,
  databaseHealthCheck,
  readinessCheck,
  livenessCheck,
  getSwaggerJson,
} from '../../controllers/health/healthController';
import { requireAdmin } from '../../middlewares/auth/adminMiddleware';

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 기본 서버 상태 확인
 *     description: 서버가 정상적으로 실행 중인지 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 서버 정상 작동
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 message:
 *                   type: string
 *                   example: "서버가 정상적으로 작동 중입니다."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: string
 *                   example: "2시간 30분 45초"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
router.get('/', requireAdmin, basicHealthCheck);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: 상세 서버 상태 확인
 *     description: 서버, 데이터베이스, Redis 등 모든 서비스의 상태를 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 모든 서비스 정상
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 services:
 *                   type: object
 *                   properties:
 *                     server:
 *                       type: object
 *                       properties:
 *                         status: { type: "string", example: "healthy" }
 *                         uptime: { type: "string" }
 *                         memory: { type: "object" }
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status: { type: "string", example: "healthy" }
 *                         connected: { type: "boolean" }
 *                     databases:
 *                       type: object
 *                       properties:
 *                         concert: { type: "object" }
 *       503:
 *         description: 일부 서비스 문제 발생
 */
router.get('/detailed', requireAdmin, detailedHealthCheck);

/**
 * @swagger
 * /health/redis:
 *   get:
 *     summary: Redis 연결 상태 확인
 *     description: Redis 서버의 연결 상태와 성능을 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Redis 정상 작동
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 connected:
 *                   type: boolean
 *                   example: true
 *                 responseTime:
 *                   type: string
 *                   example: "2ms"
 *       503:
 *         description: Redis 연결 실패
 */
router.get('/redis', requireAdmin, redisHealthCheck);

/**
 * @swagger
 * /health/database:
 *   get:
 *     summary: 데이터베이스 연결 상태 확인
 *     description: MongoDB 데이터베이스의 연결 상태와 성능을 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 데이터베이스 정상 작동
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 databases:
 *                   type: object
 *                   properties:
 *                     concert:
 *                       type: object
 *                       properties:
 *                         status: { type: "string", example: "healthy" }
 *                         responseTime: { type: "string", example: "15ms" }
 *                         totalConcerts: { type: "number", example: 1250 }
 *       503:
 *         description: 데이터베이스 연결 실패
 */
router.get('/database', requireAdmin, databaseHealthCheck);

/**
 * @swagger
 * /health/readiness:
 *   get:
 *     summary: 서비스 준비 상태 확인 (Kubernetes Readiness Probe)
 *     description: 서비스가 트래픽을 받을 준비가 되었는지 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 서비스 준비 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "서비스가 트래픽을 받을 준비가 되었습니다."
 *       503:
 *         description: 서비스 준비 미완료
 */
router.get('/readiness', requireAdmin, readinessCheck);

/**
 * @swagger
 * /health/liveness:
 *   get:
 *     summary: 서비스 생존 상태 확인 (Kubernetes Liveness Probe)
 *     description: 서비스가 살아있는지 확인합니다. 실패 시 재시작이 필요할 수 있습니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 서비스 정상 작동
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "서비스가 정상적으로 작동 중입니다."
 *       503:
 *         description: 서비스 문제 발생
 */
router.get('/liveness', requireAdmin, livenessCheck);

/**
 * @swagger
 * /health/swagger.json:
 *   get:
 *     summary: Swagger JSON 다운로드
 *     description: API 명세가 담긴 Swagger JSON 파일을 다운로드합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Swagger JSON 파일
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/swagger.json', getSwaggerJson);

export default router;
