import express from "express";
import {
  uploadConcert,
  getConcert,
  getAllConcerts,
  updateConcert,
  deleteConcert,
} from "../../controllers/concert/concertController";
import { requireAuth } from "../../middlewares/auth/authMiddleware";
import {
  requireAuthInProductionMiddleware,
  logSessionInfoMiddleware,
  getCurrentUserInfo,
} from "../../middlewares/auth/conditionalAuthMiddleware";

const router = express.Router();

// 개발환경에서 세션 정보 로깅 (선택사항)
if (process.env.NODE_ENV === "development") {
  router.use(logSessionInfoMiddleware);
}

/**
 * @swagger
 * /concert:
 *   post:
 *     summary: 콘서트 정보 업로드
 *     description: |
 *       콘서트 정보를 MongoDB에 저장합니다. UID에서 timestamp를 추출하여 ObjectId로 변환합니다.
 *
 *       **개발 환경**: 로그인 없이 사용 가능 (임시 세션 자동 생성)
 *       **프로덕션 환경**: 로그인 필수
 *
 *       세션 구조: email, userId, username, profileImage?, loginTime
 *
 *       **업데이트된 스키마**:
 *
 *       - location: 문자열 배열로 간소화됨
 *       - infoImages: 이미지 URL 배열 (기존 info에서 변경)
 * 
 *       **state 상태값**:
 *       - upcoming - 예정
 *       - ongoing - 진행 중
 *       - completed - 완료
 *       - cancelled - 취소
 * 
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *       - {} # 개발환경에서는 인증 없이도 가능
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *               - title
 *               - location
 *               - datetime
 *             properties:
 *               uid:
 *                 type: string
 *                 description: 고유 콘서트 ID (timestamp 포함)
 *                 example: "concert_1703123456789_iu2024"
 *               title:
 *                 type: string
 *                 description: 콘서트 제목
 *                 example: "아이유 콘서트 2024"
 *                 maxLength: 200
 *               artist:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 아티스트 목록 (빈 배열 허용)
 *                 example: ["아이유", "특별 게스트"]
 *               location:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 공연 장소 목록 (문자열 배열로 간소화)
 *                 example: ["올림픽공원 체조경기장", "부산 BEXCO"]
 *                 minItems: 1
 *               datetime:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date-time
 *                 description: 공연 일시 목록
 *                 example: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 minItems: 1
 *               price:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     tier: { type: string, example: "VIP" }
 *                     amount: { type: number, example: 200000 }
 *                 description: 가격 정보 (선택사항)
 *               description:
 *                 type: string
 *                 description: 콘서트 설명
 *                 maxLength: 2000
 *                 example: "아이유의 특별한 겨울 콘서트"
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, RnB/ballad, tour, idol, festival, fan, other]
 *                 description: 음악 카테고리
 *                 example: ["tour", "idol"]
 *               ticketLink:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     platform: { type: string, example: "인터파크" }
 *                     url: { type: string, example: "https://ticket.interpark.com/example" }
 *                 description: 티켓 예매 링크
 *               ticketOpenDate:
 *                 type: string
 *                 format: date-time
 *                 description: 티켓 오픈 일시
 *                 example: "2024-05-01T10:00:00+09:00"
 *               posterImage:
 *                 type: string
 *                 format: uri
 *                 description: 포스터 이미지 URL
 *                 example: "https://your-bucket.s3.amazonaws.com/concerts/iu2024/poster.jpg"
 *               infoImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: 추가 정보 이미지 URL 배열 (기존 info에서 변경)
 *                 example: ["https://your-bucket.s3.amazonaws.com/concerts/iu2024/info1.jpg"]
 *               status:
 *                 type: string
 *                 enum: ["upcoming", "ongoing", "completed", "cancelled"]
 *                 default: "upcoming"
 *                 description: 콘서트 상태
 *           examples:
 *             fullExample:
 *               summary: 완전한 콘서트 등록 예시
 *               value:
 *                 uid: "concert_1703123456789_iu2024"
 *                 title: "아이유 콘서트 2024"
 *                 artist: ["아이유", "특별 게스트"]
 *                 location: ["올림픽공원 체조경기장", "부산 BEXCO"]
 *                 datetime: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 price: [{"tier": "VIP", "amount": 200000}, {"tier": "R석", "amount": 150000}]
 *                 description: "아이유의 특별한 콘서트"
 *                 category: ["idol", "tour"]
 *                 ticketLink: [{"platform": "인터파크", "url": "https://ticket.interpark.com/example"}]
 *                 ticketOpenDate: "2024-05-01T10:00:00+09:00"
 *                 posterImage: "https://your-bucket.s3.amazonaws.com/concerts/iu2024/poster.jpg"
 *                 infoImages: ["https://your-bucket.s3.amazonaws.com/concerts/iu2024/info1.jpg", "https://your-bucket.s3.amazonaws.com/concerts/iu2024/info2.jpg"]
 *                 status: "upcoming"
 *             minimalExample:
 *               summary: 최소 필수 데이터만
 *               value:
 *                 uid: "concert_1703123456789_minimal"
 *                 title: "최소 데이터 콘서트"
 *                 location: ["어딘가 공연장"]
 *                 datetime: ["2024-07-01T20:00:00+09:00"]
 *             emptyArtistExample:
 *               summary: 빈 아티스트 배열 (허용됨)
 *               value:
 *                 uid: "concert_1703123456789_unknown"
 *                 title: "미정 콘서트"
 *                 artist: []
 *                 location: ["미정"]
 *                 datetime: ["2024-12-31T19:00:00+09:00"]
 *                 infoImages: ["https://your-bucket.s3.amazonaws.com/concerts/unknown/placeholder.jpg"]
 *                 status: "upcoming"
 *             multiLocationExample:
 *               summary: 여러 장소 공연 예시
 *               value:
 *                 uid: "concert_1703123456789_multi"
 *                 title: "전국투어 콘서트 2024"
 *                 artist: ["아티스트"]
 *                 location: ["서울 올림픽공원", "부산 BEXCO", "대구 엑스코"]
 *                 datetime: ["2024-08-15T19:00:00+09:00", "2024-08-20T19:00:00+09:00", "2024-08-25T19:00:00+09:00"]
 *                 category: ["tour", "idol"]
 *                 status: "upcoming"
 *     responses:
 *       201:
 *         description: 콘서트 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "콘서트 정보 업로드 성공"
 *                 data:
 *                   $ref: '#/components/schemas/Concert'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     imageInfo:
 *                       type: object
 *                       properties:
 *                         posterImageProvided: { type: boolean }
 *                         infoImagesCount: { type: integer }
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         uploadedBy: { type: string }
 *                         username: { type: string }
 *                         environment: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증이 필요합니다 (프로덕션 환경만)
 *       409:
 *         description: 중복된 콘서트 UID
 *       500:
 *         description: 서버 에러
 */
// 콘서트 업로드 - 개발환경에서는 인증 스킵 (임시 세션 자동 생성)
router.post("/", requireAuthInProductionMiddleware, uploadConcert);

/**
 * @swagger
 * /concert:
 *   get:
 *     summary: 콘서트 목록 조회 (페이지네이션, 필터링, 정렬 지원)
 *     description: |
 *       모든 콘서트 목록을 페이지네이션과 필터링을 통해 조회합니다.
 *       로그인한 사용자의 경우 좋아요 상태도 포함됩니다.
 *       인증 없이 접근 가능합니다.
 *
 *       **업데이트된 스키마**:
 *       - location: 문자열 배열로 반환
 *       - infoImages: 이미지 URL 배열로 반환
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: 제목으로 검색
 *         example: "아이유"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, RnB/ballad, tour, idol, festival, fan, other]
 *         description: 음악 카테고리 필터
 *       - in: query
 *         name: artist
 *         schema:
 *           type: string
 *         description: 아티스트명 필터 (부분 검색)
 *         example: 아이유
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: 위치 필터 (부분 검색)
 *         example: 서울
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: 콘서트 상태 필터
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, likes, created]
 *           default: date
 *         description: 정렬 기준 (date=날짜순, likes=좋아요순, created=생성순)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 전체 텍스트 검색 (제목, 아티스트, 설명 등)
 *     responses:
 *       200:
 *         description: 콘서트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     concerts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Concert'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage: { type: integer }
 *                         totalPages: { type: integer }
 *                         totalConcerts: { type: integer }
 *                         limit: { type: integer }
 *                 metadata:
 *                   type: object
 *                 timestamp: { type: string, format: date-time }
 *       500:
 *         description: 서버 에러
 */
// 콘서트 목록 조회 - 인증 없이 가능
router.get("/", getAllConcerts);

/**
 * @swagger
 * /concert/{id}:
 *   get:
 *     summary: 특정 콘서트 정보 조회
 *     description: |
 *       ObjectId 또는 UID로 특정 콘서트의 상세 정보를 조회합니다.
 *       로그인한 사용자의 경우 좋아요 여부도 포함됩니다.
 *       인증 없이 접근 가능합니다.
 *
 *       **업데이트된 스키마**:
 *       - location: 문자열 배열로 반환
 *       - infoImages: 이미지 URL 배열로 반환
 *     tags: [Concerts - Basic]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *         example: concert_1703123456789_abc123
 *     responses:
 *       200:
 *         description: 콘서트 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "콘서트 정보 조회 성공"
 *                 data:
 *                   $ref: '#/components/schemas/Concert'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         isAuthenticated: { type: boolean }
 *                         userId: { type: string }
 *                         likedByUser: { type: boolean }
 *                     concertInfo:
 *                       type: object
 *                       properties:
 *                         likesCount: { type: integer }
 *                         status: { type: string }
 *                         hasTicketInfo: { type: boolean }
 *                         upcomingDates: { type: integer }
 *                 timestamp: { type: string, format: date-time }
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
// 특정 콘서트 조회 - 인증 없이 가능
router.get("/:id", getConcert);

/**
 * @swagger
 * /concert/{id}:
 *   put:
 *     summary: 콘서트 정보 수정
 *     description: |
 *       ObjectId 또는 UID로 특정 콘서트의 정보를 수정합니다.
 *       인증이 필요합니다. 세션의 user.email, user.userId 정보를 사용하여 권한을 확인합니다.
 *       좋아요 관련 필드(likes, likesCount)와 UID는 수정할 수 없습니다.
 *
 *       **업데이트된 스키마**:
 *       - location: 문자열 배열로 수정
 *       - infoImages: 이미지 URL 배열로 수정
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *         example: concert_1703123456789_abc123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "아이유 콘서트 2024 - 수정됨"
 *                 maxLength: 200
 *                 description: 콘서트 제목
 *               artist:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["아이유", "새로운 특별 게스트"]
 *                 description: 아티스트 목록
 *               location:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 공연 장소 목록 (문자열 배열)
 *                 example: ["서울 올림픽공원 체조경기장"]
 *                 minItems: 1
 *               datetime:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date-time
 *                 description: 공연 일시 목록
 *                 example: ["2024-06-15T19:00:00+09:00"]
 *                 minItems: 1
 *               description:
 *                 type: string
 *                 example: "수정된 콘서트 설명"
 *                 maxLength: 2000
 *                 description: 콘서트 상세 설명
 *               status:
 *                 type: string
 *                 enum: [upcoming, ongoing, completed, cancelled]
 *                 example: "upcoming"
 *                 description: 콘서트 상태
 *               ticketOpenDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-05-15T10:00:00+09:00"
 *                 description: 티켓 오픈 일시
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, RnB/ballad, tour, idol, festival, fan, other]
 *                 example: ["tour", "idol"]
 *                 description: 음악 카테고리
 *               posterImage:
 *                 type: string
 *                 format: uri
 *                 description: 포스터 이미지 URL
 *                 example: "https://your-bucket.s3.amazonaws.com/concerts/updated/poster.jpg"
 *               infoImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: 정보 이미지 URL 배열 (기존 info에서 변경)
 *                 example: ["https://your-bucket.s3.amazonaws.com/concerts/updated/info1.jpg"]
 *               price:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     tier: { type: string, example: "VIP" }
 *                     amount: { type: number, example: 180000 }
 *                 description: 가격 정보 (선택사항)
 *               ticketLink:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     platform: { type: string, example: "티켓링크" }
 *                     url: { type: string, example: "https://ticketlink.co.kr/example" }
 *                 description: 티켓 예매 링크
 *           examples:
 *             titleUpdate:
 *               summary: 제목만 수정
 *               value:
 *                 title: "아이유 콘서트 2024 - 추가 공연 확정"
 *             statusUpdate:
 *               summary: 상태 변경
 *               value:
 *                 status: "ongoing"
 *             fullUpdate:
 *               summary: 여러 필드 동시 수정
 *               value:
 *                 title: "아이유 콘서트 2024 - HEREH WORLD TOUR"
 *                 location: ["서울 올림픽공원 체조경기장", "부산 BEXCO"]
 *                 datetime: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 description: "아이유의 월드투어 한국 공연"
 *                 category: ["idol", "tour"]
 *     responses:
 *       200:
 *         description: 콘서트 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "콘서트 정보 수정 성공"
 *                 data:
 *                   $ref: '#/components/schemas/Concert'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         modifiedBy:
 *                           type: string
 *                           example: "admin@example.com"
 *                         username:
 *                           type: string
 *                           example: "admin-user"
 *                         modifiedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-07-02T10:30:00Z"
 *                     changes:
 *                       type: object
 *                       properties:
 *                         fieldsModified:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["title", "location", "datetime"]
 *                         restrictedFieldsIgnored:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-07-02T10:30:00Z"
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "수정할 데이터가 없습니다." }
 *                 error: { type: string }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       401:
 *         description: 인증이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "인증이 필요합니다." }
 *                 timestamp: { type: string, format: date-time }
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트를 찾을 수 없습니다." }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트 수정 실패" }
 *                 error: { type: string }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 */
// 콘서트 수정 - 항상 인증 필요
router.put("/:id", requireAuth, updateConcert);

/**
 * @swagger
 * /concert/{id}:
 *   delete:
 *     summary: 콘서트 삭제
 *     description: |
 *       ObjectId 또는 UID로 특정 콘서트를 삭제합니다.
 *       인증이 필요합니다. 세션의 user.email, user.userId 정보를 사용하여 권한을 확인합니다.
 *       삭제된 콘서트는 복구할 수 없으므로 주의가 필요합니다.
 *
 *       **주의사항**:
 *       - 삭제된 데이터는 복구할 수 없습니다
 *       - 좋아요 정보도 함께 삭제됩니다
 *       - 관련된 이미지 파일은 별도로 정리해야 합니다
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *         example: concert_1703123456789_abc123
 *     responses:
 *       200:
 *         description: 콘서트 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "콘서트 삭제 성공"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     uid:
 *                       type: string
 *                       example: "concert_1703123456789_abc123"
 *                     title:
 *                       type: string
 *                       example: "아이유 콘서트 2024"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         deletedBy:
 *                           type: string
 *                           example: "admin@example.com"
 *                           description: 삭제를 수행한 사용자 이메일
 *                         username:
 *                           type: string
 *                           example: "admin-user"
 *                           description: 삭제를 수행한 사용자명
 *                         deletedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-07-02T10:30:00Z"
 *                           description: 삭제된 시간
 *                     deletedConcert:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: "아이유 콘서트 2024"
 *                           description: 삭제된 콘서트 제목
 *                         uid:
 *                           type: string
 *                           example: "concert_1703123456789_abc123"
 *                           description: 삭제된 콘서트 UID
 *                         likesCount:
 *                           type: integer
 *                           example: 150
 *                           description: 삭제 당시 좋아요 수
 *                         status:
 *                           type: string
 *                           example: "upcoming"
 *                           description: 삭제 당시 콘서트 상태
 *                         locationCount:
 *                           type: integer
 *                           example: 2
 *                           description: 공연 장소 개수
 *                         datetimeCount:
 *                           type: integer
 *                           example: 3
 *                           description: 공연 일정 개수
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-07-02T10:30:00Z"
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트 ID가 필요합니다." }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       401:
 *         description: 인증이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "인증이 필요합니다." }
 *                 timestamp: { type: string, format: date-time }
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트를 찾을 수 없습니다." }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트 삭제 실패" }
 *                 error: { type: string }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 */
// 콘서트 삭제 - 항상 인증 필요
router.delete("/:id", requireAuth, deleteConcert);

// 개발환경용 디버깅 라우트
if (process.env.NODE_ENV === "development") {
  // 현재 세션 정보 확인
  router.get("/dev/session", (req, res) => {
    const userInfo = getCurrentUserInfo(req);

    res.json({
      message: "개발환경 세션 정보",
      environment: process.env.NODE_ENV,
      sessionExists: !!req.session?.user,
      userInfo,
      rawSession: req.session?.user,
      timestamp: new Date().toISOString(),
    });
  });

  // 미들웨어 테스트 라우트
  router.get(
    "/dev/test-auth",
    requireAuthInProductionMiddleware,
    (req, res) => {
      res.json({
        message: "개발환경 인증 테스트 성공",
        userInfo: getCurrentUserInfo(req),
        middleware: "requireAuthInProductionMiddleware",
        timestamp: new Date().toISOString(),
      });
    }
  );
}

export default router;
