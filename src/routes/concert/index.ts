import express from 'express';
import concertRoutes from './concertRoutes';
import concertLikeRoutes from './concertLikeRoutes';
import concertSearchRoutes from './concertSearchRoutes';
import concertBatchRoutes from './concertBatchRoutes';

const router = express.Router();

/**
 * Concert Routes 통합
 *
 * 기본 CRUD: /concert/*
 * 검색/필터: /concert/search, /concert/upcoming, etc.
 * 좋아요: /concert/:id/like, /concert/liked
 * 배치: /concert/batch/*
 */

// 1. 검색 및 특수 라우트 (먼저 등록 - 더 구체적인 경로)
router.use('/', concertSearchRoutes);

// 2. 좋아요 관련 라우트
router.use('/', concertLikeRoutes);

// 3. 배치 처리 라우트
router.use('/', concertBatchRoutes);

// 4. 기본 CRUD 라우트 (마지막에 등록 - 일반적인 경로)
router.use('/', concertRoutes);

export default router;
