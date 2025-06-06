import express from "express";
import {
  uploadConcert,
  getConcert,
  getAllConcerts,
  updateConcert,
  deleteConcert,
  addLike,
  removeLike,
  getLikedConcerts,
  getPopularConcerts,
  getLikeStatus,
  searchConcerts,
  getUpcomingConcerts,
  getTicketOpenConcerts,
  getConcertsByArtist,
  getConcertsByLocation,
  getConcertsByCategory,
  getConcertsByStatus,
  getConcertStats,
} from "../controllers/concertController";

import {
  batchUploadConcerts,
  batchUpdateConcerts,
  batchDeleteConcerts,
  batchLikeConcerts,
} from "../controllers/concertBatchConroller";

import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Concerts
 *   description: 콘서트 관리 API
 */

// === 인증이 불필요한 라우트들 (구체적인 경로 먼저) ===

/**
 * 콘서트 통계 정보 조회
 * GET /api/concert/stats
 * 누구나 콘서트 통계를 볼 수 있음
 *
 * 응답:
 * - total: 전체 콘서트 수
 * - upcoming/ongoing/completed/cancelled: 상태별 콘서트 수
 * - totalLikes: 전체 좋아요 수
 * - averageLikes: 콘서트당 평균 좋아요 수
 */
router.get("/stats", getConcertStats);

/**
 * 인기 콘서트 목록 조회 (좋아요 기준)
 * GET /api/concert/popular
 * 누구나 인기 콘서트 목록을 볼 수 있음
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 * - status: 콘서트 상태 필터 (upcoming, ongoing, completed, cancelled)
 * - minLikes: 최소 좋아요 수 (기본값: 1)
 *
 * 정렬: 좋아요 수 내림차순 → 날짜 오름차순
 */
router.get("/popular", getPopularConcerts);

/**
 * 콘서트 텍스트 검색
 * GET /api/concert/search
 * 누구나 콘서트를 검색할 수 있음
 *
 * 쿼리 파라미터:
 * - q: 검색어 (필수)
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 *
 * 검색 대상: 제목, 아티스트, 장소, 설명
 */
router.get("/search", searchConcerts);

/**
 * 다가오는 콘서트 목록 조회
 * GET /api/concert/upcoming
 * 누구나 다가오는 콘서트 목록을 볼 수 있음
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 *
 * 필터: 현재 날짜 이후의 콘서트
 * 정렬: 날짜 오름차순
 */
router.get("/upcoming", getUpcomingConcerts);

/**
 * 티켓 오픈 예정 콘서트 목록 조회
 * GET /api/concert/ticket-open
 * 누구나 티켓 오픈 예정 콘서트 목록을 볼 수 있음
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 *
 * 필터: 티켓 오픈 날짜가 설정된 콘서트
 * 정렬: 티켓 오픈 날짜 오름차순
 */
router.get("/ticket-open", getTicketOpenConcerts);

/**
 * 사용자가 좋아요한 콘서트 목록 조회
 * GET /api/concert/liked
 * 로그인된 사용자만 자신이 좋아요한 콘서트 목록을 볼 수 있음
 *
 * ⚠️ 중요: 이 라우트는 /:id 보다 먼저 정의되어야 함
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 *
 * 정렬: 좋아요한 시간 내림차순
 */
router.get("/liked", requireAuth, getLikedConcerts);

// === 배치 처리 라우트들 (인증 필요) ===
// 💡 배치 관련 컨트롤러를 별도 파일로 분리하여 관리

/**
 * 여러 콘서트 일괄 등록
 * POST /api/concert/batch
 * 로그인된 사용자만 여러 콘서트를 한 번에 등록할 수 있음
 *
 * 특징:
 * - 각 콘서트별 성공/실패 결과 리포트
 * - skipDuplicates 옵션으로 중복 UID 처리 방식 선택
 * - 부분 실패 시에도 성공한 항목들은 등록됨
 *
 * 요청 본문:
 * - concerts: 등록할 콘서트들의 배열
 * - skipDuplicates: 중복 UID 무시 여부 (기본값: false)
 */
router.post("/batch", requireAuth, batchUploadConcerts);

/**
 * 여러 콘서트 일괄 수정
 * PUT /api/concert/batch
 * 로그인된 사용자만 여러 콘서트를 한 번에 수정할 수 있음
 *
 * 특징:
 * - 각 콘서트별 성공/실패 결과 리포트
 * - continueOnError 옵션으로 에러 발생 시 계속 진행 여부 선택
 * - 부분 실패 시에도 성공한 항목들은 수정됨
 *
 * 요청 본문:
 * - updates: 수정할 콘서트들의 배열 (id, data 포함)
 * - continueOnError: 에러 발생 시 계속 진행 여부 (기본값: true)
 */
router.put("/batch", requireAuth, batchUpdateConcerts);

/**
 * 여러 콘서트 일괄 삭제
 * DELETE /api/concert/batch
 * 로그인된 사용자만 여러 콘서트를 한 번에 삭제할 수 있음
 *
 * 특징:
 * - 각 콘서트별 성공/실패/미발견 결과 리포트
 * - continueOnError 옵션으로 에러 발생 시 계속 진행 여부 선택
 * - 부분 실패 시에도 성공한 항목들은 삭제됨
 *
 * 요청 본문:
 * - ids: 삭제할 콘서트 ID들의 배열
 * - continueOnError: 에러 발생 시 계속 진행 여부 (기본값: true)
 */
router.delete("/batch", requireAuth, batchDeleteConcerts);

/**
 * 여러 콘서트 일괄 좋아요 처리
 * POST /api/concert/batch/like
 * 로그인된 사용자만 여러 콘서트에 대해 좋아요를 일괄 처리할 수 있음
 *
 * 특징:
 * - 좋아요 추가와 삭제를 한 번에 처리
 * - 각 액션별 성공/실패 결과 리포트
 * - continueOnError 옵션으로 에러 발생 시 계속 진행 여부 선택
 *
 * 요청 본문:
 * - actions: 좋아요 액션들의 배열 (concertId, action 포함)
 * - continueOnError: 에러 발생 시 계속 진행 여부 (기본값: true)
 */
router.post("/batch/like", requireAuth, batchLikeConcerts);

/**
 * 아티스트별 콘서트 목록 조회
 * GET /api/concert/by-artist/:artist
 * 누구나 특정 아티스트의 콘서트 목록을 볼 수 있음
 *
 * 매개변수:
 * - artist: 아티스트명
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 */
router.get("/by-artist/:artist", getConcertsByArtist);

/**
 * 지역별 콘서트 목록 조회
 * GET /api/concert/by-location/:location
 * 누구나 특정 지역의 콘서트 목록을 볼 수 있음
 *
 * 매개변수:
 * - location: 지역명
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 */
router.get("/by-location/:location", getConcertsByLocation);

/**
 * 카테고리별 콘서트 목록 조회
 * GET /api/concert/by-category/:category
 * 누구나 특정 카테고리의 콘서트 목록을 볼 수 있음
 *
 * 매개변수:
 * - category: 음악 카테고리 (pop, rock, jazz, classical, hiphop, electronic, indie, folk, r&b, country, musical, opera, other)
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 */
router.get("/by-category/:category", getConcertsByCategory);

/**
 * 상태별 콘서트 목록 조회
 * GET /api/concert/by-status/:status
 * 누구나 특정 상태의 콘서트 목록을 볼 수 있음
 *
 * 매개변수:
 * - status: 콘서트 상태 (upcoming, ongoing, completed, cancelled)
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 */
router.get("/by-status/:status", getConcertsByStatus);

/**
 * 모든 콘서트 목록 조회 (페이지네이션, 필터링, 정렬 지원)
 * GET /api/concert
 * 누구나 콘서트 목록을 볼 수 있음
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
 * - category: 카테고리 필터
 * - artist: 아티스트명 필터 (부분 검색)
 * - location: 위치 필터 (부분 검색)
 * - status: 콘서트 상태 필터 (upcoming, ongoing, completed, cancelled)
 * - sortBy: 정렬 기준 (date=날짜순, likes=좋아요순, created=생성순)
 */
router.get("/", getAllConcerts);

// === 인증이 필요한 라우트들 ===

/**
 * 콘서트 업로드
 * POST /api/concert
 * 로그인된 사용자만 콘서트를 업로드할 수 있음
 *
 * 필수 필드: uid, title, location, datetime
 * 선택 필드: artist, price, description, category, ticketLink, ticketOpenDate,
 *          posterImage, info, tags
 */
router.post("/", requireAuth, uploadConcert);

// === 좋아요 관련 라우트들 (구체적인 경로 먼저) ===

/**
 * 콘서트 좋아요 상태 확인
 * GET /api/concert/:id/like/status
 * 로그인된 사용자만 자신의 좋아요 상태를 확인할 수 있음
 *
 * ⚠️ 중요: /like/status는 /like보다 먼저 정의되어야 함
 *
 * 응답:
 * - isLiked: 현재 사용자의 좋아요 여부
 * - likesCount: 전체 좋아요 개수
 *
 * 매개변수:
 * - id: 콘서트 ObjectId 또는 UID
 */
router.get("/:id/like/status", requireAuth, getLikeStatus);

/**
 * 콘서트 좋아요 추가
 * POST /api/concert/:id/like
 * 로그인된 사용자만 좋아요를 추가할 수 있음
 *
 * 특징:
 * - 중복 좋아요는 불가능 (400 에러 반환)
 * - 좋아요 추가 시 likesCount 자동 증가
 * - 좋아요한 시간(likedAt) 자동 기록
 *
 * 매개변수:
 * - id: 콘서트 ObjectId 또는 UID
 */
router.post("/:id/like", requireAuth, addLike);

/**
 * 콘서트 좋아요 삭제
 * DELETE /api/concert/:id/like
 * 로그인된 사용자만 자신의 좋아요를 삭제할 수 있음
 *
 * 특징:
 * - 좋아요 삭제 시 likesCount 자동 감소
 * - 좋아요하지 않은 콘서트도 에러 없이 처리
 *
 * 매개변수:
 * - id: 콘서트 ObjectId 또는 UID
 */
router.delete("/:id/like", requireAuth, removeLike);

// === 기본 CRUD 작업 (매개변수 경로는 마지막에) ===

/**
 * 콘서트 정보 수정
 * PUT /api/concert/:id
 * 로그인된 사용자만 (본인이 업로드한 콘서트 또는 관리자)
 *
 * 주의: UID, likes, likesCount 필드는 수정할 수 없음
 *
 * 매개변수:
 * - id: 콘서트 ObjectId 또는 UID
 */
router.put("/:id", requireAuth, updateConcert);

/**
 * 콘서트 삭제
 * DELETE /api/concert/:id
 * 로그인된 사용자만 (본인이 업로드한 콘서트 또는 관리자)
 *
 * 매개변수:
 * - id: 콘서트 ObjectId 또는 UID
 */
router.delete("/:id", requireAuth, deleteConcert);

/**
 * 특정 콘서트 조회
 * GET /api/concert/:id
 * 누구나 콘서트 상세 정보를 볼 수 있음
 * 로그인한 사용자의 경우 좋아요 여부(isLiked)도 포함됨
 *
 * ⚠️ 중요: 이 라우트는 모든 구체적인 경로들보다 마지막에 정의되어야 함
 *
 * 매개변수:
 * - id: 콘서트 ObjectId 또는 UID
 */
router.get("/:id", getConcert);

export default router;