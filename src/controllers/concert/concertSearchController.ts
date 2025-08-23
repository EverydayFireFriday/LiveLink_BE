import express from "express";
import { ConcertSearchService } from "../../services/concert/concertSearchService";
import { safeParseInt } from "../../utils/numberUtils";
import logger from "../../utils/logger";


/**
 * @swagger
 * /concert/search:
 *   get:
 *     summary: 콘서트 텍스트 검색
 *     description: 제목, 아티스트, 장소, 설명을 기준으로 콘서트를 검색합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어
 *         example: 아이유
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 콘서트 검색 성공
 *       400:
 *         description: 검색어가 필요함
 *       500:
 *         description: 서버 에러
 */
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

/**
 * @swagger
 * /concert/upcoming:
 *   get:
 *     summary: 다가오는 콘서트 목록 조회
 *     description: 현재 날짜 이후의 예정된 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 다가오는 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
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

/**
 * @swagger
 * /concert/popular:
 *   get:
 *     summary: 인기 콘서트 목록 조회 (좋아요 기준)
 *     description: 좋아요 수를 기준으로 인기 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: 콘서트 상태 필터
 *       - in: query
 *         name: minLikes
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 1
 *         description: 최소 좋아요 수
 *     responses:
 *       200:
 *         description: 인기 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
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

/**
 * @swagger
 * /concert/ticket-open:
 *   get:
 *     summary: 티켓 오픈 예정 콘서트 목록 조회
 *     description: 티켓 오픈이 예정된 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 티켓 오픈 예정 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
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

/**
 * @swagger
 * /concert/by-artist/{artist}:
 *   get:
 *     summary: 아티스트별 콘서트 목록 조회
 *     description: 특정 아티스트의 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: path
 *         name: artist
 *         required: true
 *         schema:
 *           type: string
 *         description: 아티스트명
 *         example: 아이유
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 아티스트별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
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

/**
 * @swagger
 * /concert/by-location/{location}:
 *   get:
 *     summary: 지역별 콘서트 목록 조회
 *     description: 특정 지역의 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: path
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: 지역명
 *         example: 서울
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 지역별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
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

/**
 * @swagger
 * /concert/by-category/{category}:
 *   get:
 *     summary: 카테고리별 콘서트 목록 조회
 *     description: 특정 카테고리의 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, RnB/ballad, tour, idol, festival, fan, other]
 *         description: 음악 카테고리
 *         example: pop
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 카테고리별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
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

/**
 * @swagger
 * /concert/by-status/{status}:
 *   get:
 *     summary: 상태별 콘서트 목록 조회
 *     description: 특정 상태의 콘서트 목록을 조회합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: 콘서트 상태
 *         example: upcoming
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 상태별 콘서트 목록 조회 성공
 *       400:
 *         description: 유효하지 않은 상태
 *       500:
 *         description: 서버 에러
 */
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

/**
 * @swagger
 * /concert/stats:
 *   get:
 *     summary: 콘서트 통계 정보 조회
 *     description: 전체 콘서트의 통계 정보를 조회합니다.
 *     tags: [Concerts - Search]
 *     responses:
 *       200:
 *         description: 콘서트 통계 조회 성공
 *       500:
 *         description: 서버 에러
 */
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
