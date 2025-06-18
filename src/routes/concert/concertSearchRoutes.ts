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
 * @route GET /concert/search
 * @desc 콘서트 텍스트 검색
 * @access Public
 */
router.get("/search", searchConcerts);

/**
 * @route GET /concert/upcoming
 * @desc 다가오는 콘서트 목록 조회
 * @access Public
 */
router.get("/upcoming", getUpcomingConcerts);

/**
 * @route GET /concert/popular
 * @desc 인기 콘서트 목록 조회 (좋아요 기준)
 * @access Public
 */
router.get("/popular", getPopularConcerts);

/**
 * @route GET /concert/ticket-open
 * @desc 티켓 오픈 예정 콘서트 목록 조회
 * @access Public
 */
router.get("/ticket-open", getTicketOpenConcerts);

/**
 * @route GET /concert/stats
 * @desc 콘서트 통계 정보 조회
 * @access Public
 */
router.get("/stats", getConcertStats);

/**
 * @route GET /concert/by-artist/:artist
 * @desc 아티스트별 콘서트 목록 조회
 * @access Public
 */
router.get("/by-artist/:artist", getConcertsByArtist);

/**
 * @route GET /concert/by-location/:location
 * @desc 지역별 콘서트 목록 조회
 * @access Public
 */
router.get("/by-location/:location", getConcertsByLocation);

/**
 * @route GET /concert/by-category/:category
 * @desc 카테고리별 콘서트 목록 조회
 * @access Public
 */
router.get("/by-category/:category", getConcertsByCategory);

/**
 * @route GET /concert/by-status/:status
 * @desc 상태별 콘서트 목록 조회
 * @access Public
 */
router.get("/by-status/:status", getConcertsByStatus);

export default router;
