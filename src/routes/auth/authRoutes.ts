import express from 'express';
import { loginLimiter } from '../../middlewares/security/rateLimitMiddleware';
import {
  requireAuth,
  requireNoAuth,
} from '../../middlewares/auth/authMiddleware';

const router = express.Router();

// 지연 로딩으로 컨트롤러 생성
const getAuthController = async () => {
  const { AuthController } = await import(
    '../../controllers/auth/authController'
  );
  return new AuthController();
};

// 로그인/로그아웃
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 사용자 로그인
 *     description: 이메일과 비밀번호를 사용하여 사용자 인증을 수행하고 세션을 생성합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 사용자 이메일
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 description: 사용자 비밀번호
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "로그인 성공"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 사용자 ID
 *                     email:
 *                       type: string
 *                       description: 사용자 이메일
 *                     username:
 *                       type: string
 *                       description: 사용자명
 *                     profileImage:
 *                       type: string
 *                       description: 프로필 이미지 URL
 *                 sessionId:
 *                   type: string
 *                   description: 세션 ID
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
 *                     invalid_email:
 *                       value: "올바른 이메일 주소를 입력해주세요."
 *                     missing_password:
 *                       value: "비밀번호를 입력해주세요."
 *       401:
 *         description: 인증 실패 (잘못된 이메일 또는 비밀번호)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "이메일 또는 비밀번호가 일치하지 않습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "서버 에러로 로그인 실패"
 */
router.post('/login', loginLimiter, requireNoAuth, async (req, res) => {
  const authController = await getAuthController();
  await authController.login(req, res);
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 로그아웃
 *     description: 현재 세션을 종료하고 쿠키를 삭제합니다.
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "로그아웃 성공"
 *                 deletedSessionId:
 *                   type: string
 *                   description: 삭제된 세션 ID
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "로그아웃 실패"
 */
router.post('/logout', requireAuth, async (req, res) => {
  const authController = await getAuthController();
  authController.logout(req, res);
});

// 세션
/**
 * @swagger
 * /auth/session:
 *   get:
 *     summary: 로그인 상태 확인
 *     description: 현재 세션의 로그인 상태와 사용자 정보를 확인합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 세션 상태 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: 로그인된 상태
 *                   properties:
 *                     loggedIn:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                           description: 사용자 ID
 *                         email:
 *                           type: string
 *                           description: 사용자 이메일
 *                         username:
 *                           type: string
 *                           description: 사용자명
 *                         profileImage:
 *                           type: string
 *                           description: 프로필 이미지 URL
 *                     sessionId:
 *                       type: string
 *                       description: 세션 ID
 *                 - type: object
 *                   description: 로그인되지 않은 상태
 *                   properties:
 *                     loggedIn:
 *                       type: boolean
 *                       example: false
 *                     sessionId:
 *                       type: string
 *                       description: 세션 ID
 */
router.get('/session', async (req, res) => {
  const authController = await getAuthController();
  authController.checkSession(req, res);
});

// 회원탈퇴
/**
 * @swagger
 * /auth/account:
 *   delete:
 *     summary: 회원 탈퇴
 *     description: 현재 로그인된 사용자의 계정을 삭제합니다. 일반 로그인 사용자는 비밀번호 확인이 필요하며, 소셜 로그인 사용자는 비밀번호 없이 탈퇴 가능합니다.
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: 비밀번호 (일반 로그인 사용자만 필수)
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: 회원 탈퇴 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "회원 탈퇴가 완료되었습니다."
 *       400:
 *         description: 잘못된 요청 (비밀번호 미입력)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "비밀번호를 입력해주세요."
 *       401:
 *         description: 인증 실패 (로그인 필요 또는 비밀번호 불일치)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     not_authenticated:
 *                       value: "인증이 필요합니다."
 *                     wrong_password:
 *                       value: "비밀번호가 일치하지 않습니다."
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자를 찾을 수 없습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     deletion_failed:
 *                       value: "회원 탈퇴 처리에 실패했습니다."
 *                     server_error:
 *                       value: "서버 에러로 회원 탈퇴에 실패했습니다."
 */
router.delete('/account', requireAuth, async (req, res) => {
  const authController = await getAuthController();
  await authController.deleteAccount(req, res);
});

export default router;
