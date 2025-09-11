import { getConcertModel } from '../../models/concert/concert';
import {
  normalizeSearchQuery,
  validateAndNormalizePagination,
} from '../../models/concert/validation/ConcertSearchValidation';
import logger from '../../utils/logger/logger';

export interface ConcertServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export class ConcertSearchService {
  /**
   * 콘서트 텍스트 검색
   */
  static async searchConcerts(params: {
    query: string;
    page?: number;
    limit?: number;
  }): Promise<ConcertServiceResponse> {
    try {
      const { query, page = 1, limit = 20 } = params;

      if (!query || typeof query !== 'string') {
        return {
          success: false,
          error: '검색어가 필요합니다.',
          statusCode: 400,
        };
      }

      const Concert = getConcertModel();
      const normalizedQuery = normalizeSearchQuery(query);
      const concerts = await Concert.searchConcerts(normalizedQuery);

      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const paginatedConcerts = concerts.slice(skip, skip + normalizedLimit);
      const total = concerts.length;
      const totalPages = Math.ceil(total / normalizedLimit);

      return {
        success: true,
        data: {
          concerts: paginatedConcerts,
          pagination: {
            currentPage: normalizedPage,
            totalPages,
            totalConcerts: total,
            limit: normalizedLimit,
          },
          searchQuery: query,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('콘서트 검색 서비스 에러:', error);
      return {
        success: false,
        error: '콘서트 검색 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 다가오는 콘서트 목록 조회
   */
  static async getUpcomingConcerts(params: {
    page?: number;
    limit?: number;
  }): Promise<ConcertServiceResponse> {
    try {
      const { page = 1, limit = 20 } = params;
      const Concert = getConcertModel();

      const allUpcomingConcerts = await Concert.findUpcoming();
      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = allUpcomingConcerts.slice(skip, skip + normalizedLimit);
      const total = allUpcomingConcerts.length;
      const totalPages = Math.ceil(total / normalizedLimit);

      return {
        success: true,
        data: {
          concerts,
          pagination: {
            currentPage: normalizedPage,
            totalPages,
            totalConcerts: total,
            limit: normalizedLimit,
          },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('다가오는 콘서트 조회 서비스 에러:', error);
      return {
        success: false,
        error: '다가오는 콘서트 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 인기 콘서트 목록 조회 (좋아요 기준)
   */
  static async getPopularConcerts(params: {
    page?: number;
    limit?: number;
    status?: string;
    minLikes?: number;
  }): Promise<ConcertServiceResponse> {
    try {
      const { page = 1, limit = 20, status, minLikes = 1 } = params;
      const Concert = getConcertModel();

      const filter: any = {
        likesCount: { $gte: parseInt(minLikes.toString()) },
      };
      if (status) filter.status = status;

      const { concerts, total } = await Concert.findMany(filter, {
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        sort: { likesCount: -1, datetime: 1 },
      });

      const totalPages = Math.ceil(total / parseInt(limit.toString()));

      return {
        success: true,
        data: {
          concerts,
          pagination: {
            currentPage: parseInt(page.toString()),
            totalPages,
            totalConcerts: total,
            limit: parseInt(limit.toString()),
          },
          filters: { status, minLikes },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('인기 콘서트 목록 조회 서비스 에러:', error);
      return {
        success: false,
        error: '인기 콘서트 목록 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 티켓 오픈 예정 콘서트 목록 조회
   */
  static async getTicketOpenConcerts(params: {
    page?: number;
    limit?: number;
  }): Promise<ConcertServiceResponse> {
    try {
      const { page = 1, limit = 20 } = params;
      const Concert = getConcertModel();

      const allTicketOpenConcerts = await Concert.findUpcomingTicketOpen();
      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = allTicketOpenConcerts.slice(
        skip,
        skip + normalizedLimit,
      );
      const total = allTicketOpenConcerts.length;
      const totalPages = Math.ceil(total / normalizedLimit);

      return {
        success: true,
        data: {
          concerts,
          pagination: {
            currentPage: normalizedPage,
            totalPages,
            totalConcerts: total,
            limit: normalizedLimit,
          },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('티켓 오픈 예정 콘서트 조회 서비스 에러:', error);
      return {
        success: false,
        error: '티켓 오픈 예정 콘서트 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 아티스트별 콘서트 목록 조회
   */
  static async getConcertsByArtist(params: {
    artist: string;
    page?: number;
    limit?: number;
  }): Promise<ConcertServiceResponse> {
    try {
      const { artist, page = 1, limit = 20 } = params;
      const Concert = getConcertModel();

      const allArtistConcerts = await Concert.findByArtist(artist);
      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = allArtistConcerts.slice(skip, skip + normalizedLimit);
      const total = allArtistConcerts.length;
      const totalPages = Math.ceil(total / normalizedLimit);

      return {
        success: true,
        data: {
          concerts,
          pagination: {
            currentPage: normalizedPage,
            totalPages,
            totalConcerts: total,
            limit: normalizedLimit,
          },
          artist,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('아티스트별 콘서트 조회 서비스 에러:', error);
      return {
        success: false,
        error: '아티스트별 콘서트 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 지역별 콘서트 목록 조회
   */
  static async getConcertsByLocation(params: {
    location: string;
    page?: number;
    limit?: number;
  }): Promise<ConcertServiceResponse> {
    try {
      const { location, page = 1, limit = 20 } = params;
      const Concert = getConcertModel();

      const allLocationConcerts = await Concert.findByLocation(location);
      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = allLocationConcerts.slice(skip, skip + normalizedLimit);
      const total = allLocationConcerts.length;
      const totalPages = Math.ceil(total / normalizedLimit);

      return {
        success: true,
        data: {
          concerts,
          pagination: {
            currentPage: normalizedPage,
            totalPages,
            totalConcerts: total,
            limit: normalizedLimit,
          },
          location,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('지역별 콘서트 조회 서비스 에러:', error);
      return {
        success: false,
        error: '지역별 콘서트 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 카테고리별 콘서트 목록 조회
   */
  static async getConcertsByCategory(params: {
    category: string;
    page?: number;
    limit?: number;
  }): Promise<ConcertServiceResponse> {
    try {
      const { category, page = 1, limit = 20 } = params;
      const Concert = getConcertModel();

      const allCategoryConcerts = await Concert.findByCategory(category);
      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = allCategoryConcerts.slice(skip, skip + normalizedLimit);
      const total = allCategoryConcerts.length;
      const totalPages = Math.ceil(total / normalizedLimit);

      return {
        success: true,
        data: {
          concerts,
          pagination: {
            currentPage: normalizedPage,
            totalPages,
            totalConcerts: total,
            limit: normalizedLimit,
          },
          category,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('카테고리별 콘서트 조회 서비스 에러:', error);
      return {
        success: false,
        error: '카테고리별 콘서트 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 상태별 콘서트 목록 조회
   */
  static async getConcertsByStatus(params: {
    status: string;
    page?: number;
    limit?: number;
  }): Promise<ConcertServiceResponse> {
    try {
      const { status, page = 1, limit = 20 } = params;

      const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: '유효하지 않은 상태입니다.',
          statusCode: 400,
        };
      }

      const Concert = getConcertModel();
      const allStatusConcerts = await Concert.findByStatus(status as any);
      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = allStatusConcerts.slice(skip, skip + normalizedLimit);
      const total = allStatusConcerts.length;
      const totalPages = Math.ceil(total / normalizedLimit);

      return {
        success: true,
        data: {
          concerts,
          pagination: {
            currentPage: normalizedPage,
            totalPages,
            totalConcerts: total,
            limit: normalizedLimit,
          },
          status,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('상태별 콘서트 조회 서비스 에러:', error);
      return {
        success: false,
        error: '상태별 콘서트 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 콘서트 통계 정보 조회
   */
  static async getConcertStats(): Promise<ConcertServiceResponse> {
    try {
      const Concert = getConcertModel();
      const stats = await Concert.getStats();

      return {
        success: true,
        data: stats,
        statusCode: 200,
      };
    } catch (error) {
      logger.error('콘서트 통계 조회 서비스 에러:', error);
      return {
        success: false,
        error: '콘서트 통계 조회 실패',
        statusCode: 500,
      };
    }
  }
}
