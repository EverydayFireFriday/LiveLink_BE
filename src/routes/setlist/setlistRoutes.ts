import express from 'express';
import {
  getSetlist,
  createOrUpdateSetlist,
  deleteSetlist,
} from '../../controllers/setlist';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Setlist
 *   description: 콘서트 셋리스트 관리 API
 */

// GET /api/setlists/:concertId - 셋리스트 조회
router.get('/:concertId', getSetlist);

// POST /api/setlists - 셋리스트 생성 또는 업데이트
router.post('/', createOrUpdateSetlist);

// DELETE /api/setlists/:concertId - 셋리스트 삭제
router.delete('/:concertId', deleteSetlist);

export default router;
