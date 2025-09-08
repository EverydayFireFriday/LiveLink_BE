import express from 'express';
import { ConcertLikeService } from '../../services/concert/concertLikeService';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';

export const getLikeStatus = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    const result = await ConcertLikeService.getLikeStatus(id, userId);

    if (result.success) {
      res.status(result.statusCode!).json({
        message: '좋아요 상태 조회 성공',
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({ message: result.error });
    }
  } catch (error) {
    logger.info('좋아요 상태 조회 컨트롤러 에러:', error);
    res.status(500).json({
      message: '좋아요 상태 조회 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
    });
  }
};

export const addLike = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    const result = await ConcertLikeService.addLike(id, userId);

    if (result.success) {
      res.status(result.statusCode!).json({
        message: '좋아요 추가 성공',
        concert: result.data,
      });
    } else {
      res.status(result.statusCode!).json({ message: result.error });
    }
  } catch (error) {
    logger.info('좋아요 추가 컨트롤러 에러:', error);
    res.status(500).json({
      message: '좋아요 추가 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
    });
  }
};

export const removeLike = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    const result = await ConcertLikeService.removeLike(id, userId);

    if (result.success) {
      res.status(result.statusCode!).json({
        message: '좋아요 삭제 성공',
        concert: result.data,
      });
    } else {
      res.status(result.statusCode!).json({ message: result.error });
    }
  } catch (error) {
    logger.error('좋아요 삭제 컨트롤러 에러:', error);
    res.status(500).json({
      message: '좋아요 삭제 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
    });
  }
};

export const getLikedConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    const { page, limit } = req.query;

    const result = await ConcertLikeService.getLikedConcerts(userId, {
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      res.status(result.statusCode!).json({
        message: '좋아요한 콘서트 목록 조회 성공',
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({ message: result.error });
    }
  } catch (error) {
    logger.error('좋아요한 콘서트 목록 조회 컨트롤러 에러:', error);
    res.status(500).json({
      message: '좋아요한 콘서트 목록 조회 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
    });
  }
};
