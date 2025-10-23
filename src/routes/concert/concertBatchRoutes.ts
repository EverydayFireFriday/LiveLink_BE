import express from 'express';
import {
  batchUploadConcerts,
  batchUpdateConcerts,
  batchDeleteConcerts,
} from '../../controllers/concert/concertBatchController';
import { requireAdmin } from '../../middlewares/auth/authMiddleware';

const router = express.Router();

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
 *
 *       - location: 문자열 배열로 간소화됨
 *       - infoImages: 이미지 URL 배열 (기존 info에서 변경)
 *     security:
 *       - sessionAuth: []
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
 *                       description: 고유 콘서트 ID (timestamp 포함)
 *                       example: "concert_1703123456789_abc123"
 *                     title:
 *                       type: string
 *                       description: 콘서트 제목
 *                       example: "아이유 콘서트 2024"
 *                       maxLength: 200
 *                     artist:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 아티스트 목록 (빈 배열 허용)
 *                       example: ["아이유", "IU"]
 *                     location:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 공연 장소 목록 (문자열 배열로 간소화)
 *                       example: ["서울 올림픽공원 체조경기장", "부산 BEXCO"]
 *                       minItems: 1
 *                     datetime:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: date-time
 *                       description: 공연 일시 목록
 *                       example: ["2024-12-25T19:00:00Z", "2024-12-26T19:00:00Z"]
 *                       minItems: 1
 *                     price:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tier: { type: string, example: "VIP" }
 *                           amount: { type: number, example: 150000 }
 *                       description: 가격 정보 (선택사항)
 *                     description:
 *                       type: string
 *                       description: 콘서트 설명
 *                       maxLength: 2000
 *                       example: "아이유의 특별한 겨울 콘서트"
 *                     category:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, RnB/ballad, tour, idol, festival, fan, other]
 *                       description: 음악 카테고리
 *                       example: ["tour", "idol"]
 *                     ticketLink:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           platform: { type: string, example: "인터파크" }
 *                           url: { type: string, example: "https://ticket.interpark.com/..." }
 *                       description: 티켓 예매 링크
 *                     ticketOpenDate:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           openTitle:
 *                             type: string
 *                             example: "선예매 오픈"
 *                           openDate:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-11-01T10:00:00Z"
 *                       description: 티켓 오픈 일시 목록
 *                       example: [{"openTitle": "선예매 오픈", "openDate": "2024-11-01T10:00:00Z"}, {"openTitle": "일반예매 오픈", "openDate": "2024-11-05T10:00:00Z"}]
 *                     posterImage:
 *                       type: string
 *                       format: uri
 *                       description: 포스터 이미지 URL
 *                       example: "https://example.com/poster.jpg"
 *                     infoImages:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: uri
 *                       description: 추가 정보 이미지 URL 배열 (기존 info에서 변경)
 *                       example: ["https://example.com/info1.jpg", "https://example.com/info2.jpg"]
 *               skipDuplicates:
 *                 type: boolean
 *                 description: "중복 UID 발견 시 건너뛸지 여부"
 *                 default: false
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 100
 *                 minimum: 1
 *                 maximum: 1000
 *     responses:
 *       201:
 *         description: 배치 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "콘서트 일괄 등록 처리 완료"
 *                 results:
 *                   type: object
 *                   properties:
 *                     totalRequested: { type: integer, example: 100 }
 *                     successCount: { type: integer, example: 95 }
 *                     errorCount: { type: integer, example: 3 }
 *                     duplicateCount: { type: integer, example: 2 }
 *                     created:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index: { type: integer }
 *                           id: { type: string }
 *                           uid: { type: string }
 *                           title: { type: string }
 *                           createdAt: { type: string, format: date-time }
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index: { type: integer }
 *                           uid: { type: string }
 *                           error: { type: string }
 *                     duplicates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index: { type: integer }
 *                           uid: { type: string }
 *                           title: { type: string }
 *                     processingTime: { type: string, example: "2.45초" }
 *                     batchCount: { type: integer, example: 5 }
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
router.post('/batch', requireAdmin, batchUploadConcerts);

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
 *       - location: 문자열 배열 형태로 업데이트
 *       - infoImages: 이미지 URL 배열로 업데이트
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
 *                       maxLength: 200
 *                     status:
 *                       type: string
 *                       enum: ["upcoming", "ongoing", "completed", "cancelled"]
 *                       description: 수정할 상태 (선택사항)
 *                     artist:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 수정할 아티스트 목록 (선택사항)
 *                       example: ["아이유", "IU"]
 *                     location:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 수정할 공연 장소 목록 (문자열 배열, 선택사항)
 *                       example: ["서울 올림픽공원 체조경기장"]
 *                       minItems: 1
 *                     datetime:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: date-time
 *                       description: 수정할 공연 일시 목록 (선택사항)
 *                       example: ["2024-12-25T19:00:00Z"]
 *                       minItems: 1
 *                     price:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tier: { type: string, example: "VIP" }
 *                           amount: { type: number, example: 150000 }
 *                       description: 수정할 가격 정보 (선택사항)
 *                     description:
 *                       type: string
 *                       description: 수정할 콘서트 설명 (선택사항)
 *                       maxLength: 2000
 *                     category:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, RnB/ballad, tour, idol, festival, fan, other]
 *                       description: 수정할 음악 카테고리 (선택사항)
 *                     ticketOpenDate:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           openTitle:
 *                             type: string
 *                             example: "선예매 오픈"
 *                           openDate:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-11-01T10:00:00Z"
 *                       description: 수정할 티켓 오픈 일시 목록 (선택사항)
 *                       example: [{"openTitle": "선예매 오픈", "openDate": "2024-11-01T10:00:00Z"}, {"openTitle": "일반예매 오픈", "openDate": "2024-11-05T10:00:00Z"}]
 *                     posterImage:
 *                       type: string
 *                       format: uri
 *                       description: 수정할 포스터 이미지 URL (선택사항)
 *                     infoImages:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: uri
 *                       description: 수정할 정보 이미지 URL 배열 (선택사항)
 *                       example: ["https://example.com/info1.jpg"]
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
 *                 message: { type: string, example: "콘서트 일괄 수정 처리 완료" }
 *                 results:
 *                   type: object
 *                   properties:
 *                     totalRequested: { type: integer, example: 50 }
 *                     successCount: { type: integer, example: 45 }
 *                     errorCount: { type: integer, example: 3 }
 *                     notFoundCount: { type: integer, example: 2 }
 *                     updated:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index: { type: integer }
 *                           uid: { type: string }
 *                           title: { type: string }
 *                           updatedAt: { type: string, format: date-time }
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index: { type: integer }
 *                           uid: { type: string }
 *                           error: { type: string }
 *                     notFound:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index: { type: integer }
 *                           uid: { type: string }
 *                           error: { type: string }
 *                     processingTime: { type: string, example: "1.23초" }
 *                     batchCount: { type: integer, example: 3 }
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
router.put('/batch', requireAdmin, batchUpdateConcerts);

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
 *       ⚠️ **주의**: 하드 삭제된 데이터는 복구할 수 없습니다.
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
 *                 minItems: 1
 *                 maxItems: 1000
 *               softDelete:
 *                 type: boolean
 *                 description: "소프트 삭제 여부 (true: 상태만 cancelled로 변경, false: 완전 삭제)"
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
 *                 message: { type: string, example: "콘서트 일괄 삭제 처리 완료" }
 *                 results:
 *                   type: object
 *                   properties:
 *                     totalRequested: { type: integer, example: 20 }
 *                     successCount: { type: integer, example: 18 }
 *                     errorCount: { type: integer, example: 1 }
 *                     notFoundCount: { type: integer, example: 1 }
 *                     deleted:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index: { type: integer }
 *                           uid: { type: string }
 *                           title: { type: string }
 *                           deletedAt: { type: string, format: date-time }
 *                           deleteType: { type: string, enum: ["soft", "hard"] }
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index: { type: integer }
 *                           uid: { type: string }
 *                           error: { type: string }
 *                     notFound:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index: { type: integer }
 *                           uid: { type: string }
 *                           error: { type: string }
 *                     processingTime: { type: string, example: "0.89초" }
 *                     batchCount: { type: integer, example: 2 }
 *                     deleteType: { type: string, enum: ["soft", "hard"] }
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
router.delete('/batch', requireAdmin, batchDeleteConcerts);

export default router;
