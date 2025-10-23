import express from 'express';
import { PasswordController } from '../../controllers/auth/passwordController';
import { requireAuth } from '../../middlewares/auth/authMiddleware';

const router = express.Router();
const passwordController = new PasswordController();

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: 비밀번호 재설정 요청
 *     description: 이메일을 통한 비밀번호 재설정 인증 코드를 발송합니다.
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 비밀번호를 재설정할 이메일 주소
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 요청 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "비밀번호 재설정 인증 코드가 이메일로 전송되었습니다."
 *                 email:
 *                   type: string
 *                   description: 인증 코드가 전송된 이메일
 *                 expiresIn:
 *                   type: string
 *                   description: 인증 코드 만료 시간
 *                   example: "5분"
 *       400:
 *         description: 잘못된 요청 (유효성 검증 실패)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "올바른 이메일 주소를 입력해주세요."
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "해당 이메일로 등록된 사용자를 찾을 수 없습니다."
 *       429:
 *         description: 너무 빈번한 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "비밀번호 재설정 요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "서버 에러가 발생했습니다."
 */
// 비밀번호 재설정 (로그인 없이)
router.post('/reset-password', passwordController.resetPasswordRequest);
/**
 * @swagger
 * /auth/verify-reset-password:
 *   post:
 *     summary: 비밀번호 재설정 인증 및 새 비밀번호 설정
 *     description: 인증 코드를 확인하고 새로운 비밀번호로 재설정합니다.
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - verificationCode
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 비밀번호를 재설정할 이메일 주소
 *                 example: "user@example.com"
 *               verificationCode:
 *                 type: string
 *                 description: 이메일로 받은 인증 코드
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 description: 새로운 비밀번호
 *                 example: "newPassword123!"
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "비밀번호가 성공적으로 재설정되었습니다."
 *       400:
 *         description: 잘못된 요청 (유효성 검증 실패)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_fields:
 *                       value: "모든 필드를 입력해주세요."
 *                     invalid_email:
 *                       value: "올바른 이메일 주소를 입력해주세요."
 *                     invalid_password:
 *                       value: "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 포함해야 합니다."
 *       401:
 *         description: 인증 코드 불일치
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "인증 코드가 일치하지 않습니다."
 *       410:
 *         description: 인증 코드 만료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "인증 코드가 만료되었습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "서버 에러가 발생했습니다."
 */
router.post('/verify-reset-password', passwordController.verifyResetPassword);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: 비밀번호 변경 (로그인 상태)
 *     description: 로그인된 사용자가 현재 비밀번호를 확인한 후 새 비밀번호로 변경합니다.
 *     tags: [Password]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: 현재 비밀번호
 *                 example: "currentPassword123"
 *               newPassword:
 *                 type: string
 *                 description: 새로운 비밀번호
 *                 example: "newPassword123!"
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "비밀번호가 성공적으로 변경되었습니다."
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_fields:
 *                       value: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요."
 *                     invalid_password:
 *                       value: "새 비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 포함해야 합니다."
 *                     same_password:
 *                       value: "새 비밀번호는 현재 비밀번호와 달라야 합니다."
 *       401:
 *         description: 현재 비밀번호 불일치 또는 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "현재 비밀번호가 일치하지 않습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "서버 에러가 발생했습니다."
 */
// 비밀번호 변경 (로그인 필요)
router.put('/change-password', requireAuth, passwordController.changePassword);

export default router;
