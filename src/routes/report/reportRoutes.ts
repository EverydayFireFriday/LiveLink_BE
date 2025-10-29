// src/routes/report/reportRoutes.ts

import express from 'express';
import { ReportController } from '../../report/reportController';
import { defaultLimiter } from '../../middlewares/security/rateLimitMiddleware';

/**
 * Report Routes
 *
 * POST   /report              - Create a new report
 * GET    /report              - Get all reports with optional filters
 * GET    /report/:id          - Get a specific report by ID
 * PATCH  /report/:id/status   - Update report status
 * DELETE /report/:id          - Delete a report
 */

export const createReportRouter = (
  reportController: ReportController,
): express.Router => {
  const router = express.Router();

  // 모든 신고 API에 defaultLimiter 적용
  router.use(defaultLimiter);

  /**
   * @swagger
   * /report:
   *   post:
   *     summary: 신고 생성
   *     tags: [Report]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reporterId
   *               - reportedEntityType
   *               - reportedEntityId
   *               - reportType
   *             properties:
   *               reporterId:
   *                 type: string
   *                 description: 신고자 ID
   *                 example: "507f1f77bcf86cd799439011"
   *               reportedEntityType:
   *                 type: string
   *                 enum: [POST, COMMENT, USER, MESSAGE]
   *                 description: 신고 대상 타입
   *                 example: POST
   *               reportedEntityId:
   *                 type: string
   *                 description: 신고 대상 ID
   *                 example: "507f1f77bcf86cd799439012"
   *               reportType:
   *                 type: string
   *                 enum: [SPAM, HARASSMENT, INAPPROPRIATE, COPYRIGHT, FAKE_INFO, HATE_SPEECH, OTHER]
   *                 description: 신고 유형
   *                 example: SPAM
   *               reason:
   *                 type: string
   *                 description: 신고 사유 (선택)
   *                 example: "스팸성 게시글입니다."
   *     responses:
   *       201:
   *         description: 신고 생성 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "신고가 성공적으로 접수되었습니다."
   *                 data:
   *                   type: object
   *       400:
   *         description: 잘못된 요청
   *       500:
   *         description: 서버 오류
   */
  router.post('/', (req, res, next) => {
    void reportController.createReport(req, res, next);
  });

  /**
   * @swagger
   * /report:
   *   get:
   *     summary: 신고 목록 조회
   *     tags: [Report]
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, REVIEWING, RESOLVED, REJECTED]
   *         description: 신고 상태 필터
   *         example: PENDING
   *       - in: query
   *         name: reportedEntityType
   *         schema:
   *           type: string
   *           enum: [POST, COMMENT, USER, MESSAGE]
   *         description: 신고 대상 타입 필터
   *         example: POST
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           minimum: 1
   *           maximum: 100
   *         description: 조회할 최대 개수
   *         example: 20
   *       - in: query
   *         name: skip
   *         schema:
   *           type: integer
   *           default: 0
   *           minimum: 0
   *         description: 건너뛸 개수 (페이지네이션)
   *         example: 0
   *     responses:
   *       200:
   *         description: 신고 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     limit:
   *                       type: integer
   *                     skip:
   *                       type: integer
   *                     count:
   *                       type: integer
   *       400:
   *         description: 잘못된 쿼리 파라미터
   *       500:
   *         description: 서버 오류
   */
  router.get('/', (req, res, next) => {
    void reportController.getReports(req, res, next);
  });

  /**
   * @swagger
   * /report/{id}:
   *   get:
   *     summary: 특정 신고 조회
   *     tags: [Report]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 신고 ID
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: 신고 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *       404:
   *         description: 신고를 찾을 수 없음
   *       400:
   *         description: 잘못된 ID 형식
   *       500:
   *         description: 서버 오류
   */
  router.get('/:id', (req, res, next) => {
    void reportController.getReportById(req, res, next);
  });

  /**
   * @swagger
   * /report/{id}/status:
   *   patch:
   *     summary: 신고 상태 업데이트
   *     tags: [Report]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 신고 ID
   *         example: "507f1f77bcf86cd799439011"
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
   *                 enum: [PENDING, REVIEWING, RESOLVED, REJECTED]
   *                 description: 변경할 신고 상태
   *                 example: REVIEWING
   *     responses:
   *       200:
   *         description: 신고 상태 업데이트 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "신고 상태가 업데이트되었습니다."
   *                 data:
   *                   type: object
   *       404:
   *         description: 신고를 찾을 수 없음
   *       400:
   *         description: 잘못된 입력
   *       500:
   *         description: 서버 오류
   */
  router.patch('/:id/status', (req, res, next) => {
    void reportController.updateReportStatus(req, res, next);
  });

  /**
   * @swagger
   * /report/{id}:
   *   delete:
   *     summary: 신고 삭제
   *     tags: [Report]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 신고 ID
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: 신고 삭제 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "신고가 삭제되었습니다."
   *       404:
   *         description: 신고를 찾을 수 없음
   *       400:
   *         description: 잘못된 ID 형식
   *       500:
   *         description: 서버 오류
   */
  router.delete('/:id', (req, res, next) => {
    void reportController.deleteReport(req, res, next);
  });

  return router;
};
