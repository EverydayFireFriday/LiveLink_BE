import express from 'express';
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
 *     description: |
 *       이메일과 비밀번호를 사용하여 사용자 인증을 수행하고 세션을 생성합니다.
 *
 *       **플랫폼별 세션 관리:**
 *       - 웹(web)과 앱(app)에서 각각 1개씩 총 2개의 세션을 동시에 유지할 수 있습니다.
 *       - 같은 플랫폼에 기존 세션이 있을 때:
 *         - force=false (기본값): 409 Conflict 반환 (기존 세션 정보 포함)
 *         - force=true: 기존 세션을 로그아웃하고 새로 로그인
 *
 *       **로그인 플로우:**
 *       1. 1차 시도 (force 없음 또는 false): 기존 세션이 있으면 409 반환
 *       2. 사용자가 "로그인 진행" 선택
 *       3. 2차 시도 (force=true): 기존 세션을 삭제하고 로그인 진행
 *
 *       **플랫폼 구분 방법:**
 *       - X-Platform 헤더로 플랫폼을 지정합니다 (필수 권장)
 *       - 헤더가 없으면 WEB 플랫폼으로 기본 설정됩니다 (세션 1일)
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: X-Platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [web, app]
 *           default: web
 *         description: |
 *           로그인 플랫폼 지정 (필수 권장)
 *           - web : 웹 플랫폼 (세션 유지: 1일)
 *           - app : 앱 플랫폼 (세션 유지: 30일)
 *           - 미지정 시: WEB 플랫폼으로 기본 설정
 *         example: "app"
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
 *               force:
 *                 type: boolean
 *                 description: |
 *                   기존 세션 강제 로그아웃 여부 (기본값: false)
 *                   - false: 기존 세션이 있으면 409 Conflict 반환
 *                   - true: 기존 세션을 삭제하고 새로 로그인
 *                 default: false
 *                 example: false
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
 *                     fcmToken:
 *                       type: string
 *                       description: FCM 푸시 알림 토큰
 *                       example: "dGVzdF90b2tlbl8xMjM0NTY3ODkw"
 *                     fcmTokenUpdatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: FCM 토큰 업데이트 시간
 *                       example: "2025-01-15T10:30:00Z"
 *                     notificationPreference:
 *                       $ref: '#/components/schemas/NotificationPreference'
 *                 sessionId:
 *                   type: string
 *                   description: 세션 ID
 *                 warning:
 *                   type: object
 *                   description: 이전 세션이 로그아웃된 경우 표시되는 경고 (선택적)
 *                   properties:
 *                     previousSessionTerminated:
 *                       type: boolean
 *                       description: 이전 세션이 종료되었는지 여부
 *                       example: true
 *                     message:
 *                       type: string
 *                       description: 사용자에게 표시할 경고 메시지
 *                       example: "이전에 로그인된 웹 세션이 로그아웃되었습니다."
 *                     terminatedDevice:
 *                       type: string
 *                       description: 로그아웃된 이전 기기명
 *                       example: "Chrome on Windows 10"
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
 *       409:
 *         description: 기존 세션 존재 (force=false인 경우)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "이미 다른 기기에서 웹 로그인이 되어 있습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     existingSession:
 *                       type: object
 *                       description: 기존 세션 정보
 *                       properties:
 *                         deviceName:
 *                           type: string
 *                           description: 로그인된 기기명
 *                           example: "Chrome on Windows 10"
 *                         platform:
 *                           type: string
 *                           description: 플랫폼
 *                           enum: [web, app]
 *                           example: "web"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: 세션 생성 시간
 *                           example: "2025-01-15T10:00:00Z"
 *                         lastActivityAt:
 *                           type: string
 *                           format: date-time
 *                           description: 마지막 활동 시간
 *                           example: "2025-01-15T12:30:00Z"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-01-15T12:35:00Z"
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
router.post('/login', requireNoAuth, async (req, res) => {
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
  await authController.logout(req, res);
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
  await authController.checkSession(req, res);
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

// 이메일 찾기
/**
 * @swagger
 * /auth/find-email:
 *   post:
 *     summary: 이메일 찾기
 *     description: 이름과 생년월일을 사용하여 가입된 이메일 주소를 찾습니다. 보안을 위해 이메일은 마스킹 처리되어 반환됩니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - birthDate
 *             properties:
 *               name:
 *                 type: string
 *                 description: 사용자 실명
 *                 example: "홍길동"
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 description: 생년월일 (YYYY-MM-DD 형식)
 *                 example: "1990-01-01"
 *     responses:
 *       200:
 *         description: 이메일 찾기 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "일치하는 계정 2개를 찾았습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                       description: 찾은 계정 수
 *                       example: 2
 *                     emails:
 *                       type: array
 *                       description: 마스킹 처리된 이메일 목록
 *                       items:
 *                         type: string
 *                       example: ["hong***@gmail.com", "h***@naver.com"]
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
 *                     missing_name:
 *                       value: "이름을 입력해주세요."
 *                     missing_birthDate:
 *                       value: "생년월일을 입력해주세요."
 *                     invalid_date:
 *                       value: "올바른 생년월일 형식이 아닙니다. (YYYY-MM-DD)"
 *       404:
 *         description: 일치하는 계정을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "일치하는 계정을 찾을 수 없습니다."
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "서버 에러로 이메일 찾기에 실패했습니다."
 */
router.post('/find-email', async (req, res) => {
  const authController = await getAuthController();
  await authController.findEmail(req, res);
});

// 세션 관리
/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: 활성 세션 목록 조회
 *     description: |
 *       현재 로그인한 사용자의 모든 활성 세션 목록을 조회합니다.
 *
 *       **멀티 플랫폼 세션 관리:**
 *       - 웹(web)과 앱(app)에서 각각 최대 1개씩 총 2개의 세션을 동시에 유지할 수 있습니다.
 *       - 같은 플랫폼에서 새로 로그인하면 이전 세션이 자동으로 로그아웃됩니다.
 *       - ⚠️ **중요**: 이전 기기에는 로그아웃 알림이 전송되지 않습니다.
 *
 *       **반환되는 정보:**
 *       - 디바이스 이름 (예: "Chrome on Windows", "iPhone (iOS 15.0)")
 *       - 플랫폼 (web 또는 app)
 *       - 세션 생성 시간, 마지막 활동 시간, 만료 시간
 *       - 현재 요청한 세션인지 여부 (isCurrent)
 *
 *       **사용 예시:**
 *       - 사용자가 "내 디바이스 관리" 화면에서 로그인된 기기 목록을 확인할 때
 *       - 의심스러운 로그인을 발견하고 특정 세션을 강제 종료할 때
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 세션 목록 조회 성공
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
 *                   example: "활성 세션 목록을 가져왔습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSessions:
 *                       type: number
 *                       description: 활성 세션 총 개수 (최대 2개)
 *                       example: 2
 *                     sessions:
 *                       type: array
 *                       description: 활성 세션 목록
 *                       items:
 *                         type: object
 *                         properties:
 *                           sessionId:
 *                             type: string
 *                             description: 세션 고유 ID (Express 세션 ID)
 *                             example: "DNBjfhvSCu_Kj-IvwHDkoWoG_VXnsmTn"
 *                           deviceName:
 *                             type: string
 *                             description: 디바이스 이름 (브라우저 + OS 조합)
 *                             example: "Chrome on Windows 10"
 *                           platform:
 *                             type: string
 *                             description: |
 *                               로그인 플랫폼 (X-Platform 헤더 기반)
 *                               - web: 웹 플랫폼 (세션 1일)
 *                               - app: 앱 플랫폼 (세션 30일)
 *                             enum: [web, app]
 *                             example: "web"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: 세션 생성 시간 (ISO 8601 형식)
 *                             example: "2025-10-30T12:53:33.381Z"
 *                           lastActivityAt:
 *                             type: string
 *                             format: date-time
 *                             description: 마지막 활동(요청) 시간
 *                             example: "2025-10-30T12:53:33.381Z"
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                             description: |
 *                               세션 만료 예정 시간
 *                               - 웹: 7일 (rolling session - 활동 시 갱신)
 *                               - 앱: 30일 (rolling session - 활동 시 갱신)
 *                             example: "2025-11-06T12:53:33.381Z"
 *                           isCurrent:
 *                             type: boolean
 *                             description: 이 API를 호출한 현재 세션인지 여부 (true면 현재 세션)
 *                             example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: 응답 생성 시간
 *                   example: "2025-10-30T12:53:37.334Z"
 *             examples:
 *               single_session:
 *                 summary: 웹 세션 1개만 있는 경우
 *                 value:
 *                   success: true
 *                   message: "활성 세션 목록을 가져왔습니다."
 *                   data:
 *                     totalSessions: 1
 *                     sessions:
 *                       - sessionId: "DNBjfhvSCu_Kj-IvwHDkoWoG_VXnsmTn"
 *                         deviceName: "Chrome on Windows 10"
 *                         platform: "web"
 *                         createdAt: "2025-10-30T12:00:00.000Z"
 *                         lastActivityAt: "2025-10-30T12:53:33.381Z"
 *                         expiresAt: "2025-11-06T12:00:00.000Z"
 *                         isCurrent: true
 *                   timestamp: "2025-10-30T12:53:37.334Z"
 *               two_sessions:
 *                 summary: 웹과 앱 세션이 모두 있는 경우
 *                 value:
 *                   success: true
 *                   message: "활성 세션 목록을 가져왔습니다."
 *                   data:
 *                     totalSessions: 2
 *                     sessions:
 *                       - sessionId: "web_session_id_123"
 *                         deviceName: "Chrome on macOS 10.15"
 *                         platform: "web"
 *                         createdAt: "2025-10-30T10:00:00.000Z"
 *                         lastActivityAt: "2025-10-30T12:53:33.381Z"
 *                         expiresAt: "2025-11-06T10:00:00.000Z"
 *                         isCurrent: true
 *                       - sessionId: "app_session_id_456"
 *                         deviceName: "iPhone (iOS 17.5)"
 *                         platform: "app"
 *                         createdAt: "2025-10-29T08:00:00.000Z"
 *                         lastActivityAt: "2025-10-30T11:30:00.000Z"
 *                         expiresAt: "2025-11-28T08:00:00.000Z"
 *                         isCurrent: false
 *                   timestamp: "2025-10-30T12:53:37.334Z"
 *       401:
 *         description: 인증 필요 (로그인하지 않은 경우)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "인증이 필요합니다."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "서버 에러로 세션 목록 조회에 실패했습니다."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/sessions', requireAuth, async (req, res) => {
  const authController = await getAuthController();
  await authController.getSessions(req, res);
});

/**
 * @swagger
 * /auth/sessions/all:
 *   delete:
 *     summary: 모든 세션 로그아웃 (현재 제외)
 *     description: 현재 세션을 제외한 모든 활성 세션을 종료합니다.
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 모든 세션 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "다른 모든 세션이 로그아웃되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: number
 *                       description: 삭제된 세션 개수
 *                     currentSessionId:
 *                       type: string
 *                       description: 유지되는 현재 세션 ID
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 에러
 */
router.delete('/sessions/all', requireAuth, async (req, res) => {
  const authController = await getAuthController();
  await authController.deleteAllSessions(req, res);
});

/**
 * @swagger
 * /auth/sessions/{sessionId}:
 *   delete:
 *     summary: 특정 세션 강제 종료
 *     description: 지정된 세션을 강제로 종료합니다. 현재 세션은 이 방법으로 종료할 수 없습니다.
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 종료할 세션 ID
 *     responses:
 *       200:
 *         description: 세션 종료 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "세션이 종료되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedSessionId:
 *                       type: string
 *                       description: 삭제된 세션 ID
 *       400:
 *         description: 잘못된 요청 (현재 세션 삭제 시도)
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음 (다른 사용자의 세션)
 *       404:
 *         description: 세션을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  const authController = await getAuthController();
  await authController.deleteSessionById(req, res);
});

// 사용자 통계
/**
 * @swagger
 * /auth/stats:
 *   get:
 *     summary: 사용자 통계 조회
 *     description: |
 *       로그인한 사용자의 통계 정보를 조회합니다.
 *
 *       **제공되는 통계:**
 *       - upcomingLikedConcertsCount: 좋아요한 콘서트 중 다가오는 콘서트 개수
 *         - 현재 시간 이후의 공연만 포함
 *         - 공연 날짜가 없는 콘서트는 제외
 *       - totalLikedConcertsCount: 전체 좋아요한 콘서트 개수
 *         - 과거, 현재, 미래의 모든 좋아요한 콘서트 포함
 *
 *       **사용 예시:**
 *       - 마이페이지에서 "다가오는 공연 N개" 표시
 *       - 대시보드에서 사용자 활동 통계 표시
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 통계 조회 성공
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
 *                   example: "사용자 통계 조회 성공"
 *                 data:
 *                   type: object
 *                   properties:
 *                     upcomingLikedConcertsCount:
 *                       type: number
 *                       description: 좋아요한 콘서트 중 다가오는 콘서트 개수
 *                       example: 5
 *                     totalLikedConcertsCount:
 *                       type: number
 *                       description: 전체 좋아요한 콘서트 개수
 *                       example: 12
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-01-15T10:30:00Z"
 *             examples:
 *               with_upcoming_concerts:
 *                 summary: 다가오는 공연이 있는 경우
 *                 value:
 *                   success: true
 *                   message: "사용자 통계 조회 성공"
 *                   data:
 *                     upcomingLikedConcertsCount: 5
 *                     totalLikedConcertsCount: 12
 *                   timestamp: "2025-01-15T10:30:00Z"
 *               no_upcoming_concerts:
 *                 summary: 다가오는 공연이 없는 경우
 *                 value:
 *                   success: true
 *                   message: "사용자 통계 조회 성공"
 *                   data:
 *                     upcomingLikedConcertsCount: 0
 *                     totalLikedConcertsCount: 8
 *                   timestamp: "2025-01-15T10:30:00Z"
 *               no_liked_concerts:
 *                 summary: 좋아요한 콘서트가 없는 경우
 *                 value:
 *                   success: true
 *                   message: "사용자 통계 조회 성공"
 *                   data:
 *                     upcomingLikedConcertsCount: 0
 *                     totalLikedConcertsCount: 0
 *                   timestamp: "2025-01-15T10:30:00Z"
 *       401:
 *         description: 인증 필요 (로그인하지 않은 경우)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "로그인이 필요합니다."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "사용자를 찾을 수 없습니다."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "서버 에러로 통계 조회에 실패했습니다."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/stats', requireAuth, async (req, res) => {
  const authController = await getAuthController();
  await authController.getUserStats(req, res);
});

// OAuth 가입 완료
/**
 * @swagger
 * /auth/oauth/complete-registration:
 *   post:
 *     summary: OAuth 가입 완료 - 추가 정보 입력
 *     description: |
 *       OAuth로 가입한 사용자가 약관동의 및 추가 정보를 입력하여 가입을 완료합니다.
 *       status를 PENDING_REGISTRATION에서 ACTIVE로 변경합니다.
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - birthDate
 *               - termsConsents
 *             properties:
 *               name:
 *                 type: string
 *                 description: 사용자 실명
 *                 example: "홍길동"
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 description: 생년월일 (YYYY-MM-DD)
 *                 example: "1990-01-01"
 *               username:
 *                 type: string
 *                 description: 사용자명/닉네임 (선택사항, 비어있으면 자동 생성)
 *                 example: "내별명"
 *                 minLength: 2
 *                 maxLength: 20
 *               termsConsents:
 *                 type: array
 *                 description: |
 *                   약관 동의 목록
 *                   - **필수 약관**: terms (서비스 이용약관), privacy (개인정보처리방침)
 *                   - **선택 약관**: marketing (마케팅 정보 수신 동의)
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - isAgreed
 *                     - version
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [terms, privacy, marketing]
 *                       description: |
 *                         약관 타입
 *                         - **terms**: 서비스 이용약관 (필수)
 *                         - **privacy**: 개인정보처리방침 (필수)
 *                         - **marketing**: 마케팅 정보 수신 동의 (선택)
 *                     isAgreed:
 *                       type: boolean
 *                       description: 동의 여부 (terms와 privacy는 반드시 true여야 함)
 *                     version:
 *                       type: string
 *                       description: 약관 버전 (현재 버전 확인 필요)
 *                       example: "1.0"
 *                 example:
 *                   - type: "terms"
 *                     isAgreed: true
 *                     version: "1.0"
 *                   - type: "privacy"
 *                     isAgreed: true
 *                     version: "1.0"
 *                   - type: "marketing"
 *                     isAgreed: false
 *                     version: "1.0"
 *     responses:
 *       200:
 *         description: 가입 완료 성공
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
 *                   example: "가입이 완료되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         username:
 *                           type: string
 *                         name:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "active"
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_fields:
 *                       value: "이름과 생년월일을 입력해주세요."
 *                     missing_terms:
 *                       value: "약관 동의 정보가 필요합니다."
 *                     terms_required:
 *                       value: "필수 약관에 동의해주세요: terms, privacy"
 *                     username_taken:
 *                       value: "이미 사용 중인 사용자명입니다."
 *                     already_completed:
 *                       value: "이미 가입이 완료된 사용자입니다."
 *       401:
 *         description: 인증 필요 (로그인 세션 없음)
 *       500:
 *         description: 서버 에러
 */
router.post('/oauth/complete-registration', requireAuth, async (req, res) => {
  const authController = await getAuthController();
  await authController.completeRegistration(req, res);
});

// 연결된 계정 조회
/**
 * @swagger
 * /auth/me/connected-accounts:
 *   get:
 *     summary: 연결된 계정 조회
 *     description: |
 *       현재 사용자에게 연결된 OAuth 제공자 목록을 조회합니다.
 *       - 이메일 주소
 *       - 비밀번호 설정 여부
 *       - 연결된 OAuth 제공자 목록 (Google, Apple 등)
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 연결된 계정 조회 성공
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
 *                   example: "연결된 계정 조회 성공"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     hasPassword:
 *                       type: boolean
 *                       description: 비밀번호 설정 여부
 *                       example: true
 *                     oauthProviders:
 *                       type: array
 *                       description: 연결된 OAuth 제공자 목록
 *                       items:
 *                         type: object
 *                         properties:
 *                           provider:
 *                             type: string
 *                             enum: [google, apple]
 *                             example: "google"
 *                           email:
 *                             type: string
 *                             example: "user@gmail.com"
 *                           linkedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-01T10:30:00Z"
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 에러
 */
router.get('/me/connected-accounts', requireAuth, async (req, res) => {
  const authController = await getAuthController();
  await authController.getConnectedAccounts(req, res);
});

export default router;
