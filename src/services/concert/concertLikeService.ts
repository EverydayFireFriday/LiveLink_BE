import { getConcertModel } from "../../models/concert/concert";
import logger from "../../utils/logger";

export interface ConcertServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export class ConcertLikeService {
  /**
   * 콘서트 좋아요 상태 확인
   */
  static async getLikeStatus(
    concertId: string,
    userId: string
  ): Promise<ConcertServiceResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: "로그인이 필요합니다.",
          statusCode: 401,
        };
      }

      const Concert = getConcertModel();
      const concert = await Concert.findById(concertId);

      if (!concert) {
        return {
          success: false,
          error: "콘서트를 찾을 수 없습니다.",
          statusCode: 404,
        };
      }

      const isLiked =
        concert.likes?.some(
          (like: any) => like.userId?.toString() === userId.toString()
        ) || false;

      return {
        success: true,
        data: {
          isLiked,
          likesCount: concert.likesCount || 0,
          concert: {
            id: concert._id,
            uid: concert.uid,
            title: concert.title,
          },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error("좋아요 상태 조회 서비스 에러:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "좋아요 상태 조회 실패",
        statusCode: 500,
      };
    }
  }

  /**
   * 콘서트 좋아요 추가
   */
  static async addLike(
    concertId: string,
    userId: string
  ): Promise<ConcertServiceResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: "로그인이 필요합니다.",
          statusCode: 401,
        };
      }

      const Concert = getConcertModel();
      const concert = await Concert.findById(concertId);

      if (!concert) {
        return {
          success: false,
          error: "콘서트를 찾을 수 없습니다.",
          statusCode: 404,
        };
      }

      // 이미 좋아요한지 확인
      let isAlreadyLiked = false;
      try {
        if (concert.likes && Array.isArray(concert.likes)) {
          isAlreadyLiked = concert.likes.some((like: any) => {
            if (!like || !like.userId) return false;
            try {
              return like.userId.toString() === userId.toString();
            } catch (error) {
              logger.warn("좋아요 중복 검사 비교 중 에러:", error);
              return false;
            }
          });
        }
      } catch (error) {
        logger.warn("좋아요 중복 검사 전체 에러:", error);
        isAlreadyLiked = false;
      }

      if (isAlreadyLiked) {
        return {
          success: false,
          error: "이미 좋아요한 콘서트입니다.",
          statusCode: 400,
        };
      }

      const updatedConcert = await Concert.addLike(concertId, userId);

      return {
        success: true,
        data: {
          id: updatedConcert._id,
          uid: updatedConcert.uid,
          title: updatedConcert.title,
          likesCount: updatedConcert.likesCount,
          isLiked: true,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error("좋아요 추가 서비스 에러:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "좋아요 추가 실패",
        statusCode: 500,
      };
    }
  }

  /**
   * 콘서트 좋아요 삭제
   */
  static async removeLike(
    concertId: string,
    userId: string
  ): Promise<ConcertServiceResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: "로그인이 필요합니다.",
          statusCode: 401,
        };
      }

      const Concert = getConcertModel();
      const concert = await Concert.findById(concertId);

      if (!concert) {
        return {
          success: false,
          error: "콘서트를 찾을 수 없습니다.",
          statusCode: 404,
        };
      }

      const updatedConcert = await Concert.removeLike(concertId, userId);

      return {
        success: true,
        data: {
          id: updatedConcert._id,
          uid: updatedConcert.uid,
          title: updatedConcert.title,
          likesCount: updatedConcert.likesCount,
          isLiked: false,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error("좋아요 삭제 서비스 에러:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "좋아요 삭제 실패",
        statusCode: 500,
      };
    }
  }

  /**
   * 사용자가 좋아요한 콘서트 목록 조회
   */
  static async getLikedConcerts(
    userId: string,
    params: {
      page?: number;
      limit?: number;
    }
  ): Promise<ConcertServiceResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: "로그인이 필요합니다.",
          statusCode: 401,
        };
      }

      const { page = 1, limit = 20 } = params;
      const Concert = getConcertModel();

      const { concerts, total } = await Concert.findLikedByUser(userId, {
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
      });

      const totalPages = Math.ceil(total / parseInt(limit.toString()));

      return {
        success: true,
        data: {
          concerts: concerts.map((concert: any) => ({
            ...concert,
            isLiked: true, // 좋아요한 콘서트 목록이므로 항상 true
          })),
          pagination: {
            currentPage: parseInt(page.toString()),
            totalPages,
            totalConcerts: total,
            limit: parseInt(limit.toString()),
          },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error("좋아요한 콘서트 목록 조회 서비스 에러:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "좋아요한 콘서트 목록 조회 실패",
        statusCode: 500,
      };
    }
  }
}
