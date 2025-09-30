import express from 'express';
import { getTermsAndConditions } from '../../controllers/terms/termsController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Terms
 *   description: 약관 및 정책 관련 API
 * /terms:
 *   get:
 *     summary: 서비스 약관 및 정책 조회
 *     tags: [Terms]
 *     description: 현재 서비스의 약관 및 정책 내용을 조회합니다.
 *     responses:
 *       200:
 *         description: 약관 및 정책 내용 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 termsAndConditions:
 *                   type: string
 *                   description: 서비스 약관 및 정책 내용
 *                   example: "이용약관: 본 서비스는..."
 *       500:
 *         description: 서버 오류
 */
router.get('/', getTermsAndConditions);

export default router;
