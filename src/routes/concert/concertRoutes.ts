import express from 'express';
import {
  deleteConcert,
  getAllConcerts,
  getConcert,
  getLatestConcerts,
  getRandomConcerts,
  updateConcert,
  uploadConcert,
} from '../../controllers/concert/concertController';
import { requireAuth } from '../../middlewares/auth/authMiddleware';
import {
  getCurrentUserInfo,
  logSessionInfoMiddleware,
  requireAuthInProductionMiddleware,
} from '../../middlewares/auth/conditionalAuthMiddleware';

const router = express.Router();

// 개발환경에서 세션 정보 로깅 (선택사항)
if (process.env.NODE_ENV === 'development') {
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
 *       **필드 분류**:
 *       - **필수 필드 (9개)**: uid, title, artist, location, datetime, status, _id, createdAt, updatedAt
 *       - **옵셔널 필드 (10개)**: price, description, category, ticketLink, ticketOpenDate, posterImage, infoImages, likes, likesCount
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
 *             # === 필수 필드 ===
 *             required:
 *               - uid
 *               - title
 *               - location
 *               - status
 *             properties:
 *               # === 필수 필드 (Required Fields) ===
 *               uid:
 *                 type: string
 *                 description: "[필수] 고유 콘서트 ID (timestamp 포함)"
 *                 example: "concert_1703123456789_iu2024"
 *               title:
 *                 type: string
 *                 description: "[필수] 콘서트 제목"
 *                 example: "아이유 콘서트 2024"
 *                 maxLength: 200
 *               artist:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "[옵셔널] 아티스트 목록 (빈 배열 허용)"
 *                 example: ["아이유", "특별 게스트"]
 *               location:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "[필수] 공연 장소 목록 (문자열 배열로 간소화)"
 *                 example: ["올림픽공원 체조경기장", "부산 BEXCO"]
 *                 minItems: 1
 *               datetime:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date-time
 *                 description: "[옵셔널] 공연 일시 목록 (날짜 미정인 경우 빈 배열 또는 생략 가능)"
 *                 example: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *               status:
 *                 type: string
 *                 enum: ["upcoming", "ongoing", "completed", "cancelled"]
 *                 default: "upcoming"
 *                 description: "[필수] 콘서트 상태"
 *
 *               # === 옵셔널 필드 (Optional Fields) ===
 *               price:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     tier: { type: string, example: "VIP" }
 *                     amount: { type: number, example: 200000 }
 *                 description: "[옵셔널] 가격 정보"
 *               description:
 *                 type: string
 *                 description: "[옵셔널] 콘서트 설명"
 *                 maxLength: 2000
 *                 example: "아이유의 특별한 겨울 콘서트"
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, RnB/ballad, tour, idol, festival, fan, other]
 *                 description: "[옵셔널] 음악 카테고리"
 *                 example: ["tour", "idol"]
 *               ticketLink:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     platform: { type: string, example: "인터파크" }
 *                     url: { type: string, example: "https://ticket.interpark.com/example" }
 *                 description: "[옵셔널] 티켓 예매 링크"
 *               ticketOpenDate:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     openTitle:
 *                       type: string
 *                       example: "선예매 오픈"
 *                     openDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-11-01T10:00:00Z"
 *                 description: "[옵셔널] 티켓 오픈 일시 목록"
 *                 example: [{"openTitle": "선예매 오픈", "openDate": "2024-11-01T10:00:00Z"}, {"openTitle": "일반예매 오픈", "openDate": "2024-11-05T10:00:00Z"}]
 *               posterImage:
 *                 type: string
 *                 format: uri
 *                 description: "[옵셔널] 포스터 이미지 URL"
 *                 example: "https://your-bucket.s3.amazonaws.com/concerts/iu2024/poster.jpg"
 *               infoImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: "[옵셔널] 추가 정보 이미지 URL 배열 (기존 info에서 변경)"
 *                 example: ["https://your-bucket.s3.amazonaws.com/concerts/iu2024/info1.jpg"]
 *               likes:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: "[옵셔널] 좋아요 배열 (시스템 자동 생성)"
 *                 readOnly: true
 *               likesCount:
 *                 type: number
 *                 description: "[옵셔널] 좋아요 개수 (시스템 자동 계산)"
 *                 readOnly: true
 *                 example: 0
 *           examples:
 *             fullExample:
 *               summary: 완전한 콘서트 등록 예시 (모든 옵셔널 필드 포함)
 *               value:
 *                 uid: "concert_1703123456789_iu2024"
 *                 title: "아이유 콘서트 2024"
 *                 artist: ["아이유", "특별 게스트"]
 *                 location: ["올림픽공원 체조경기장", "부산 BEXCO"]
 *                 datetime: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 status: "upcoming"
 *                 price: [{"tier": "VIP", "amount": 200000}, {"tier": "R석", "amount": 150000}]
 *                 description: "아이유의 특별한 콘서트"
 *                 category: ["idol", "tour"]
 *                 ticketLink: [{"platform": "인터파크", "url": "https://ticket.interpark.com/example"}]
 *                 ticketOpenDate: [{"openTitle": "선예매 오픈", "openDate": "2024-05-01T10:00:00+09:00"}, {"openTitle": "일반예매 오픈", "openDate": "2024-05-05T10:00:00+09:00"}]
 *                 posterImage: "https://your-bucket.s3.amazonaws.com/concerts/iu2024/poster.jpg"
 *                 infoImages: ["https://your-bucket.s3.amazonaws.com/concerts/iu2024/info1.jpg", "https://your-bucket.s3.amazonaws.com/concerts/iu2024/info2.jpg"]
 *             minimalExample:
 *               summary: 최소 필수 데이터만 (필수 필드만)
 *               value:
 *                 uid: "concert_1703123456789_minimal"
 *                 title: "최소 데이터 콘서트"
 *                 artist: ["아티스트명"]
 *                 location: ["어딘가 공연장"]
 *                 datetime: ["2024-07-01T20:00:00+09:00"]
 *                 status: "upcoming"
 *             dateNotDecidedExample:
 *               summary: 날짜 미정 콘서트 (datetime 빈 배열 또는 생략)
 *               value:
 *                 uid: "concert_1703123456789_tbd"
 *                 title: "날짜 미정 콘서트"
 *                 artist: ["아티스트명"]
 *                 location: ["공연장 미정"]
 *                 datetime: []
 *                 status: "upcoming"
 *                 description: "날짜가 곧 공지될 예정입니다"
 *             emptyArtistExample:
 *               summary: 빈 아티스트 배열 (허용됨)
 *               value:
 *                 uid: "concert_1703123456789_unknown"
 *                 title: "아티스트 미정 콘서트"
 *                 artist: []
 *                 location: ["미정"]
 *                 status: "upcoming"
 *                 infoImages: ["https://your-bucket.s3.amazonaws.com/concerts/unknown/placeholder.jpg"]
 *             multiLocationExample:
 *               summary: 여러 장소 공연 예시
 *               value:
 *                 uid: "concert_1703123456789_multi"
 *                 title: "전국투어 콘서트 2024"
 *                 artist: ["아티스트"]
 *                 location: ["서울 올림픽공원", "부산 BEXCO", "대구 엑스코"]
 *                 datetime: ["2024-08-15T19:00:00+09:00", "2024-08-20T19:00:00+09:00", "2024-08-25T19:00:00+09:00"]
 *                 status: "upcoming"
 *                 category: ["tour", "idol"]
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
 *                     fieldInfo:
 *                       type: object
 *                       properties:
 *                         requiredFieldsProvided: { type: integer, example: 6 }
 *                         optionalFieldsProvided: { type: integer, example: 4 }
 *                         totalFields: { type: integer, example: 10 }
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
 *         description: |
 *           잘못된 요청 데이터
 *           - 필수 필드 누락: uid, title, artist, location, datetime, status
 *           - 데이터 형식 오류
 *       401:
 *         description: 인증이 필요합니다 (프로덕션 환경만)
 *       409:
 *         description: 중복된 콘서트 UID
 *       500:
 *         description: 서버 에러
 */
// 콘서트 업로드 - 개발환경에서는 인증 스킵 (임시 세션 자동 생성)
router.post('/', requireAuthInProductionMiddleware, uploadConcert);

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
 *       **정렬 옵션**:
 *       - date: 공연 날짜순 (기본값)
 *       - likes: 좋아요 많은 순
 *       - created: 최근 등록순
 *       - upcoming_soon: 공연 임박순 (공연이 가장 가까운 순)
 *       - ticket_soon: 예매 임박순 (티켓 오픈이 가장 가까운 순)
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
 *           enum: [date, likes, created, upcoming_soon, ticket_soon]
 *           default: date
 *         description: |
 *           정렬 기준
 *           - date: 날짜순 (공연 날짜 빠른 순)
 *           - likes: 좋아요순 (좋아요 많은 순)
 *           - created: 생성순 (최근 등록순)
 *           - upcoming_soon: 공연 임박순 (공연 날짜가 가장 가까운 순)
 *           - ticket_soon: 예매 임박순 (티켓 오픈 날짜가 가장 가까운 순)
 *         example: upcoming_soon
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
router.get('/', getAllConcerts);

/**
 * @swagger
 * /concert/random:
 *   get:
 *     summary: 랜덤 콘서트 목록 조회
 *     description: |
 *       upcoming 또는 ongoing 상태의 콘서트 중에서 무작위로 지정된 수만큼 조회합니다.
 *       MongoDB의 $sample 파이프라인을 사용하여 효율적으로 랜덤 샘플링을 수행합니다.
 *       로그인한 사용자의 경우 각 콘서트에 대한 좋아요 여부(likedByUser)가 포함됩니다.
 *
 *       **주요 특징**:
 *       - **효율적인 랜덤 샘플링**: DB에서 직접 $sample을 사용하여 빠르고 메모리 효율적입니다.
 *       - **상태 필터링**: upcoming 또는 ongoing 상태의 콘서트만 대상으로 합니다.
 *       - **사용자 맞춤 정보**: 로그인 시 좋아요 여부를 함께 제공합니다.
 *
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           default: 10
 *         description: 조회할 랜덤 콘서트의 수
 *     responses:
 *       200:
 *         description: 랜덤 콘서트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "랜덤 콘서트 목록 조회 성공"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Concert'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 10
 *                     filter:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["upcoming", "ongoing"]
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         isAuthenticated:
 *                           type: boolean
 *                           example: true
 *                         userId:
 *                           type: string
 *                           example: "60d21b4667d0d8992e610c85"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: '잘못된 요청 (예: limit 값 초과)'
 *       500:
 *         description: 서버 에러
 */
router.get('/random', getRandomConcerts);

/**
 * @swagger
 * /concert/latest:
 *   get:
 *     summary: 최신 콘서트 목록 조회
 *     description: |
 *       upcoming 또는 ongoin 상태인 콘서트 중에서 최신 등록된 순서대로 조회합니다.
 *       로그인한 사용자의 경우 각 콘서트에 대한 좋아요 여부(likedByUser)가 포함됩니다.
 *
 *       **주요 특징**:
 *       - **최신 등록순 정렬**: createdAt 필드를 기준으로 내림차순 정렬됩니다.
 *       - **상태 필터링**: status가 upcoming 또는 ongoing인 공연만 조회합니다.
 *       - **사용자 맞춤 정보**: 로그인 시 좋아요 여부를 함께 제공합니다.
 *
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 15
 *         description: 조회할 최신 콘서트의 수
 *     responses:
 *       200:
 *         description: 최신 콘서트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "최신 콘서트 목록 조회 성공"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Concert'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 15
 *                     filter:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["upcoming", "ongoing"]
 *                     sort:
 *                       type: string
 *                       example: "createdAt: -1"
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         isAuthenticated:
 *                           type: boolean
 *                           example: true
 *                         userId:
 *                           type: string
 *                           example: "60d21b4667d0d8992e610c85"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: '잘못된 요청 (예: limit 값 초과)'
 *       500:
 *         description: 서버 에러
 */
router.get('/latest', getLatestConcerts);

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
router.get('/:id', getConcert);

/**
 * @swagger
 * /concert/{id}:
 *   put:
 *     summary: 콘서트 정보 수정
 *     description: |
 *       ObjectId 또는 UID로 특정 콘서트의 정보를 수정합니다.
 *       좋아요 관련 필드(likes, likesCount)와 UID는 수정할 수 없습니다.
 *
 *       **개발 환경**: 로그인 없이 사용 가능 (임시 세션 자동 생성)
 *       **프로덕션 환경**: 로그인 필수
 *
 *       **업데이트된 스키마**:
 *       - location: 문자열 배열로 수정
 *       - infoImages: 이미지 URL 배열로 수정
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *       - {} # 개발환경에서는 인증 없이도 가능
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
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     openTitle:
 *                       type: string
 *                       example: "선예매 오픈"
 *                     openDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-11-01T10:00:00Z"
 *                 description: 티켓 오픈 일시 목록
 *                 example: [{"openTitle": "선예매 오픈", "openDate": "2024-11-01T10:00:00Z"}, {"openTitle": "일반예매 오픈", "openDate": "2024-11-05T10:00:00Z"}]
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
// 콘서트 수정 - 개발환경에서는 인증 스킵
router.put('/:id', requireAuthInProductionMiddleware, updateConcert);

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
router.delete('/:id', requireAuth, deleteConcert);

// 개발환경용 디버깅 라우트
if (process.env.NODE_ENV === 'development') {
  // 현재 세션 정보 확인
  router.get('/dev/session', (req, res) => {
    const userInfo = getCurrentUserInfo(req);

    res.json({
      message: '개발환경 세션 정보',
      environment: process.env.NODE_ENV,
      sessionExists: !!req.session?.user,
      userInfo,
      rawSession: req.session?.user,
      timestamp: new Date().toISOString(),
    });
  });

  // 미들웨어 테스트 라우트
  router.get(
    '/dev/test-auth',
    requireAuthInProductionMiddleware,
    (req, res) => {
      res.json({
        message: '개발환경 인증 테스트 성공',
        userInfo: getCurrentUserInfo(req),
        middleware: 'requireAuthInProductionMiddleware',
        timestamp: new Date().toISOString(),
      });
    },
  );
}

export default router;
