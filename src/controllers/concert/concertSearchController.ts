import express from 'express';
import { ConcertSearchService } from '../../services/concert/concertSearchService';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';

export const searchConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { q: query, page, limit } = req.query;

    const result = await ConcertSearchService.searchConcerts({
      query: query as string,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      return ResponseBuilder.success(res, '콘서트 검색 성공', result.data);
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '콘서트 검색 실패',
      );
    }
  } catch (error) {
    logger.error('콘서트 검색 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '콘서트 검색 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
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
      return ResponseBuilder.badRequest(
        res,
        result.error || '다가오는 콘서트 조회 실패',
      );
    }
  } catch (error) {
    logger.error('다가오는 콘서트 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '다가오는 콘서트 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
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
      return ResponseBuilder.badRequest(
        res,
        result.error || '인기 콘서트 목록 조회 실패',
      );
    }
  } catch (error) {
    logger.error('인기 콘서트 목록 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '인기 콘서트 목록 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
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
      return ResponseBuilder.badRequest(
        res,
        result.error || '티켓 오픈 예정 콘서트 조회 실패',
      );
    }
  } catch (error) {
    logger.error('티켓 오픈 예정 콘서트 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '티켓 오픈 예정 콘서트 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};

export const getConcertsByArtist = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { artist } = req.params;
    const { page, limit } = req.query;

    const result = await ConcertSearchService.getConcertsByArtist({
      artist,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        `${artist} 콘서트 목록 조회 성공`,
        result.data,
      );
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '아티스트별 콘서트 조회 실패',
      );
    }
  } catch (error) {
    logger.error('아티스트별 콘서트 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '아티스트별 콘서트 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};

export const getConcertsByLocation = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { location } = req.params;
    const { page, limit } = req.query;

    const result = await ConcertSearchService.getConcertsByLocation({
      location,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        `${location} 콘서트 목록 조회 성공`,
        result.data,
      );
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '지역별 콘서트 조회 실패',
      );
    }
  } catch (error) {
    logger.error('지역별 콘서트 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '지역별 콘서트 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};

export const getConcertsByCategory = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { category } = req.params;
    const { page, limit } = req.query;

    const result = await ConcertSearchService.getConcertsByCategory({
      category,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        `${category} 카테고리 콘서트 목록 조회 성공`,
        result.data,
      );
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '카테고리별 콘서트 조회 실패',
      );
    }
  } catch (error) {
    logger.error('카테고리별 콘서트 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '카테고리별 콘서트 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};

export const getConcertsByStatus = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { status } = req.params;
    const { page, limit } = req.query;

    const result = await ConcertSearchService.getConcertsByStatus({
      status,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      return ResponseBuilder.success(
        res,
        `${status} 상태 콘서트 목록 조회 성공`,
        result.data,
      );
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '상태별 콘서트 조회 실패',
      );
    }
  } catch (error) {
    logger.error('상태별 콘서트 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '상태별 콘서트 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
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
      return ResponseBuilder.badRequest(
        res,
        result.error || '콘서트 통계 조회 실패',
      );
    }
  } catch (error) {
    logger.error('콘서트 통계 조회 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '콘서트 통계 조회 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};
