import express from 'express';
import { ConcertLikeService } from '../../services/concert/concertLikeService';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';

export const getLikeStatus = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      return ResponseBuilder.unauthorized(res, '로그인이 필요합니다');
    }

    const result = await ConcertLikeService.getLikeStatus(id, userId);

    if (result.success) {
      return ResponseBuilder.success(res, '좋아요 상태 조회 성공', result.data);
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '좋아요 상태 조회 실패',
      );
    }
  } catch (error) {
    logger.info('좋아요 상태 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '좋아요 상태 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};

export const addLike = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      return ResponseBuilder.unauthorized(res, '로그인이 필요합니다');
    }

    const result = await ConcertLikeService.addLike(id, userId);

    if (result.success) {
      // 세션 업데이트: 좋아요 후 최신 likedConcerts 반영
      const { UserService } = await import('../../services/auth/userService');
      const { cacheManager } = await import('../../utils/cache/cacheManager');
      const userService = new UserService();

      // 캐시 무효화 후 최신 데이터 조회
      const cacheKey = `user:${userId}`;
      await cacheManager.del(cacheKey);
      const updatedUser = await userService.findById(userId);

      if (updatedUser && req.session.user) {
        req.session.user = {
          ...req.session.user,
          likedConcerts: (updatedUser.likedConcerts || []).map((id) =>
            String(id),
          ),
        } as typeof req.session.user;
      }

      return ResponseBuilder.created(res, '좋아요 추가 성공', {
        concert: result.data,
      });
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '좋아요 추가 실패',
      );
    }
  } catch (error) {
    logger.info('좋아요 추가 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '좋아요 추가 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
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
      return ResponseBuilder.unauthorized(res, '로그인이 필요합니다');
    }

    const result = await ConcertLikeService.removeLike(id, userId);

    if (result.success) {
      // 세션 업데이트: 좋아요 취소 후 최신 likedConcerts 반영
      const { UserService } = await import('../../services/auth/userService');
      const { cacheManager } = await import('../../utils/cache/cacheManager');
      const userService = new UserService();

      // 캐시 무효화 후 최신 데이터 조회
      const cacheKey = `user:${userId}`;
      await cacheManager.del(cacheKey);
      const updatedUser = await userService.findById(userId);

      if (updatedUser && req.session.user) {
        req.session.user = {
          ...req.session.user,
          likedConcerts: (updatedUser.likedConcerts || []).map((id) =>
            String(id),
          ),
        } as typeof req.session.user;
      }

      return ResponseBuilder.success(res, '좋아요 삭제 성공', {
        concert: result.data,
      });
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '좋아요 삭제 실패',
      );
    }
  } catch (error) {
    logger.error('좋아요 삭제 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '좋아요 삭제 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};

export const getLikedConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      return ResponseBuilder.unauthorized(res, '로그인이 필요합니다');
    }

    const { page, limit, sortBy } = req.query;

    const result = await ConcertLikeService.getLikedConcerts(userId, {
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
      sortBy: sortBy as string,
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        '좋아요한 콘서트 목록 조회 성공',
        result.data,
      );
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '좋아요한 콘서트 목록 조회 실패',
      );
    }
  } catch (error) {
    logger.error('좋아요한 콘서트 목록 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '좋아요한 콘서트 목록 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};
