import express from "express";
import { ConcertBatchService } from "../../services/concert/concertBatchService";

/**
 * @swagger
 * /concert/batch:
 *   post:
 *     tags:
 *       - Concerts - Batch
 *     summary: 여러 콘서트 일괄 등록 (성능 최적화)
 *     description: |
 *       관리자 권한으로 여러 콘서트를 한 번에 등록합니다.
 *       - 성능 최적화된 배치 처리
 *       - 중복 UID 검사 및 처리 옵션
 *       - 상세한 결과 리포트 제공
 *       - 트랜잭션 기반 안전한 처리
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchUploadRequest'
 *     responses:
 *       201:
 *         description: 배치 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchUploadResponse'
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패 (세션 없음)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 권한 부족 (관리자 권한 필요)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const batchUploadConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const result = await ConcertBatchService.batchUploadConcerts(req.body);

    if (result.success) {
      res.status(result.statusCode!).json(result.data);
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        ...(result.data && { ...result.data }),
      });
    }
  } catch (error) {
    console.error("❌ 콘서트 일괄 등록 컨트롤러 에러:", error);
    res.status(500).json({
      message: "서버 에러로 콘서트 일괄 등록 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert/batch:
 *   put:
 *     tags:
 *       - Concerts - Batch
 *     summary: 여러 콘서트 일괄 수정 (성능 최적화)
 *     description: |
 *       관리자 권한으로 여러 콘서트 정보를 한 번에 수정합니다.
 *       - UID를 기준으로 기존 콘서트 찾아서 업데이트
 *       - 부분 업데이트 지원 (변경된 필드만 수정)
 *       - 성능 최적화된 배치 처리
 *       - 상세한 결과 리포트 제공
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 description: 수정할 콘서트들의 배열
 *                 items:
 *                   type: object
 *                   required:
 *                     - uid
 *                   properties:
 *                     uid:
 *                       type: string
 *                       description: 수정할 콘서트의 UID
 *                       example: "concert_1703123456789_abc123"
 *                     title:
 *                       type: string
 *                       description: 수정할 제목 (선택사항)
 *                       example: "아이유 콘서트 2024 (수정됨)"
 *                     status:
 *                       type: string
 *                       enum: ["upcoming", "ongoing", "completed", "cancelled"]
 *                       description: 수정할 상태 (선택사항)
 *                     price:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tier: { type: string }
 *                           amount: { type: number }
 *                       description: 수정할 가격 정보 (선택사항)
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 50
 *                 minimum: 1
 *                 maximum: 1000
 *     responses:
 *       200:
 *         description: 배치 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 results:
 *                   type: object
 *                   properties:
 *                     totalRequested: { type: integer }
 *                     successCount: { type: integer }
 *                     errorCount: { type: integer }
 *                     notFoundCount: { type: integer }
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           uid: { type: string }
 *                           error: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패 (세션 없음)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 권한 부족 (관리자 권한 필요)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const batchUpdateConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const result = await ConcertBatchService.batchUpdateConcerts(req.body);

    if (result.success) {
      res.status(result.statusCode!).json(result.data);
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        ...(result.data && { ...result.data }),
      });
    }
  } catch (error) {
    console.error("❌ 콘서트 일괄 수정 컨트롤러 에러:", error);
    res.status(500).json({
      message: "서버 에러로 콘서트 일괄 수정 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert/batch:
 *   delete:
 *     tags:
 *       - Concerts - Batch
 *     summary: 여러 콘서트 일괄 삭제 (성능 최적화)
 *     description: |
 *       관리자 권한으로 여러 콘서트를 한 번에 삭제합니다.
 *       - UID 목록을 기준으로 삭제
 *       - 소프트 삭제 또는 하드 삭제 옵션
 *       - 성능 최적화된 배치 처리
 *       - 상세한 결과 리포트 제공
 *       ⚠️ **주의**: 삭제된 데이터는 복구할 수 없습니다.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uids
 *             properties:
 *               uids:
 *                 type: array
 *                 description: 삭제할 콘서트 UID 목록
 *                 items:
 *                   type: string
 *                 example: ["concert_1703123456789_abc123", "concert_1703123456790_def456"]
 *               softDelete:
 *                 type: boolean
 *                 description: "소프트 삭제 여부 (true: 상태만 변경, false: 완전 삭제)"
 *                 default: true
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 100
 *                 minimum: 1
 *                 maximum: 1000
 *     responses:
 *       200:
 *         description: 배치 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 results:
 *                   type: object
 *                   properties:
 *                     totalRequested: { type: integer }
 *                     successCount: { type: integer }
 *                     errorCount: { type: integer }
 *                     notFoundCount: { type: integer }
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           uid: { type: string }
 *                           error: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패 (세션 없음)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 권한 부족 (관리자 권한 필요)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const batchDeleteConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const result = await ConcertBatchService.batchDeleteConcerts(req.body);

    if (result.success) {
      res.status(result.statusCode!).json(result.data);
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        ...(result.data && { ...result.data }),
      });
    }
  } catch (error) {
    console.error("❌ 콘서트 일괄 삭제 컨트롤러 에러:", error);
    res.status(500).json({
      message: "서버 에러로 콘서트 일괄 삭제 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert/batch/like:
 *   post:
 *     tags:
 *       - Concerts - Batch
 *     summary: 여러 콘서트 일괄 좋아요 처리 (성능 최적화)
 *     description: |
 *       인증된 사용자가 여러 콘서트에 대해 좋아요를 일괄 처리합니다.
 *       - 좋아요 추가/제거 동시 처리 가능
 *       - 중복 처리 방지
 *       - 성능 최적화된 배치 처리
 *       - 실시간 좋아요 수 업데이트
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operations
 *             properties:
 *               operations:
 *                 type: array
 *                 description: 좋아요 처리할 콘서트와 액션 목록
 *                 items:
 *                   type: object
 *                   required:
 *                     - uid
 *                     - action
 *                   properties:
 *                     uid:
 *                       type: string
 *                       description: 대상 콘서트 UID
 *                       example: "concert_1703123456789_abc123"
 *                     action:
 *                       type: string
 *                       enum: ["like", "unlike"]
 *                       description: 수행할 액션
 *                       example: "like"
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 50
 *                 minimum: 1
 *                 maximum: 1000
 *               useBulkWrite:
 *                 type: boolean
 *                 description: "MongoDB bulkWrite 사용 여부 (고성능)"
 *                 default: true
 *     responses:
 *       200:
 *         description: 배치 좋아요 처리 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 results:
 *                   type: object
 *                   properties:
 *                     totalRequested: { type: integer }
 *                     successCount: { type: integer }
 *                     errorCount: { type: integer }
 *                     duplicateCount: { type: integer }
 *                     notFoundCount: { type: integer }
 *                     likeResults:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           uid: { type: string }
 *                           action: { type: string }
 *                           success: { type: boolean }
 *                           newLikesCount: { type: integer }
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           uid: { type: string }
 *                           error: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패 (세션 없음)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const batchLikeConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // 세션에서 사용자 ID 추출 (세션 기반 인증)
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "인증이 필요합니다",
        error: "세션에서 사용자 정보를 찾을 수 없습니다",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await ConcertBatchService.batchLikeConcerts(
      req.body,
      userId
    );

    if (result.success) {
      res.status(result.statusCode!).json(result.data);
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        ...(result.data && { ...result.data }),
      });
    }
  } catch (error) {
    console.error("❌ 좋아요 일괄 처리 컨트롤러 에러:", error);
    res.status(500).json({
      message: "서버 에러로 좋아요 일괄 처리 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};
