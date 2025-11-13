import express from 'express';
import { ConcertLikeService } from '../../services/concert/concertLikeService';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  BadRequestError,
  ConflictError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export const getLikeStatus = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    const result = await ConcertLikeService.getLikeStatus(id, userId);

    if (result.success) {
      return ResponseBuilder.success(res, '좋아요 상태 조회 성공', result.data);
    } else {
      throw new BadRequestError(
        result.error || '좋아요 상태 조회 실패',
        ErrorCodes.CONCERT_NOT_FOUND,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.info('좋아요 상태 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '좋아요 상태 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const addLike = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.userId;
    if (!userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    const result = await ConcertLikeService.addLike(id, userId);

    if (result.success) {
      // 세션 업데이트: 좋아요 후 최신 likedConcerts 반영
      const { UserService } = await import('../../services/auth/userService');
      const { CacheKeyBuilder } = await import('../../utils');
      const { cacheManager } = await import('../../utils/cache/cacheManager');
      const userService = new UserService();

      // 캐시 무효화 후 최신 데이터 조회 - 새로운 유틸리티 사용
      const cacheKey = CacheKeyBuilder.user(userId);
      await cacheManager.del(cacheKey);
      const updatedUser = await userService.findById(userId);

      if (updatedUser && req.session.user) {
        req.session.user = {
          ...req.session.user,
          likedConcerts: (updatedUser.likedConcerts || []).map((concertId) =>
            concertId.toString(),
          ),
        } as typeof req.session.user;
      }

      return ResponseBuilder.created(res, '좋아요 추가 성공', {
        concert: result.data,
      });
    } else {
      if (result.error?.includes('이미')) {
        throw new ConflictError(
          result.error || '이미 좋아요한 콘서트입니다',
          ErrorCodes.CONCERT_ALREADY_LIKED,
        );
      }
      throw new BadRequestError(
        result.error || '좋아요 추가 실패',
        ErrorCodes.CONCERT_NOT_FOUND,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.info('좋아요 추가 컨트롤러 에러:', error);
    throw new InternalServerError(
      '좋아요 추가 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
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
      throw new UnauthorizedError(
        '로그인이 필요합니다',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    const result = await ConcertLikeService.removeLike(id, userId);

    if (result.success) {
      // 세션 업데이트: 좋아요 취소 후 최신 likedConcerts 반영
      const { UserService } = await import('../../services/auth/userService');
      const { CacheKeyBuilder } = await import('../../utils');
      const { cacheManager } = await import('../../utils/cache/cacheManager');
      const userService = new UserService();

      // 캐시 무효화 후 최신 데이터 조회 - 새로운 유틸리티 사용
      const cacheKey = CacheKeyBuilder.user(userId);
      await cacheManager.del(cacheKey);
      const updatedUser = await userService.findById(userId);

      if (updatedUser && req.session.user) {
        req.session.user = {
          ...req.session.user,
          likedConcerts: (updatedUser.likedConcerts || []).map((concertId) =>
            concertId.toString(),
          ),
        } as typeof req.session.user;
      }

      return ResponseBuilder.success(res, '좋아요 삭제 성공', {
        concert: result.data,
      });
    } else {
      throw new BadRequestError(
        result.error || '좋아요 삭제 실패',
        ErrorCodes.CONCERT_NOT_LIKED,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('좋아요 삭제 컨트롤러 에러:', error);
    throw new InternalServerError(
      '좋아요 삭제 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
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
      throw new UnauthorizedError(
        '로그인이 필요합니다',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
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
      throw new BadRequestError(
        result.error || '좋아요한 콘서트 목록 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('좋아요한 콘서트 목록 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '좋아요한 콘서트 목록 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const getLikedConcertsByMonth = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      throw new UnauthorizedError(
        '로그인이 필요합니다',
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    }

    const { year, month, page, limit, sortBy } = req.query;

    // year와 month 유효성 검증
    if (!year || !month) {
      throw new BadRequestError(
        'year와 month 파라미터가 필요합니다',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    const yearNum = safeParseInt(year, new Date().getFullYear());
    const monthNum = safeParseInt(month, new Date().getMonth() + 1);

    const result = await ConcertLikeService.getLikedConcertsByMonth(userId, {
      year: yearNum,
      month: monthNum,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
      sortBy: sortBy as string,
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        `${yearNum}년 ${monthNum}월 좋아요한 콘서트 목록 조회 성공`,
        result.data,
      );
    } else {
      if (result.statusCode === 400) {
        throw new BadRequestError(
          result.error || '잘못된 요청',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }
      throw new BadRequestError(
        result.error || '월별 좋아요한 콘서트 목록 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('월별 좋아요한 콘서트 목록 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '월별 좋아요한 콘서트 목록 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};
