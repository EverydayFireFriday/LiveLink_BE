import { getConcertModel } from '../../models/concert/concert';
import { UserModel } from '../../models/auth/user';
import { getClient } from '../../utils/database/db';
import { ObjectId } from 'mongodb';
import logger from '../../utils/logger/logger';
import { IConcert } from '../../models/concert/base/ConcertTypes';

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

    case 'upcoming_soon':
      // 공연 임박순 (공연 날짜가 가까운 순)
      return sorted
        .filter((c) => {
          const date = c.datetime?.[0] ? new Date(c.datetime[0]).getTime() : 0;
          return date >= now;
        })
        .sort((a, b) => {
          const dateA = a.datetime?.[0]
            ? new Date(a.datetime[0]).getTime()
            : Infinity;
          const dateB = b.datetime?.[0]
            ? new Date(b.datetime[0]).getTime()
            : Infinity;
          return dateA - dateB;
        });

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

    case 'date':
    default:
      // 날짜순 (공연 날짜 빠른 순)
      return sorted.sort((a, b) => {
        const dateA = a.datetime?.[0]
          ? new Date(a.datetime[0]).getTime()
          : Infinity;
        const dateB = b.datetime?.[0]
          ? new Date(b.datetime[0]).getTime()
          : Infinity;
        if (dateA !== dateB) return dateA - dateB;
        // 날짜가 같으면 생성일순
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }
}

export interface ConcertServiceResponse {
  success: boolean;
  data?: {
    isLiked?: boolean;
    likesCount?: number;
    concerts?: IConcert[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalConcerts: number;
      limit: number;
    };
  };
  error?: string;
  statusCode?: number;
}

export class ConcertLikeService {
  /**
   * 콘서트 좋아요 상태 확인
   */
  static async getLikeStatus(
    concertIdentifier: string, // _id or uid
    userId: string,
  ): Promise<ConcertServiceResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: '로그인이 필요합니다.',
          statusCode: 401,
        };
      }

      const userModel = new UserModel();
      const user = await userModel.findById(userId);
      if (!user) {
        return {
          success: false,
          error: '사용자를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      const Concert = getConcertModel();
      const query = ObjectId.isValid(concertIdentifier)
        ? { _id: new ObjectId(concertIdentifier) }
        : { uid: concertIdentifier };
      const concert = await Concert.collection.findOne(query);

      if (!concert) {
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      const concertObjectId = concert._id; // Use the actual ObjectId
      const isLiked =
        user.likedConcerts?.some((id) => id.equals(concertObjectId)) || false;

      return {
        success: true,
        data: {
          isLiked,
          likesCount: concert.likesCount || 0,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('좋아요 상태 조회 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '좋아요 상태 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 콘서트 좋아요 추가
   */
  static async addLike(
    concertIdentifier: string, // _id or uid
    userId: string,
  ): Promise<ConcertServiceResponse> {
    const client = getClient();
    const session = client.startSession();

    try {
      if (!userId) {
        return {
          success: false,
          error: '로그인이 필요합니다.',
          statusCode: 401,
        };
      }

      const Concert = getConcertModel();
      const query = ObjectId.isValid(concertIdentifier)
        ? { _id: new ObjectId(concertIdentifier) }
        : { uid: concertIdentifier };
      const concert = await Concert.collection.findOne(query);

      if (!concert) {
        throw new Error('콘서트를 찾을 수 없습니다.');
      }
      const concertObjectId = concert._id; // Use the actual ObjectId

      const userModel = new UserModel();
      const userObjectId = new ObjectId(userId);

      let updatedConcert = concert;

      // 트랜잭션 시작
      await session.withTransaction(async () => {
        const userUpdateResult = await userModel.userCollection.updateOne(
          { _id: userObjectId },
          { $addToSet: { likedConcerts: concertObjectId } },
          { session },
        );

        if (userUpdateResult.modifiedCount > 0) {
          const result = await Concert.collection.findOneAndUpdate(
            { _id: concertObjectId },
            { $inc: { likesCount: 1 } },
            { returnDocument: 'after', session },
          );
          if (result) {
            updatedConcert = result;
          }
        }
      });

      return {
        success: true,
        data: {
          likesCount: updatedConcert?.likesCount,
          isLiked: true,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('좋아요 추가 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '좋아요 추가 실패',
        statusCode: 500,
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * 콘서트 좋아요 삭제
   */
  static async removeLike(
    concertIdentifier: string, // _id or uid
    userId: string,
  ): Promise<ConcertServiceResponse> {
    const client = getClient();
    const session = client.startSession();

    try {
      if (!userId) {
        return {
          success: false,
          error: '로그인이 필요합니다.',
          statusCode: 401,
        };
      }

      const Concert = getConcertModel();
      const query = ObjectId.isValid(concertIdentifier)
        ? { _id: new ObjectId(concertIdentifier) }
        : { uid: concertIdentifier };
      const concert = await Concert.collection.findOne(query);

      if (!concert) {
        throw new Error('콘서트를 찾을 수 없습니다.');
      }
      const concertObjectId = concert._id; // Use the actual ObjectId

      const userModel = new UserModel();
      const userObjectId = new ObjectId(userId);

      let updatedConcert = concert;

      // 트랜잭션 시작
      await session.withTransaction(async () => {
        const userUpdateResult = await userModel.userCollection.updateOne(
          { _id: userObjectId },
          { $pull: { likedConcerts: concertObjectId } },
          { session },
        );

        if (userUpdateResult.modifiedCount > 0) {
          const result = await Concert.collection.findOneAndUpdate(
            { _id: concertObjectId },
            { $inc: { likesCount: -1 } },
            { returnDocument: 'after', session },
          );
          if (result) {
            updatedConcert = result;
          }
          // 좋아요 수가 음수가 되지 않도록 보정
          if (
            updatedConcert &&
            typeof updatedConcert.likesCount === 'number' &&
            updatedConcert.likesCount < 0
          ) {
            const finalConcert = await Concert.collection.findOneAndUpdate(
              { _id: concertObjectId },
              { $set: { likesCount: 0 } },
              { returnDocument: 'after', session },
            );
            if (finalConcert) {
              updatedConcert = finalConcert;
            }
          }
        }
      });

      return {
        success: true,
        data: {
          likesCount: updatedConcert?.likesCount,
          isLiked: false,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('좋아요 삭제 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '좋아요 삭제 실패',
        statusCode: 500,
      };
    } finally {
      await session.endSession();
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
      sortBy?: string;
    },
  ): Promise<ConcertServiceResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: '로그인이 필요합니다.',
          statusCode: 401,
        };
      }

      const { page = 1, limit = 20, sortBy } = params;
      const userModel = new UserModel();
      const user = await userModel.findById(userId);

      if (!user || !user.likedConcerts || user.likedConcerts.length === 0) {
        return {
          success: true,
          data: {
            concerts: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalConcerts: 0,
              limit,
            },
          },
          statusCode: 200,
        };
      }

      const likedConcertIds = user.likedConcerts;
      const Concert = getConcertModel();

      // 모든 좋아요한 콘서트 가져오기 (정렬을 위해)
      const allConcerts = await Concert.collection
        .find({ _id: { $in: likedConcertIds } })
        .toArray();

      // 정렬 적용
      const sortedConcerts = sortConcerts(allConcerts as IConcert[], sortBy);

      const total = sortedConcerts.length;
      const totalPages = Math.ceil(total / limit);

      // 페이지네이션 적용
      const paginatedConcerts = sortedConcerts.slice(
        (page - 1) * limit,
        page * limit,
      );

      if (paginatedConcerts.length === 0 && page > 1) {
        return {
          success: true,
          data: {
            concerts: [],
            pagination: {
              currentPage: page,
              totalPages,
              totalConcerts: total,
              limit,
            },
          },
          statusCode: 200,
        };
      }

      return {
        success: true,
        data: {
          concerts: paginatedConcerts.map((concert: IConcert) => ({
            ...concert,
            isLiked: true,
          })),
          pagination: {
            currentPage: page,
            totalPages,
            totalConcerts: total,
            limit,
          },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('좋아요한 콘서트 목록 조회 서비스 에러:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '좋아요한 콘서트 목록 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 사용자가 특정 월에 좋아요한 콘서트 목록 조회
   * 해당 월에 공연이 있는 좋아요한 콘서트를 조회합니다
   */
  static async getLikedConcertsByMonth(
    userId: string,
    params: {
      year: number;
      month: number; // 1-12
      page?: number;
      limit?: number;
      sortBy?: string;
    },
  ): Promise<ConcertServiceResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: '로그인이 필요합니다.',
          statusCode: 401,
        };
      }

      const { year, month, page = 1, limit = 20, sortBy } = params;

      // 월 유효성 검증
      if (month < 1 || month > 12) {
        return {
          success: false,
          error: '올바른 월을 입력해주세요 (1-12)',
          statusCode: 400,
        };
      }

      const userModel = new UserModel();
      const user = await userModel.findById(userId);

      if (!user || !user.likedConcerts || user.likedConcerts.length === 0) {
        return {
          success: true,
          data: {
            concerts: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalConcerts: 0,
              limit,
            },
          },
          statusCode: 200,
        };
      }

      const likedConcertIds = user.likedConcerts;
      const Concert = getConcertModel();

      // 해당 월의 시작일과 종료일 계산
      const startDate = new Date(year, month - 1, 1); // month는 0-based
      const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 해당 월의 마지막 날

      // 해당 월에 공연이 있는 좋아요한 콘서트 조회
      const allConcerts = await Concert.collection
        .find({
          _id: { $in: likedConcertIds },
          datetime: {
            $elemMatch: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        })
        .toArray();

      // 정렬 적용
      const sortedConcerts = sortConcerts(allConcerts as IConcert[], sortBy);

      const total = sortedConcerts.length;
      const totalPages = Math.ceil(total / limit);

      // 페이지네이션 적용
      const paginatedConcerts = sortedConcerts.slice(
        (page - 1) * limit,
        page * limit,
      );

      return {
        success: true,
        data: {
          concerts: paginatedConcerts.map((concert: IConcert) => ({
            ...concert,
            isLiked: true,
          })),
          pagination: {
            currentPage: page,
            totalPages,
            totalConcerts: total,
            limit,
          },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('월별 좋아요한 콘서트 목록 조회 서비스 에러:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '월별 좋아요한 콘서트 목록 조회 실패',
        statusCode: 500,
      };
    }
  }
}
