import express from "express";
import {
  searchConcerts,
  getUpcomingConcerts,
  getPopularConcerts,
  getTicketOpenConcerts,
  getConcertsByArtist,
  getConcertsByLocation,
  getConcertsByCategory,
  getConcertsByStatus,
  getConcertStats,
} from "../../controllers/concert/concertSearchController";

const router = express.Router();

/**
 * @swagger
 * /concert/search:
 *   get:
 *     summary: 콘서트 텍스트 검색
 *     description: 제목, 아티스트, 장소, 설명을 기준으로 콘서트를 검색합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어
 *         example: 아이유
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
 *     responses:
 *       200:
 *         description: 콘서트 검색 성공
 *       400:
 *         description: 검색어가 필요함
 *       500:
 *         description: 서버 에러
 */
router.get("/search", searchConcerts);

/**
 * @swagger
 * /concert/upcoming:
 *   get:
 *     summary: 다가오는 콘서트 목록 조회
 *     description: 현재 날짜 이후의 예정된 콘서트 목록을 조회합니다.
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
 *     responses:
 *       200:
 *         description: 다가오는 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get("/upcoming", getUpcomingConcerts);

/**
 * @swagger
 * /concert/popular:
 *   get:
 *     summary: 인기 콘서트 목록 조회 (좋아요 기준)
 *     description: 좋아요 수를 기준으로 인기 콘서트 목록을 조회합니다.
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: 콘서트 상태 필터
 *       - in: query
 *         name: minLikes
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 1
 *         description: 최소 좋아요 수
 *     responses:
 *       200:
 *         description: 인기 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get("/popular", getPopularConcerts);

/**
 * @swagger
 * /concert/ticket-open:
 *   get:
 *     summary: 티켓 오픈 예정 콘서트 목록 조회
 *     description: 티켓 오픈이 예정된 콘서트 목록을 조회합니다.
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
 *     responses:
 *       200:
 *         description: 티켓 오픈 예정 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get("/ticket-open", getTicketOpenConcerts);

/**
 * @swagger
 * /concert/stats:
 *   get:
 *     summary: 콘서트 통계 정보 조회
 *     description: 전체 콘서트의 통계 정보를 조회합니다.
 *     tags: [Concerts - Search]
 *     responses:
 *       200:
 *         description: 콘서트 통계 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get("/stats", getConcertStats);

/**
 * @swagger
 * /concert/by-artist/{artist}:
 *   get:
 *     summary: 아티스트별 콘서트 목록 조회
 *     description: 특정 아티스트의 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: path
 *         name: artist
 *         required: true
 *         schema:
 *           type: string
 *         description: 아티스트명
 *         example: 아이유
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
 *     responses:
 *       200:
 *         description: 아티스트별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get("/by-artist/:artist", getConcertsByArtist);

/**
 * @swagger
 * /concert/by-location/{location}:
 *   get:
 *     summary: 지역별 콘서트 목록 조회
 *     description: 특정 지역의 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: path
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: 지역명
 *         example: 서울
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
 *     responses:
 *       200:
 *         description: 지역별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get("/by-location/:location", getConcertsByLocation);

/**
 * @swagger
 * /concert/by-category/{category}:
 *   get:
 *     summary: 카테고리별 콘서트 목록 조회
 *     description: 특정 카테고리의 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, RnB/ballad, tour, idol, festival, fan, other]
 *         description: 음악 카테고리
 *         example: pop
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
 *     responses:
 *       200:
 *         description: 카테고리별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
router.get("/by-category/:category", getConcertsByCategory);

/**
 * @swagger
 * /concert/by-status/{status}:
 *   get:
 *     summary: 상태별 콘서트 목록 조회
 *     description: 특정 상태의 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: 콘서트 상태
 *         example: upcoming
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
 *     responses:
 *       200:
 *         description: 상태별 콘서트 목록 조회 성공
 *       400:
 *         description: 유효하지 않은 상태
 *       500:
 *         description: 서버 에러
 */
router.get("/by-status/:status", getConcertsByStatus);

export default router;
