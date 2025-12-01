import express from 'express';
import {
  createInquiry,
  getInquiryById,
  getInquiries,
  updateInquiryStatus,
  updateInquiryPriority,
  addAdminResponse,
  deleteInquiry,
} from '../../controllers/support/supportController';
import { requireAuth } from '../../middlewares/auth/authMiddleware';
import { requireAdmin } from '../../middlewares/auth/adminMiddleware';

const router = express.Router();

/**
 * @swagger
 * /support:
 *   post:
 *     summary: 지원 문의 생성
 *     description: 새로운 지원 문의를 생성합니다
 *     tags:
 *       - Support
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - subject
 *               - content
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [TECHNICAL, ACCOUNT, PAYMENT, FEATURE_REQUEST, BUG_REPORT, OTHER]
 *                 description: 문의 카테고리
 *               subject:
 *                 type: string
 *                 description: 문의 제목
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 description: 문의 내용
 *                 maxLength: 5000
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 description: 우선순위 (선택사항, 기본값 MEDIUM)
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 첨부파일 URL 목록 (선택사항)
 *     responses:
 *       201:
 *         description: 문의 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 */
router.post('/', requireAuth, createInquiry);

/**
 * @swagger
 * /support:
 *   get:
 *     summary: 문의 목록 조회
 *     description: 사용자의 문의 목록을 조회합니다 (관리자는 전체 조회 가능)
 *     tags:
 *       - Support
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, ANSWERED, CLOSED]
 *         description: 문의 상태 필터
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [TECHNICAL, ACCOUNT, PAYMENT, FEATURE_REQUEST, BUG_REPORT, OTHER]
 *         description: 문의 카테고리 필터 (관리자만 사용 가능)
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *         description: 우선순위 필터 (관리자만 사용 가능)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/', requireAuth, getInquiries);

/**
 * @swagger
 * /support/{id}:
 *   get:
 *     summary: 문의 상세 조회
 *     description: 특정 문의의 상세 정보를 조회합니다
 *     tags:
 *       - Support
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 문의 ID
 *     responses:
 *       200:
 *         description: 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 문의를 찾을 수 없음
 */
router.get('/:id', requireAuth, getInquiryById);

/**
 * @swagger
 * /support/{id}/status:
 *   patch:
 *     summary: 문의 상태 변경 (관리자 전용)
 *     description: 문의의 상태를 변경합니다
 *     tags:
 *       - Support
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 문의 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, ANSWERED, CLOSED]
 *                 description: 변경할 상태
 *     responses:
 *       200:
 *         description: 상태 변경 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 문의를 찾을 수 없음
 */
router.patch('/:id/status', requireAuth, requireAdmin, updateInquiryStatus);

/**
 * @swagger
 * /support/{id}/priority:
 *   patch:
 *     summary: 문의 우선순위 변경 (관리자 전용)
 *     description: 문의의 우선순위를 변경합니다
 *     tags:
 *       - Support
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 문의 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priority
 *             properties:
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 description: 변경할 우선순위
 *     responses:
 *       200:
 *         description: 우선순위 변경 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 문의를 찾을 수 없음
 */
router.patch('/:id/priority', requireAuth, requireAdmin, updateInquiryPriority);

/**
 * @swagger
 * /support/{id}/response:
 *   post:
 *     summary: 관리자 답변 작성 (관리자 전용)
 *     description: 문의에 대한 관리자 답변을 작성합니다 (FCM 푸시 알림 전송)
 *     tags:
 *       - Support
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 문의 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 답변 내용
 *                 maxLength: 5000
 *     responses:
 *       200:
 *         description: 답변 등록 성공 (FCM 알림 전송)
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 문의를 찾을 수 없음
 *       409:
 *         description: 이미 답변된 문의
 */
router.post('/:id/response', requireAuth, requireAdmin, addAdminResponse);

/**
 * @swagger
 * /support/{id}:
 *   delete:
 *     summary: 문의 삭제
 *     description: 문의를 삭제합니다 (작성자 또는 관리자만 가능)
 *     tags:
 *       - Support
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 문의 ID
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 문의를 찾을 수 없음
 */
router.delete('/:id', requireAuth, deleteInquiry);

export default router;
