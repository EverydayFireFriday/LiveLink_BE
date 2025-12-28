import { getConcertModel } from '../../models/concert/concert';
import {
  normalizeSearchQuery,
  validateAndNormalizePagination,
} from '../../models/concert/validation/ConcertSearchValidation';
import logger from '../../utils/logger/logger';
import type { IConcert } from '../../models/concert/base/ConcertTypes';

export interface ConcertServiceResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
  statusCode?: number;
}

/**
 * 콘서트 배열 정렬 헬퍼 함수
 */
function sortConcerts(concerts: IConcert[], sortBy?: string): IConcert[] {
  const sorted = [...concerts];
  const now = new Date().getTime();

  switch (sortBy) {
    case 'likes':
      // 좋아요 누른순 (좋아요 많은 순)
      return sorted.sort((a, b) => {
        const likesA = a.likesCount || 0;
        const likesB = b.likesCount || 0;
        if (likesB !== likesA) return likesB - likesA;
        // 좋아요가 같으면 날짜순
        return (
          new Date(a.datetime?.[0] || 0).getTime() -
          new Date(b.datetime?.[0] || 0).getTime()
        );
      });

    case 'created':
      // 생성일순 (최근 등록순)
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    case 'ticket_soon':
      // 예매 임박순 (티켓 오픈 날짜가 가까운 순)
      return sorted
        .filter((c) => {
          const ticketDate = c.ticketOpenDate?.[0]?.openDate
            ? new Date(c.ticketOpenDate[0].openDate).getTime()
            : 0;
          return ticketDate >= now;
        })
        .sort((a, b) => {
          const ticketA = a.ticketOpenDate?.[0]?.openDate
            ? new Date(a.ticketOpenDate[0].openDate).getTime()
            : Infinity;
          const ticketB = b.ticketOpenDate?.[0]?.openDate
            ? new Date(b.ticketOpenDate[0].openDate).getTime()
            : Infinity;
          return ticketA - ticketB;
        });

    case 'upcoming_soon':
    default: {
      // 날짜순 (미래 공연 임박순 -> 과거 공연 최신순)
      const futureConcerts = sorted.filter((c) => {
        const date = c.datetime?.[0] ? new Date(c.datetime[0]).getTime() : 0;
        return date >= now;
      });

      const pastConcerts = sorted.filter((c) => {
        const date = c.datetime?.[0] ? new Date(c.datetime[0]).getTime() : 0;
        return date < now;
      });

      // 미래 공연은 임박순(오름차순)으로 정렬
      futureConcerts.sort((a, b) => {
        const dateA = a.datetime?.[0]
          ? new Date(a.datetime[0]).getTime()
          : Infinity;
        const dateB = b.datetime?.[0]
          ? new Date(b.datetime[0]).getTime()
          : Infinity;
        return dateA - dateB;
      });

      // 과거 공연은 최신순(내림차순)으로 정렬
      pastConcerts.sort((a, b) => {
        const dateA = a.datetime?.[0] ? new Date(a.datetime[0]).getTime() : 0;
        const dateB = b.datetime?.[0] ? new Date(b.datetime[0]).getTime() : 0;
        return dateB - dateA;
      });

      return [...futureConcerts, ...pastConcerts];
    }
  }
}

export class ConcertSearchService {
  /**
   * 콘서트 텍스트 검색
   */
  static async searchConcerts(params: {
    query: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<ConcertServiceResponse> {
    try {
      const { query, page = 1, limit = 20, sortBy } = params;

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

      // 정렬 적용
      const sortedConcerts = sortConcerts(concerts, sortBy);

      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const paginatedConcerts = sortedConcerts.slice(
        skip,
        skip + normalizedLimit,
      );
      const total = sortedConcerts.length;
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

      const filter: Record<string, unknown> = {
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
    sortBy?: string;
  }): Promise<ConcertServiceResponse> {
    try {
      const { artist, page = 1, limit = 20, sortBy } = params;
      const Concert = getConcertModel();

      const allArtistConcerts = await Concert.findByArtist(artist);

      // 정렬 적용
      const sortedConcerts = sortConcerts(allArtistConcerts, sortBy);

      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = sortedConcerts.slice(skip, skip + normalizedLimit);
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
    sortBy?: string;
  }): Promise<ConcertServiceResponse> {
    try {
      const { location, page = 1, limit = 20, sortBy } = params;
      const Concert = getConcertModel();

      const allLocationConcerts = await Concert.findByLocation(location);

      // 정렬 적용
      const sortedConcerts = sortConcerts(allLocationConcerts, sortBy);

      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = sortedConcerts.slice(skip, skip + normalizedLimit);
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
    sortBy?: string;
  }): Promise<ConcertServiceResponse> {
    try {
      const { category, page = 1, limit = 20, sortBy } = params;
      const Concert = getConcertModel();

      const allCategoryConcerts = await Concert.findByCategory(category);

      // 정렬 적용
      const sortedConcerts = sortConcerts(allCategoryConcerts, sortBy);

      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = sortedConcerts.slice(skip, skip + normalizedLimit);
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
    sortBy?: string;
  }): Promise<ConcertServiceResponse> {
    try {
      const { status, page = 1, limit = 20, sortBy } = params;

      const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: '유효하지 않은 상태입니다.',
          statusCode: 400,
        };
      }

      const Concert = getConcertModel();
      const allStatusConcerts = await Concert.findByStatus(
        status as 'completed' | 'upcoming' | 'ongoing' | 'cancelled',
      );

      // 정렬 적용
      const sortedConcerts = sortConcerts(allStatusConcerts, sortBy);

      const {
        page: normalizedPage,
        limit: normalizedLimit,
        skip,
      } = validateAndNormalizePagination(page, limit);

      const concerts = sortedConcerts.slice(skip, skip + normalizedLimit);
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
