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

/**
 * @swagger
 * /api/setlists/{concertId}:
 *   get:
 *     summary: 콘서트 셋리스트 조회
 *     description: 특정 콘서트의 셋리스트를 조회합니다. 셋리스트가 없으면 null을 반환합니다.
 *     tags: [Setlist]
 *     parameters:
 *       - in: path
 *         name: concertId
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 UID
 *     responses:
 *       200:
 *         description: 셋리스트 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SetlistResponse'
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:concertId', getSetlist);

/**
 * @swagger
 * /api/setlists:
 *   post:
 *     summary: 셋리스트 생성 또는 업데이트
 *     description: 콘서트의 셋리스트를 생성하거나 업데이트합니다. 이미 존재하면 업데이트됩니다.
 *     tags: [Setlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetlistCreateRequest'
 *     responses:
 *       200:
 *         description: 셋리스트 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SetlistResponse'
 *       201:
 *         description: 셋리스트 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SetlistResponse'
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/', createOrUpdateSetlist);

/**
 * @swagger
 * /api/setlists/{concertId}:
 *   delete:
 *     summary: 셋리스트 삭제
 *     description: 특정 콘서트의 셋리스트를 삭제합니다.
 *     tags: [Setlist]
 *     parameters:
 *       - in: path
 *         name: concertId
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 UID
 *     responses:
 *       200:
 *         description: 셋리스트 삭제 성공
 *       404:
 *         description: 셋리스트를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:concertId', deleteSetlist);

export default router;
