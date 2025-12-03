import express from 'express';
import { ConcertSearchService } from '../../services/concert/concertSearchService';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export const searchConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { q: query, page, limit, sortBy } = req.query;

    const result = await ConcertSearchService.searchConcerts({
      query: query as string,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
      sortBy: sortBy as string,
    });

    if (result.success) {
      return ResponseBuilder.success(res, '콘서트 검색 성공', result.data);
    } else {
      throw new BadRequestError(
        result.error || '콘서트 검색 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('콘서트 검색 컨트롤러 에러:', error);
    throw new InternalServerError(
      '콘서트 검색 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const getUpcomingConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { page, limit } = req.query;

    const result = await ConcertSearchService.getUpcomingConcerts({
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        '다가오는 콘서트 목록 조회 성공',
        result.data,
      );
    } else {
      throw new BadRequestError(
        result.error || '다가오는 콘서트 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('다가오는 콘서트 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '다가오는 콘서트 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const getPopularConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { page, limit, status, minLikes } = req.query;

    const result = await ConcertSearchService.getPopularConcerts({
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
      status: status as string,
      minLikes: safeParseInt(minLikes, 1),
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        '인기 콘서트 목록 조회 성공',
        result.data,
      );
    } else {
      throw new BadRequestError(
        result.error || '인기 콘서트 목록 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('인기 콘서트 목록 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '인기 콘서트 목록 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const getTicketOpenConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { page, limit } = req.query;

    const result = await ConcertSearchService.getTicketOpenConcerts({
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        '티켓 오픈 예정 콘서트 목록 조회 성공',
        result.data,
      );
    } else {
      throw new BadRequestError(
        result.error || '티켓 오픈 예정 콘서트 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('티켓 오픈 예정 콘서트 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '티켓 오픈 예정 콘서트 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const getConcertsByArtist = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { artist } = req.params;
    const { page, limit, sortBy } = req.query;

    const result = await ConcertSearchService.getConcertsByArtist({
      artist,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
      sortBy: sortBy as string,
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        `${artist} 콘서트 목록 조회 성공`,
        result.data,
      );
    } else {
      throw new BadRequestError(
        result.error || '아티스트별 콘서트 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('아티스트별 콘서트 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '아티스트별 콘서트 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const getConcertsByLocation = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { location } = req.params;
    const { page, limit, sortBy } = req.query;

    const result = await ConcertSearchService.getConcertsByLocation({
      location,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
      sortBy: sortBy as string,
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        `${location} 콘서트 목록 조회 성공`,
        result.data,
      );
    } else {
      throw new BadRequestError(
        result.error || '지역별 콘서트 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('지역별 콘서트 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '지역별 콘서트 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const getConcertsByCategory = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { category } = req.params;
    const { page, limit, sortBy } = req.query;

    const result = await ConcertSearchService.getConcertsByCategory({
      category,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
      sortBy: sortBy as string,
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        `${category} 카테고리 콘서트 목록 조회 성공`,
        result.data,
      );
    } else {
      throw new BadRequestError(
        result.error || '카테고리별 콘서트 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('카테고리별 콘서트 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '카테고리별 콘서트 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const getConcertsByStatus = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { status } = req.params;
    const { page, limit, sortBy } = req.query;

    const result = await ConcertSearchService.getConcertsByStatus({
      status,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
      sortBy: sortBy as string,
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        `${status} 상태 콘서트 목록 조회 성공`,
        result.data,
      );
    } else {
      throw new BadRequestError(
        result.error || '상태별 콘서트 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('상태별 콘서트 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '상태별 콘서트 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const getConcertStats = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const result = await ConcertSearchService.getConcertStats();

    if (result.success) {
      return ResponseBuilder.success(res, '콘서트 통계 조회 성공', {
        stats: result.data,
      });
    } else {
      throw new BadRequestError(
        result.error || '콘서트 통계 조회 실패',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('콘서트 통계 조회 컨트롤러 에러:', error);
    throw new InternalServerError(
      '콘서트 통계 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};
