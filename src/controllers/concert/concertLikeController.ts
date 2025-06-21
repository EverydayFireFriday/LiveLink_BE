import express from "express";
import { ConcertLikeService } from "../../services/concert/concertLikeService";

/**
 * @swagger
 * /concert/{id}/like/status:
 *   get:
 *     summary: 콘서트 좋아요 상태 확인
 *     description: 로그인된 사용자의 특정 콘서트에 대한 좋아요 상태를 확인합니다.
 *     tags: [Concerts - Like]
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
 *         description: 좋아요 상태 조회 성공
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const getLikeStatus = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const result = await ConcertLikeService.getLikeStatus(id, userId);

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "좋아요 상태 조회 성공",
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({ message: result.error });
    }
  } catch (error) {
    console.error("좋아요 상태 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "좋아요 상태 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert/{id}/like:
 *   post:
 *     summary: 콘서트 좋아요 추가
 *     description: 로그인된 사용자가 특정 콘서트에 좋아요를 추가합니다.
 *     tags: [Concerts - Like]
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
 *         description: 좋아요 추가 성공
 *       400:
 *         description: 이미 좋아요한 콘서트
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const addLike = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const result = await ConcertLikeService.addLike(id, userId);

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "좋아요 추가 성공",
        concert: result.data,
      });
    } else {
      res.status(result.statusCode!).json({ message: result.error });
    }
  } catch (error) {
    console.error("좋아요 추가 컨트롤러 에러:", error);
    res.status(500).json({
      message: "좋아요 추가 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert/{id}/like:
 *   delete:
 *     summary: 콘서트 좋아요 삭제
 *     description: 로그인된 사용자가 특정 콘서트의 좋아요를 삭제합니다.
 *     tags: [Concerts - Like]
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
 *         description: 좋아요 삭제 성공
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const removeLike = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const result = await ConcertLikeService.removeLike(id, userId);

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "좋아요 삭제 성공",
        concert: result.data,
      });
    } else {
      res.status(result.statusCode!).json({ message: result.error });
    }
  } catch (error) {
    console.error("좋아요 삭제 컨트롤러 에러:", error);
    res.status(500).json({
      message: "좋아요 삭제 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert/liked:
 *   get:
 *     summary: 사용자가 좋아요한 콘서트 목록 조회
 *     description: 로그인된 사용자가 좋아요한 콘서트 목록을 페이지네이션과 함께 조회합니다.
 *     tags: [Concerts - Like]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 좋아요한 콘서트 목록 조회 성공
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 에러
 */
export const getLikedConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const { page, limit } = req.query;

    const result = await ConcertLikeService.getLikedConcerts(userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "좋아요한 콘서트 목록 조회 성공",
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({ message: result.error });
    }
  } catch (error) {
    console.error("좋아요한 콘서트 목록 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "좋아요한 콘서트 목록 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};
