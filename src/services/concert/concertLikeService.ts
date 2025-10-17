import { getConcertModel } from '../../models/concert/concert';
import { UserModel } from '../../models/auth/user';
import { getClient } from '../../utils/database/db';
import { ObjectId } from 'mongodb';
import logger from '../../utils/logger/logger';
import { IConcert } from '../../models/concert/base/ConcertTypes';

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

      const { page = 1, limit = 20 } = params;
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
      const total = likedConcertIds.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedIds = likedConcertIds.slice(
        (page - 1) * limit,
        page * limit,
      );

      if (paginatedIds.length === 0) {
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

      const Concert = getConcertModel();
      const concerts = await Concert.collection
        .find({ _id: { $in: paginatedIds } })
        .toArray();

      const concertMap = new Map(concerts.map((c) => [c._id.toString(), c]));
      const sortedConcerts = paginatedIds
        .map((id) => concertMap.get(id.toString()))
        .filter(Boolean) as IConcert[];

      return {
        success: true,
        data: {
          concerts: sortedConcerts.map((concert: IConcert) => ({
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
}
