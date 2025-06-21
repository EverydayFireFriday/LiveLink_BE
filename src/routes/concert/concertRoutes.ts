import express from "express";
import {
  uploadConcert,
  getConcert,
  getAllConcerts,
  updateConcert,
  deleteConcert,
} from "../../controllers/concert/concertController";
import {
  requireAuth,
  requireAdmin,
} from "../../middlewares/auth/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * /concert:
 *   post:
 *     summary: 콘서트 정보 업로드
 *     description: 새로운 콘서트 정보를 시스템에 등록합니다.
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConcertCreateRequest'
 *           examples:
 *             concertExample:
 *               summary: 콘서트 등록 예시
 *               value:
 *                 uid: "concert_1703123456789_iu2024"
 *                 title: "아이유 콘서트 2024"
 *                 artist: ["아이유", "특별 게스트"]
 *                 location: [{"location": "올림픽공원 체조경기장"}]
 *                 datetime: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 price: [{"tier": "VIP", "amount": 200000}, {"tier": "R석", "amount": 150000}]
 *                 description: "아이유의 특별한 콘서트"
 *                 category: ["pop", "k-pop"]
 *                 ticketLink: [{"platform": "인터파크", "url": "https://ticket.interpark.com/example"}]
 *                 ticketOpenDate: "2024-05-01T10:00:00+09:00"
 *                 info: ["주차 가능", "음식 반입 불가", "사진 촬영 금지"]
 *                 tags: ["발라드", "K-POP", "솔로"]
 *                 status: "upcoming"
 *     responses:
 *       201:
 *         description: 콘서트 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Concert'
 *             example:
 *               message: "콘서트가 성공적으로 등록되었습니다"
 *               data:
 *                 uid: "concert_1703123456789_iu2024"
 *                 title: "아이유 콘서트 2024"
 *                 artist: ["아이유"]
 *                 location: [{"location": "올림픽공원 체조경기장"}]
 *                 datetime: ["2024-06-15T19:00:00+09:00"]
 *                 likesCount: 0
 *                 status: "upcoming"
 *                 createdAt: "2024-06-21T12:00:00Z"
 *               timestamp: "2024-06-21T12:00:00Z"
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "필수 필드가 누락되었습니다"
 *               error: "title, location, datetime은 필수 입력값입니다"
 *               timestamp: "2024-06-21T12:00:00Z"
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "인증이 필요합니다"
 *               error: "로그인이 필요한 서비스입니다"
 *               timestamp: "2024-06-21T12:00:00Z"
 *       409:
 *         description: 중복된 콘서트 UID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "이미 존재하는 콘서트입니다"
 *               error: "동일한 UID의 콘서트가 이미 등록되어 있습니다"
 *               timestamp: "2024-06-21T12:00:00Z"
 */
router.post("/", requireAuth, uploadConcert);

/**
 * @swagger
 * /concert:
 *   get:
 *     summary: 콘서트 목록 조회
 *     description: 등록된 콘서트 목록을 페이지네이션, 필터링, 정렬과 함께 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *         example: 20
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: 제목으로 검색
 *         example: "아이유"
 *       - in: query
 *         name: artist
 *         schema:
 *           type: string
 *         description: 아티스트명으로 검색
 *         example: "아이유"
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: 장소로 검색
 *         example: "올림픽공원"
 *       - in: query
 *         name: category
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [pop, rock, jazz, classical, hiphop, electronic, indie, folk, r&b, country, musical, opera, other]
 *         style: form
 *         explode: true
 *         description: 카테고리 필터 (다중 선택 가능)
 *         example: ["pop", "k-pop"]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: 콘서트 상태 필터
 *         example: "upcoming"
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: 시작 날짜 (YYYY-MM-DD)
 *         example: "2024-06-01"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: 종료 날짜 (YYYY-MM-DD)
 *         example: "2024-12-31"
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: number
 *         description: 최소 가격
 *         example: 50000
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: number
 *         description: 최대 가격
 *         example: 300000
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, title, likesCount, createdAt]
 *           default: date
 *         description: 정렬 기준
 *         example: "date"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: 정렬 순서
 *         example: "asc"
 *     responses:
 *       200:
 *         description: 콘서트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConcertListResponse'
 *             example:
 *               message: "콘서트 목록 조회 성공"
 *               data:
 *                 concerts:
 *                   - uid: "concert_1703123456789_iu2024"
 *                     title: "아이유 콘서트 2024"
 *                     artist: ["아이유"]
 *                     location: [{"location": "올림픽공원 체조경기장"}]
 *                     datetime: ["2024-06-15T19:00:00+09:00"]
 *                     likesCount: 42
 *                     isLiked: true
 *                     status: "upcoming"
 *                     createdAt: "2024-06-21T12:00:00Z"
 *                 pagination:
 *                   currentPage: 1
 *                   totalPages: 5
 *                   totalConcerts: 87
 *                   limit: 20
 *               timestamp: "2024-06-21T12:00:00Z"
 *       400:
 *         description: 잘못된 쿼리 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "잘못된 요청 파라미터입니다"
 *               error: "page는 1 이상의 정수여야 합니다"
 *               timestamp: "2024-06-21T12:00:00Z"
 */
router.get("/", getAllConcerts);

/**
 * @swagger
 * /concert/{id}:
 *   get:
 *     summary: 특정 콘서트 정보 조회
 *     description: UID를 통해 특정 콘서트의 상세 정보를 조회합니다.
 *     tags: [Concerts - Basic]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 UID
 *         example: "concert_1703123456789_iu2024"
 *     responses:
 *       200:
 *         description: 콘서트 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Concert'
 *             example:
 *               message: "콘서트 정보 조회 성공"
 *               data:
 *                 uid: "concert_1703123456789_iu2024"
 *                 title: "아이유 콘서트 2024"
 *                 artist: ["아이유", "특별 게스트"]
 *                 location: [{"location": "올림픽공원 체조경기장"}]
 *                 datetime: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 price: [{"tier": "VIP", "amount": 200000}, {"tier": "R석", "amount": 150000}]
 *                 description: "아이유의 특별한 콘서트"
 *                 category: ["pop", "k-pop"]
 *                 ticketLink: [{"platform": "인터파크", "url": "https://ticket.interpark.com/example"}]
 *                 ticketOpenDate: "2024-05-01T10:00:00+09:00"
 *                 posterImage: "https://your-bucket.s3.amazonaws.com/concerts/poster.jpg"
 *                 info: ["주차 가능", "음식 반입 불가", "사진 촬영 금지"]
 *                 tags: ["발라드", "K-POP", "솔로"]
 *                 status: "upcoming"
 *                 likesCount: 42
 *                 isLiked: true
 *                 createdAt: "2024-06-21T12:00:00Z"
 *                 updatedAt: "2024-06-21T12:00:00Z"
 *               timestamp: "2024-06-21T12:00:00Z"
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "콘서트를 찾을 수 없습니다"
 *               error: "해당 UID의 콘서트가 존재하지 않습니다"
 *               timestamp: "2024-06-21T12:00:00Z"
 */
router.get("/:id", getConcert);

/**
 * @swagger
 * /concert/{id}:
 *   put:
 *     summary: 콘서트 정보 수정
 *     description: 기존 콘서트의 정보를 수정합니다. 부분 업데이트를 지원합니다.
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 UID
 *         example: "concert_1703123456789_iu2024"
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
 *               artist:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["아이유", "새로운 특별 게스트"]
 *               location:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     location:
 *                       type: string
 *                 example: [{"location": "잠실종합운동장"}]
 *               datetime:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date-time
 *                 example: ["2024-07-15T19:00:00+09:00"]
 *               price:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     tier:
 *                       type: string
 *                     amount:
 *                       type: number
 *                 example: [{"tier": "VIP", "amount": 250000}]
 *               description:
 *                 type: string
 *                 example: "수정된 콘서트 설명"
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["pop", "ballad"]
 *               status:
 *                 type: string
 *                 enum: [upcoming, ongoing, completed, cancelled]
 *                 example: "upcoming"
 *           examples:
 *             partialUpdate:
 *               summary: 부분 수정 예시
 *               value:
 *                 title: "아이유 콘서트 2024 - 추가 공연"
 *                 datetime: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00", "2024-06-17T19:00:00+09:00"]
 *                 price: [{"tier": "VIP", "amount": 220000}, {"tier": "R석", "amount": 160000}]
 *     responses:
 *       200:
 *         description: 콘서트 정보 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Concert'
 *             example:
 *               message: "콘서트 정보가 성공적으로 수정되었습니다"
 *               data:
 *                 uid: "concert_1703123456789_iu2024"
 *                 title: "아이유 콘서트 2024 - 수정됨"
 *                 artist: ["아이유", "새로운 특별 게스트"]
 *                 location: [{"location": "잠실종합운동장"}]
 *                 datetime: ["2024-07-15T19:00:00+09:00"]
 *                 likesCount: 42
 *                 status: "upcoming"
 *                 createdAt: "2024-06-21T12:00:00Z"
 *                 updatedAt: "2024-06-21T12:30:00Z"
 *               timestamp: "2024-06-21T12:30:00Z"
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "유효하지 않은 데이터입니다"
 *               error: "날짜 형식이 올바르지 않습니다"
 *               timestamp: "2024-06-21T12:30:00Z"
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "인증이 필요합니다"
 *               error: "로그인이 필요한 서비스입니다"
 *               timestamp: "2024-06-21T12:30:00Z"
 *       403:
 *         description: 권한 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "권한이 없습니다"
 *               error: "본인이 등록한 콘서트만 수정할 수 있습니다"
 *               timestamp: "2024-06-21T12:30:00Z"
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "콘서트를 찾을 수 없습니다"
 *               error: "해당 UID의 콘서트가 존재하지 않습니다"
 *               timestamp: "2024-06-21T12:30:00Z"
 */
router.put("/:id", requireAuth, updateConcert);

/**
 * @swagger
 * /concert/{id}:
 *   delete:
 *     summary: 콘서트 삭제
 *     description: 등록된 콘서트를 시스템에서 완전히 삭제합니다.
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 UID
 *         example: "concert_1703123456789_iu2024"
 *     responses:
 *       200:
 *         description: 콘서트 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "콘서트가 성공적으로 삭제되었습니다"
 *               data:
 *                 deletedConcertId: "concert_1703123456789_iu2024"
 *                 deletedAt: "2024-06-21T12:45:00Z"
 *               timestamp: "2024-06-21T12:45:00Z"
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "인증이 필요합니다"
 *               error: "로그인이 필요한 서비스입니다"
 *               timestamp: "2024-06-21T12:45:00Z"
 *       403:
 *         description: 권한 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "권한이 없습니다"
 *               error: "본인이 등록한 콘서트만 삭제할 수 있습니다"
 *               timestamp: "2024-06-21T12:45:00Z"
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "콘서트를 찾을 수 없습니다"
 *               error: "해당 UID의 콘서트가 존재하지 않습니다"
 *               timestamp: "2024-06-21T12:45:00Z"
 *       409:
 *         description: 삭제할 수 없는 상태
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "콘서트를 삭제할 수 없습니다"
 *               error: "진행 중인 콘서트는 삭제할 수 없습니다"
 *               timestamp: "2024-06-21T12:45:00Z"
 */
router.delete("/:id", requireAuth, deleteConcert);

export default router;
