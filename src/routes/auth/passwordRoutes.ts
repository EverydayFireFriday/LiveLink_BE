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
 *                   example: "3분"
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
router.post(
  '/reset-password',

  passwordController.resetPasswordRequest,
);
/**
 * @swagger
 * /auth/verify-reset-code:
 *   post:
 *     summary: 비밀번호 재설정 인증 코드 검증 (1단계)
 *     description: 이메일로 받은 인증 코드를 검증하고 비밀번호 재설정 토큰을 발급합니다.
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 비밀번호를 재설정할 이메일 주소
 *                 example: "user@example.com"
 *               verificationCode:
 *                 type: string
 *                 description: 이메일로 받은 6자리 인증 코드
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 인증 코드 검증 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "인증 코드가 확인되었습니다. 새 비밀번호를 설정해주세요."
 *                 resetToken:
 *                   type: string
 *                   description: 비밀번호 재설정 토큰 (3분 유효)
 *                   example: "abc123def456"
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 코드 불일치
 *       410:
 *         description: 인증 코드 만료
 *       500:
 *         description: 서버 에러
 */
router.post(
  '/verify-reset-code',

  passwordController.verifyResetCode,
);

/**
 * @swagger
 * /auth/reset-password-with-token:
 *   post:
 *     summary: 비밀번호 재설정 (2단계)
 *     description: 인증 후 발급받은 토큰으로 새 비밀번호를 설정합니다.
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - resetToken
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 비밀번호를 재설정할 이메일 주소
 *                 example: "user@example.com"
 *               resetToken:
 *                 type: string
 *                 description: 인증 코드 검증 후 받은 리셋 토큰
 *                 example: "abc123def456"
 *               newPassword:
 *                 type: string
 *                 description: 새로운 비밀번호 (8자 이상, 영문/숫자/특수문자 포함)
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
 *         description: 잘못된 요청
 *       401:
 *         description: 유효하지 않은 토큰
 *       410:
 *         description: 토큰 만료
 *       500:
 *         description: 서버 에러
 */
router.post(
  '/reset-password-with-token',

  passwordController.resetPasswordWithToken,
);

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
router.put(
  '/change-password',

  requireAuth,
  passwordController.changePassword,
);

export default router;
