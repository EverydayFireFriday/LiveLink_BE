// routes/article/index.ts
import express from 'express';
import articleRoutes from './articleRoutes';
import articleLikeRoutes from './articleLikeRoutes';
import articleCommentRoutes from './articleCommentRoutes';
import articleBookmarkRoutes from './articleBookmarkRoutes';

const router = express.Router();

// articleRoutes를 가장 먼저 등록
router.use('/', articleRoutes);

// 나머지 라우터 등록
router.use('/', articleLikeRoutes);
router.use('/', articleCommentRoutes);
router.use('/', articleBookmarkRoutes);

export default router;
