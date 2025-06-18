import express from "express";
import { ConcertBatchService } from "../../services/concert/concertBatchService";

/**
 * @swagger
 * /concert/batch:
 *   post:
 *     summary: 여러 콘서트 일괄 등록 (성능 최적화)
 *     description: 여러 콘서트 정보를 한 번에 MongoDB에 저장합니다. 대량 처리에 최적화되어 있습니다.
 *     tags: [Concerts - Batch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - concerts
 *             properties:
 *               concerts:
 *                 type: array
 *                 description: 등록할 콘서트들의 배열
 *                 items:
 *                   type: object
 *                   required:
 *                     - uid
 *                     - title
 *                     - location
 *                     - datetime
 *                   properties:
 *                     uid:
 *                       type: string
 *                       description: 사용자 지정 ID (timestamp 포함)
 *                     title:
 *                       type: string
 *                       description: 콘서트 제목
 *                     artist:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 아티스트명 배열
 *                     location:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           location:
 *                             type: string
 *                       description: 공연 장소 정보 배열
 *                     datetime:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: date-time
 *                       description: 공연 날짜 및 시간 배열
 *               skipDuplicates:
 *                 type: boolean
 *                 description: "중복 UID 무시 여부"
 *                 default: false
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 100
 *                 minimum: 1
 *                 maximum: 1000
 *     responses:
 *       201:
 *         description: 콘서트 일괄 등록 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 에러
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
    });
  }
};

/**
 * @swagger
 * /concert/batch:
 *   put:
 *     summary: 여러 콘서트 일괄 수정 (성능 최적화)
 *     description: 여러 콘서트의 정보를 한 번에 수정합니다.
 *     tags: [Concerts - Batch]
 *     security:
 *       - bearerAuth: []
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
 *                     - id
 *                     - data
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 콘서트 ObjectId 또는 UID
 *                     data:
 *                       type: object
 *                       description: 수정할 데이터
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 50
 *     responses:
 *       200:
 *         description: 콘서트 일괄 수정 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 에러
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
    });
  }
};

/**
 * @swagger
 * /concert/batch:
 *   delete:
 *     summary: 여러 콘서트 일괄 삭제 (성능 최적화)
 *     description: 여러 콘서트를 한 번에 삭제합니다.
 *     tags: [Concerts - Batch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 description: 삭제할 콘서트 ID들의 배열
 *                 items:
 *                   type: string
 *                 example: ["concert_1703123456789_abc123", "674a1b2c3d4e5f6789abcdef"]
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 100
 *     responses:
 *       200:
 *         description: 콘서트 일괄 삭제 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 에러
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
    });
  }
};

/**
 * @swagger
 * /concert/batch/like:
 *   post:
 *     summary: 여러 콘서트 일괄 좋아요 처리 (성능 최적화)
 *     description: 여러 콘서트에 대해 좋아요를 일괄로 처리합니다.
 *     tags: [Concerts - Batch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actions
 *             properties:
 *               actions:
 *                 type: array
 *                 description: 좋아요 액션들의 배열
 *                 items:
 *                   type: object
 *                   required:
 *                     - concertId
 *                     - action
 *                   properties:
 *                     concertId:
 *                       type: string
 *                       description: 콘서트 ObjectId 또는 UID
 *                     action:
 *                       type: string
 *                       enum: [add, remove]
 *                       description: 수행할 액션 (add=좋아요 추가, remove=좋아요 삭제)
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 50
 *               useBulkWrite:
 *                 type: boolean
 *                 description: "MongoDB bulkWrite 사용 여부 (고성능)"
 *                 default: true
 *     responses:
 *       200:
 *         description: 좋아요 일괄 처리 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 에러
 */
export const batchLikeConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
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
    });
  }
};
