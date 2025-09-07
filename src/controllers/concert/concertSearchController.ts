import express from "express";
import { ConcertSearchService } from "../../services/concert/concertSearchService";
import { safeParseInt } from "../../utils/numberUtils";
import logger from "../../utils/logger";


export const searchConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { q: query, page, limit } = req.query;

    const result = await ConcertSearchService.searchConcerts({
      query: query as string,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "콘서트 검색 성공",
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    logger.error("콘서트 검색 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 검색 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

export const getUpcomingConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { page, limit } = req.query;

    const result = await ConcertSearchService.getUpcomingConcerts({
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "다가오는 콘서트 목록 조회 성공",
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    logger.error("다가오는 콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "다가오는 콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

export const getPopularConcerts = async (
  req: express.Request,
  res: express.Response
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
      res.status(result.statusCode!).json({
        message: "인기 콘서트 목록 조회 성공",
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    logger.error("인기 콘서트 목록 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "인기 콘서트 목록 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

export const getTicketOpenConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { page, limit } = req.query;

    const result = await ConcertSearchService.getTicketOpenConcerts({
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "티켓 오픈 예정 콘서트 목록 조회 성공",
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    logger.error("티켓 오픈 예정 콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "티켓 오픈 예정 콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

export const getConcertsByArtist = async (
  req: express.Request,
  res: express.Response
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
      res.status(result.statusCode!).json({
        message: `${artist} 콘서트 목록 조회 성공`,
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    logger.error("아티스트별 콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "아티스트별 콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

export const getConcertsByLocation = async (
  req: express.Request,
  res: express.Response
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
      res.status(result.statusCode!).json({
        message: `${location} 콘서트 목록 조회 성공`,
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    logger.error("지역별 콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "지역별 콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

export const getConcertsByCategory = async (
  req: express.Request,
  res: express.Response
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
      res.status(result.statusCode!).json({
        message: `${category} 카테고리 콘서트 목록 조회 성공`,
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    logger.error("카테고리별 콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "카테고리별 콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

export const getConcertsByStatus = async (
  req: express.Request,
  res: express.Response
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
      res.status(result.statusCode!).json({
        message: `${status} 상태 콘서트 목록 조회 성공`,
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    logger.error("상태별 콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "상태별 콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

export const getConcertStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const result = await ConcertSearchService.getConcertStats();

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "콘서트 통계 조회 성공",
        stats: result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    logger.error("콘서트 통계 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 통계 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};
