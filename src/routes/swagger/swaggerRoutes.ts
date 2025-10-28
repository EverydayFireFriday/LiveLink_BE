import express from 'express';
import { getSwaggerJson } from '../../controllers/swagger/swaggerController';
import { relaxedLimiter } from '../../middlewares/security/rateLimitMiddleware';

const router = express.Router();

// Swagger JSON 다운로드 API에 relaxedLimiter 적용
router.use(relaxedLimiter);

/**
 * @swagger
 * /swagger-json:
 *   get:
 *     summary: Swagger JSON 다운로드
 *     description: API 명세가 담긴 Swagger JSON 파일을 다운로드합니다.
 *     tags: [Swagger]
 *     responses:
 *       200:
 *         description: Swagger JSON 파일
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/', getSwaggerJson);

export default router;
