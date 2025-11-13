import express from 'express';
import { RegistrationController } from '../../controllers/auth/registrationController';
import { requireNoAuth } from '../../middlewares/auth/authMiddleware';

const router = express.Router();
const registrationController = new RegistrationController();

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

/**
 * @swagger
 * /auth/send-verification-email:
 *   post:
 *     summary: 이메일 인증 코드 발송
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

  requireNoAuth,
  (req, res) => void registrationController.sendVerificationEmail(req, res),
);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: 이메일 인증 확인
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

  requireNoAuth,
  (req, res) => void registrationController.verifyEmail(req, res),
);

/**
 * @swagger
 * /auth/complete-registration:
 *   post:
 *     summary: 회원가입 완료
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
 *               - termsConsents
 *             properties:
 *               verificationToken:
 *                 type: string
 *                 description: 이메일 인증 완료 후 받은 토큰
 *                 example: "a1b2c3d4..."
 *               password:
 *                 type: string
 *                 description: 비밀번호 (8자 이상, 영문/숫자/특수문자 조합)
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
 *               termsConsents:
 *                 type: array
 *                 description: 약관 동의 목록 (필수 terms, privacy / 선택 marketing)
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - isAgreed
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [terms, privacy, marketing]
 *                       description: 약관 타입
 *                     isAgreed:
 *                       type: boolean
 *                       description: 동의 여부
 *                     version:
 *                       type: string
 *                       description: 약관 버전 (선택, 없으면 현재 버전 사용)
 *           example:
 *             verificationToken: "a1b2c3d4..."
 *             password: "password123!"
 *             name: "홍길동"
 *             birthDate: "1990-01-01"
 *             username: "내별명"
 *             profileImage: "https://example.com/profile.jpg"
 *             termsConsents:
 *               - type: "terms"
 *                 isAgreed: true
 *                 version: "1.0.0"
 *               - type: "privacy"
 *                 isAgreed: true
 *                 version: "1.0.0"
 *               - type: "marketing"
 *                 isAgreed: false
 *                 version: "1.0.0"
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
 *                         notificationPreference:
 *                           $ref: '#/components/schemas/NotificationPreference'
 *                           description: |
 *                             알림 설정 (자동 설정됨)
 *                             - 티켓 오픈 알림: 10분, 30분, 1시간, 하루 전
 *                             - 공연 시작 알림: 1시간, 3시간, 하루 전
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: 계정 생성일
 *       400:
 *         description: 잘못된 요청 (필수 필드 누락, 유효성 검증 실패 등)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_fields:
 *                       value: "필수 정보가 누락되었습니다."
 *                     terms_required:
 *                       value: "서비스 이용약관에 동의해야 합니다."
 *                     privacy_required:
 *                       value: "개인정보처리방침에 동의해야 합니다."
 *       401:
 *         description: 유효하지 않거나 만료된 인증 토큰
 *       409:
 *         description: 이미 사용 중인 이메일 또는 사용자명
 *       500:
 *         description: 서버 에러
 */
router.post(
  '/complete-registration',

  requireNoAuth,
  (req, res) => void registrationController.completeRegistration(req, res),
);

export default router;
