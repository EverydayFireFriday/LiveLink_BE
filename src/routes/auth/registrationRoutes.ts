import express from 'express';
import { signupLimiter } from '../../middlewares/security/rateLimitMiddleware';
import { RegistrationController } from '../../controllers/auth/registrationController';
import { requireNoAuth } from '../../middlewares/auth/authMiddleware';

const router = express.Router();
const registrationController = new RegistrationController();

/**
 * @swagger
 * /auth/register-request:
 *   post:
 *     summary: 회원가입 이메일 인증 요청
 *     description: 회원가입을 위한 이메일 인증 코드를 전송합니다. 사용자명이 제공되지 않으면 자동으로 생성됩니다.
 *     tags: [Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - birthDate
 *               - isTermsAgreed
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 사용자 이메일 주소
 *                 example: "user@example.com"
 *               username:
 *                 type: string
 *                 description: 사용자명 (선택사항, 비어있으면 자동 생성)
 *                 example: "내별명"
 *                 minLength: 2
 *                 maxLength: 20
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *                 example: "password123!"
 *                 minLength: 8
 *               name:
 *                 type: string
 *                 description: 실명 (한글 또는 영문)
 *                 example: "홍길동"
 *                 minLength: 2
 *                 maxLength: 50
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 description: 생년월일 (YYYY-MM-DD 형식)
 *                 example: "1990-01-01"
 *               profileImage:
 *                 type: string
 *                 description: 프로필 이미지 URL (선택사항)
 *                 example: "https://example.com/profile.jpg"
 *               isTermsAgreed:
 *                  type: boolean
 *                  description: 서비스 이용약관 동의 여부 (필수)
 *                  example: true
 *
 *     responses:
 *       200:
 *         description: 인증 코드 전송 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "회원가입 인증 코드가 이메일로 전송되었습니다."
 *                 email:
 *                   type: string
 *                   description: 인증 코드가 전송된 이메일
 *                 username:
 *                   type: string
 *                   description: 최종 확정된 사용자명
 *                 usernameGenerated:
 *                   type: boolean
 *                   description: 사용자명이 자동 생성되었는지 여부
 *                 redisKey:
 *                   type: string
 *                   description: Redis 키 (내부 사용)
 *                 expiresIn:
 *                   type: string
 *                   example: "3분"
 *                   description: 인증 코드 유효 시간
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
 *                     invalid_email:
 *                       value: "올바른 이메일 주소를 입력해주세요."
 *                     invalid_password:
 *                       value: "비밀번호는 8자 이상이어야 합니다."
 *                     email_exists:
 *                       value: "이미 사용 중인 이메일입니다."
 *                     username_exists:
 *                       value: "이미 사용 중인 별명입니다."
 *                 suggestion:
 *                   type: string
 *                   description: 사용자명 중복 시 제안 메시지
 *                   example: "자동 생성을 원하시면 별명을 비워두세요."
 *       429:
 *         description: 요청 제한 초과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "너무 빈번한 요청입니다. 1분 후에 다시 시도해주세요."
 *                 retryAfter:
 *                   type: number
 *                   example: 60
 *                   description: 재시도 가능한 시간(초)
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
 *                     email_failed:
 *                       value: "이메일 전송에 실패했습니다. 다시 시도해주세요."
 *                     server_error:
 *                       value: "이메일 전송 실패"
 *                 error:
 *                   type: string
 *                   description: 상세 에러 정보
 */
// 회원가입 관련
router.post(
  '/register-request',
  signupLimiter,
  requireNoAuth,
  (req, res) => void registrationController.registerRequest(req, res),
);
/**
 * @swagger
 * /auth/verify-register:
 *   post:
 *     summary: 회원가입 이메일 인증 완료
 *     description: 이메일로 받은 인증 코드를 확인하여 회원가입을 완료합니다.
 *     tags: [Registration]
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
 *                 description: 인증받을 이메일 주소
 *                 example: "user@example.com"
 *               verificationCode:
 *                 type: string
 *                 description: 이메일로 받은 인증 코드
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "이메일 인증이 완료되어 회원가입이 성공했습니다!"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 새로 생성된 사용자 ID
 *                     email:
 *                       type: string
 *                       description: 사용자 이메일
 *                     username:
 *                       type: string
 *                       description: 사용자명
 *                     profileImage:
 *                       type: string
 *                       description: 프로필 이미지 URL
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 계정 생성일
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
 *                       value: "이메일과 인증 코드를 입력해주세요."
 *                     no_user_data:
 *                       value: "사용자 데이터가 없습니다. 다시 회원가입을 시도해주세요."
 *                     email_exists:
 *                       value: "이미 사용 중인 이메일입니다."
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
 *                   example: "인증 코드가 만료되었거나 존재하지 않습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "서버 에러로 회원가입 실패"
 */
router.post(
  '/verify-register',
  signupLimiter,
  requireNoAuth,
  (req, res) => void registrationController.verifyRegister(req, res),
);

// 사용자명 관련
/**
 * @swagger
 * /auth/generate-username:
 *   get:
 *     summary: 사용자명 자동 생성
 *     description: 이메일 주소를 기반으로 사용 가능한 사용자명을 자동 생성합니다.
 *     tags: [Registration]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: 기준이 될 이메일 주소
 *         example: "user@example.com"
 *       - in: query
 *         name: base
 *         schema:
 *           type: string
 *         description: 기본값으로 사용할 문자열 (선택사항)
 *         example: "nickname"
 *     responses:
 *       200:
 *         description: 사용자명 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자명이 성공적으로 생성되었습니다."
 *                 username:
 *                   type: string
 *                   description: 생성된 사용자명
 *                   example: "user123"
 *                 available:
 *                   type: boolean
 *                   example: true
 *                   description: 사용 가능 여부
 *                 generatedFrom:
 *                   type: string
 *                   description: 생성 기준
 *                   examples:
 *                     from_email:
 *                       value: "이메일: user@example.com"
 *                     from_base:
 *                       value: "기본값: nickname"
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
 *                     missing_email:
 *                       value: "이메일을 입력해주세요."
 *                     invalid_email:
 *                       value: "올바른 이메일 주소를 입력해주세요."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자명 생성 실패"
 */
router.get(
  '/generate-username',
  (req, res) => void registrationController.generateUsername(req, res),
);
/**
 * @swagger
 * /auth/check-username:
 *   post:
 *     summary: 사용자명 중복 확인
 *     description: 입력한 사용자명이 사용 가능한지 확인합니다.
 *     tags: [Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 description: 확인할 사용자명
 *                 example: "내별명"
 *                 minLength: 2
 *                 maxLength: 20
 *     responses:
 *       200:
 *         description: 사용 가능한 사용자명
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용 가능한 별명입니다."
 *                 available:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: 사용자명 유효성 검증 실패 또는 중복
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     invalid_format:
 *                       value: "사용자명은 2-20자의 한글, 영문, 숫자만 가능합니다."
 *                     already_taken:
 *                       value: "이미 사용 중인 별명입니다."
 *                 available:
 *                   type: boolean
 *                   example: false
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "별명 중복 확인 실패"
 */
router.post(
  '/check-username',
  (req, res) => void registrationController.checkUsername(req, res),
);

// ============================================================
// 새로운 회원가입 플로우: 이메일 인증 먼저, 회원정보 입력은 나중에
// ============================================================

/**
 * @swagger
 * /auth/send-verification-email:
 *   post:
 *     summary: 이메일 인증 코드 발송 (새로운 플로우)
 *     description: 회원가입을 위한 이메일 인증 코드를 발송합니다. 이메일만 입력하면 인증 코드가 전송됩니다.
 *     tags: [Registration]
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
 *                 description: 인증받을 이메일 주소
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: 인증 코드 전송 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "인증 코드가 이메일로 전송되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     expiresIn:
 *                       type: string
 *                       example: "3분"
 *       400:
 *         description: 잘못된 요청
 *       409:
 *         description: 이미 사용 중인 이메일
 *       429:
 *         description: 요청 제한 초과
 *       500:
 *         description: 서버 에러
 */
router.post(
  '/send-verification-email',
  signupLimiter,
  requireNoAuth,
  (req, res) => void registrationController.sendVerificationEmail(req, res),
);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: 이메일 인증 확인 (새로운 플로우)
 *     description: 이메일로 받은 인증 코드를 확인하고, 인증 완료 토큰을 발급합니다. 이 토큰은 회원가입 완료 시 사용됩니다.
 *     tags: [Registration]
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
 *                 description: 인증받을 이메일 주소
 *                 example: "user@example.com"
 *               verificationCode:
 *                 type: string
 *                 description: 이메일로 받은 인증 코드
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 이메일 인증 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "이메일 인증이 완료되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     verificationToken:
 *                       type: string
 *                       description: 회원가입 완료 시 사용할 인증 토큰
 *                       example: "a1b2c3d4..."
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     expiresIn:
 *                       type: string
 *                       example: "10분"
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
  '/verify-email',
  signupLimiter,
  requireNoAuth,
  (req, res) => void registrationController.verifyEmail(req, res),
);

/**
 * @swagger
 * /auth/complete-registration:
 *   post:
 *     summary: 회원가입 완료 (새로운 플로우)
 *     description: 이메일 인증 완료 토큰과 나머지 회원 정보를 받아서 회원가입을 완료합니다.
 *     tags: [Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verificationToken
 *               - password
 *               - name
 *               - birthDate
 *               - isTermsAgreed
 *             properties:
 *               verificationToken:
 *                 type: string
 *                 description: 이메일 인증 완료 후 받은 토큰
 *                 example: "a1b2c3d4..."
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *                 example: "password123!"
 *                 minLength: 8
 *               name:
 *                 type: string
 *                 description: 실명 (한글 또는 영문)
 *                 example: "홍길동"
 *                 minLength: 2
 *                 maxLength: 50
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 description: 생년월일 (YYYY-MM-DD 형식)
 *                 example: "1990-01-01"
 *               username:
 *                 type: string
 *                 description: 사용자명 (선택사항, 비어있으면 자동 생성)
 *                 example: "내별명"
 *                 minLength: 2
 *                 maxLength: 20
 *               profileImage:
 *                 type: string
 *                 description: 프로필 이미지 URL (선택사항)
 *                 example: "https://example.com/profile.jpg"
 *               isTermsAgreed:
 *                 type: boolean
 *                 description: 서비스 이용약관 동의 여부 (필수)
 *                 example: true
 *               termsVersion:
 *                 type: string
 *                 description: 약관 버전 (선택사항, 없으면 현재 버전 사용)
 *                 example: "1.0.0"
 *     responses:
 *       201:
 *         description: 회원가입 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "회원가입이 완료되었습니다!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: 새로 생성된 사용자 ID
 *                         email:
 *                           type: string
 *                           description: 사용자 이메일
 *                         username:
 *                           type: string
 *                           description: 사용자명
 *                         profileImage:
 *                           type: string
 *                           description: 프로필 이미지 URL
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: 계정 생성일
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 유효하지 않거나 만료된 인증 토큰
 *       409:
 *         description: 이미 사용 중인 이메일 또는 사용자명
 *       500:
 *         description: 서버 에러
 */
router.post(
  '/complete-registration',
  signupLimiter,
  requireNoAuth,
  (req, res) => void registrationController.completeRegistration(req, res),
);

export default router;
