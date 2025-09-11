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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve terms and conditions."
 */
import { Request, Response } from 'express';
import { TERMS_AND_CONDITIONS } from '../../config/terms/termsAndConditions';

export const getTermsAndConditions = (req: Request, res: Response) => {
  try {
    return res.status(200).json({ termsAndConditions: TERMS_AND_CONDITIONS });
  } catch (error) {
    console.error('Error fetching terms and conditions:', error);
    return res
      .status(500)
      .json({ message: 'Failed to retrieve terms and conditions.' });
  }
};
