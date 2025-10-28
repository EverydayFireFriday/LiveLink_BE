import express from 'express';
import { uploadTestConcert } from '../../controllers/test/testController';
import { strictLimiter } from '../../middlewares/security/rateLimitMiddleware';

const router = express.Router();

// 테스트 API에 strictLimiter 적용
router.use(strictLimiter);

/**
 * @swagger
 * /test:
 *   post:
 *     summary: 테스트 콘서트 정보 업로드
 *     description: |
 *       테스트 콘서트 정보를 concert_test 컬렉션에 저장합니다.
 *       로그인 없이 사용 가능합니다.
 *     tags: [Test]
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
 *         description: 테스트 콘서트 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "테스트 콘서트 정보 업로드 성공"
 *                 data:
 *                   $ref: '#/components/schemas/Concert'
 *       400:
 *         description: 잘못된 요청 데이터
 *       409:
 *         description: 중복된 콘서트 UID
 *       500:
 *         description: 서버 에러
 */
router.post('/', uploadTestConcert);

export default router;
