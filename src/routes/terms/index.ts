import express from 'express';
import {
  getAllPolicies,
  getPolicyByType,
} from '../../controllers/terms/termsController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Terms
 *   description: 약관 및 정책 관련 API
 */

/**
 * @swagger
 * /terms:
 *   get:
 *     summary: 모든 약관 및 정책 조회
 *     tags: [Terms]
 *     description: 모든 약관 및 정책 문서를 조회합니다 (이용약관, 개인정보처리방침 등)
 *     responses:
 *       200:
 *         description: 약관 및 정책 내용 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "약관을 성공적으로 조회했습니다."
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [terms, privacy, marketing]
 *                         description: 약관 타입
 *                       version:
 *                         type: string
 *                         example: "1.0.0"
 *                       title:
 *                         type: string
 *                         example: "stagelives 서비스 이용약관"
 *                       content:
 *                         type: string
 *                         description: 약관 내용 (Markdown 형식)
 *                       required:
 *                         type: boolean
 *                         description: 필수 동의 여부
 *                       effectiveDate:
 *                         type: string
 *                         format: date
 *                         example: "2025-08-28"
 *       500:
 *         description: 서버 오류
 */
router.get('/', getAllPolicies);

/**
 * @swagger
 * /terms/{type}:
 *   get:
 *     summary: 특정 타입의 약관 조회
 *     tags: [Terms]
 *     description: 특정 타입의 약관 문서를 조회합니다
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [terms, privacy, marketing]
 *         description: 약관 타입 (terms=이용약관, privacy=개인정보처리방침, marketing=마케팅)
 *     responses:
 *       200:
 *         description: 약관 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "약관을 성공적으로 조회했습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: "terms"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     title:
 *                       type: string
 *                       example: "stagelives 서비스 이용약관"
 *                     content:
 *                       type: string
 *                       description: 약관 내용
 *                     required:
 *                       type: boolean
 *                       example: true
 *                     effectiveDate:
 *                       type: string
 *                       example: "2025-08-28"
 *       400:
 *         description: 유효하지 않은 약관 타입
 *       500:
 *         description: 서버 오류
 */
router.get('/:type', getPolicyByType);

export default router;
