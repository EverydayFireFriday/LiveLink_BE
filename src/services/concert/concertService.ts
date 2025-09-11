import { ObjectId } from 'mongodb';
import { getConcertModel } from '../../models/concert/concert';
import logger from '../../utils/logger/logger';

import {
  validateConcertData,
} from '../../models/concert/validation/ConcertCreateValidation';
import {
  validateConcertUpdateData,
} from '../../models/concert/validation/ConcertUpdateValidation';
import {
  generateObjectIdFromUid,
  isValidImageUrl,
} from '../../models/concert/validation/ConcertValidationUtils';

// Model의 Concert 타입을 그대로 사용 (I 접두사 제거)
import type { IConcert } from '../../models/concert/base/ConcertTypes';

export interface CreateConcertRequest {
  uid: string;
  title: string;
  artist?: string[];
  location: string[]; // ILocation[] -> string[]로 변경
  datetime: string[];
  price?: Array<{ tier: string; amount: number }>;
  description?: string;
  category?: string[];
  ticketLink?: Array<{ platform: string; url: string }>;
  ticketOpenDate?: string;
  posterImage?: string;
  infoImages?: string[]; // info -> infoImages로 변경
}

export interface ConcertServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export class ConcertService {
  /**
   * 새 콘서트 생성
   */
  static async createConcert(
    concertData: CreateConcertRequest,
  ): Promise<ConcertServiceResponse> {
    try {
      // 1. 데이터 유효성 검증
      const validationResult = validateConcertData(concertData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.message,
          statusCode: 400,
        };
      }

      const ConcertModel = getConcertModel();

      // 2. UID 중복 확인
      const existingConcert = await ConcertModel.findByUid(concertData.uid);
      if (existingConcert) {
        return {
          success: false,
          error: '이미 존재하는 콘서트 UID입니다.',
          statusCode: 409, // Conflict
        };
      }

      // 3. 이미지 URL 유효성 검증 (선택사항)
      if (
        concertData.posterImage &&
        !isValidImageUrl(concertData.posterImage)
      ) {
        return {
          success: false,
          error: '올바르지 않은 포스터 이미지 URL입니다.',
          statusCode: 400,
        };
      }

      // 4. infoImages URL 유효성 검증 (선택사항)
      if (concertData.infoImages && Array.isArray(concertData.infoImages)) {
        for (const imageUrl of concertData.infoImages) {
          if (!isValidImageUrl(imageUrl)) {
            return {
              success: false,
              error: '올바르지 않은 정보 이미지 URL입니다.',
              statusCode: 400,
            };
          }
        }
      }

      // 5. ObjectId 생성
      let mongoId: ObjectId;
      try {
        mongoId = generateObjectIdFromUid(concertData.uid);

        // ObjectId 중복 확인
        const existingById = await ConcertModel.findById(mongoId.toString());
        if (existingById) {
          mongoId = new ObjectId();
        }
      } catch (error) {
        mongoId = new ObjectId();
      }

      // 6. 데이터 정규화 및 준비 - Model의 Concert 타입 사용
      const processedData: Omit<IConcert, 'createdAt' | 'updatedAt'> = {
        _id: mongoId,
        uid: concertData.uid,
        title: concertData.title,
        artist: Array.isArray(concertData.artist)
          ? concertData.artist
          : concertData.artist
            ? [concertData.artist]
            : [],
        location: Array.isArray(concertData.location)
          ? concertData.location
          : [concertData.location], // string 배열로 변경
        datetime: Array.isArray(concertData.datetime)
          ? concertData.datetime.map((dt) => new Date(dt)) // string을 Date로 변환
          : [new Date(concertData.datetime)],
        price: Array.isArray(concertData.price)
          ? concertData.price
          : concertData.price
            ? [concertData.price]
            : [],
        description: concertData.description || '',
        category: Array.isArray(concertData.category)
          ? concertData.category
          : concertData.category
            ? [concertData.category]
            : [],
        ticketLink: Array.isArray(concertData.ticketLink)
          ? concertData.ticketLink
          : concertData.ticketLink
            ? [concertData.ticketLink]
            : [],
        ticketOpenDate: concertData.ticketOpenDate
          ? new Date(concertData.ticketOpenDate)
          : undefined,
        posterImage: concertData.posterImage || '',
        infoImages: concertData.infoImages || [], // info -> infoImages로 변경

        status: 'upcoming',
        likes: [],
        likesCount: 0,
      };

      // 7. MongoDB에 저장
      const newConcert = await ConcertModel.create(processedData);

      return {
        success: true,
        data: {
          id: mongoId,
          uid: concertData.uid,
          title: concertData.title,
          artist: processedData.artist,
          location: processedData.location,
          datetime: processedData.datetime,
          price: processedData.price,
          category: processedData.category,
          ticketLink: processedData.ticketLink,
          ticketOpenDate: processedData.ticketOpenDate,
          posterImage: processedData.posterImage,
          infoImages: processedData.infoImages, // info -> infoImages로 변경

          status: processedData.status,
          likesCount: 0,
          createdAt: newConcert.createdAt,
          updatedAt: newConcert.updatedAt,
        },
        statusCode: 201,
      };
    } catch (error) {
      logger.error('콘서트 생성 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '콘서트 생성 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 콘서트 조회 (ID 또는 UID)
   */
  static async getConcert(
    id: string,
    userId?: string,
  ): Promise<ConcertServiceResponse> {
    try {
      const ConcertModel = getConcertModel();
      const concert = await ConcertModel.findById(id);

      if (!concert) {
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      // 로그인한 사용자의 경우 좋아요 여부 확인
      let isLiked = false;
      if (userId) {
        try {
          if (concert.likes && Array.isArray(concert.likes)) {
            isLiked = concert.likes.some((like: any) => {
              if (!like || !like.userId) return false;
              try {
                return like.userId.toString() === userId.toString();
              } catch (error) {
                return false;
              }
            });
          }
        } catch (error) {
          logger.warn('좋아요 상태 확인 에러:', error);
        }
      }

      return {
        success: true,
        data: {
          ...concert,
          isLiked: userId ? isLiked : undefined,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('콘서트 조회 서비스 에러:', error);
      return {
        success: false,
        error: '콘서트 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 콘서트 목록 조회 (페이지네이션, 필터링, 정렬)
   */
  static async getAllConcerts(
    params: {
      page?: number;
      limit?: number;
      category?: string;
      artist?: string;
      location?: string;
      status?: string;
      sortBy?: string;
    },
    userId?: string, // 사용자 ID 추가
  ): Promise<ConcertServiceResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        artist,
        location,
        status,
        sortBy = 'date',
      } = params;

      const ConcertModel = getConcertModel();

      // 필터 조건 구성
      const filter: any = {};
      if (category) filter.category = { $in: [category] };
      if (artist) filter.artist = { $in: [new RegExp(artist, 'i')] };
      if (location) filter.location = new RegExp(location, 'i'); // location이 string 배열이므로 직접 검색
      if (status) filter.status = status;

      // 정렬 조건 구성
      let sort: any = {};
      switch (sortBy) {
        case 'likes':
          sort = { likesCount: -1, datetime: 1 };
          break;
        case 'created':
          sort = { createdAt: -1 };
          break;
        case 'date':
        default:
          sort = { datetime: 1, createdAt: -1 };
          break;
      }

      const { concerts, total } = await ConcertModel.findMany(filter, {
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        sort,
      });

      // 로그인한 사용자의 경우 각 콘서트의 좋아요 상태 확인
      const concertsWithLikeStatus = concerts.map((concert: any) => {
        let isLiked = false;
        if (userId && concert.likes && Array.isArray(concert.likes)) {
          isLiked = concert.likes.some((like: any) => {
            if (!like || !like.userId) return false;
            try {
              return like.userId.toString() === userId.toString();
            } catch (error) {
              return false;
            }
          });
        }

        return {
          ...concert,
          isLiked: userId ? isLiked : undefined,
        };
      });

      const totalPages = Math.ceil(total / parseInt(limit.toString()));

      return {
        success: true,
        data: {
          concerts: concertsWithLikeStatus,
          pagination: {
            currentPage: parseInt(page.toString()),
            totalPages,
            totalConcerts: total,
            limit: parseInt(limit.toString()),
          },
          filters: { category, artist, location, status, sortBy },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('콘서트 목록 조회 서비스 에러:', error);
      return {
        success: false,
        error: '콘서트 목록 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 콘서트 정보 수정 - 수정된 버전
   */
  static async updateConcert(
    id: string,
    updateData: any,
  ): Promise<ConcertServiceResponse> {
    try {
      // 1. 업데이트 데이터 유효성 검증 (새로운 함수 사용)
      const validationResult = validateConcertUpdateData(updateData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.message,
          statusCode: 400,
        };
      }

      const ConcertModel = getConcertModel();

      // 2. 기존 콘서트 확인
      const existingConcert = await ConcertModel.findById(id);
      if (!existingConcert) {
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      // 3. 수정 불가능한 필드 제거
      const cleanUpdateData = { ...updateData };
      delete cleanUpdateData.uid;
      delete cleanUpdateData.likes;
      delete cleanUpdateData.likesCount;
      delete cleanUpdateData._id;
      delete cleanUpdateData.createdAt;
      cleanUpdateData.updatedAt = new Date();

      // 4. 포스터 이미지 URL 유효성 검증 (수정하는 경우)
      if (
        cleanUpdateData.posterImage &&
        !isValidImageUrl(cleanUpdateData.posterImage)
      ) {
        return {
          success: false,
          error: '올바르지 않은 포스터 이미지 URL입니다.',
          statusCode: 400,
        };
      }

      // 5. infoImages URL 유효성 검증 (수정하는 경우)
      if (
        cleanUpdateData.infoImages &&
        Array.isArray(cleanUpdateData.infoImages)
      ) {
        for (const imageUrl of cleanUpdateData.infoImages) {
          if (!isValidImageUrl(imageUrl)) {
            return {
              success: false,
              error: '올바르지 않은 정보 이미지 URL입니다.',
              statusCode: 400,
            };
          }
        }
      }

      // 6. 날짜 필드 타입 변환
      if (cleanUpdateData.datetime) {
        cleanUpdateData.datetime = Array.isArray(cleanUpdateData.datetime)
          ? cleanUpdateData.datetime.map((dt: string) => new Date(dt))
          : [new Date(cleanUpdateData.datetime)];
      }

      if (cleanUpdateData.ticketOpenDate) {
        cleanUpdateData.ticketOpenDate = new Date(
          cleanUpdateData.ticketOpenDate,
        );
      }

      // 7. 업데이트 실행
      const updatedConcert = await ConcertModel.updateById(id, cleanUpdateData);

      if (!updatedConcert) {
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      return {
        success: true,
        data: updatedConcert,
        statusCode: 200,
      };
    } catch (error) {
      logger.error('콘서트 수정 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '콘서트 수정 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 콘서트 삭제
   */
  static async deleteConcert(id: string): Promise<ConcertServiceResponse> {
    try {
      const ConcertModel = getConcertModel();

      // 기존 콘서트 확인
      const existingConcert = await ConcertModel.findById(id);
      if (!existingConcert) {
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      const deletedConcert = await ConcertModel.deleteById(id);

      if (!deletedConcert) {
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      return {
        success: true,
        data: {
          id: deletedConcert._id,
          uid: deletedConcert.uid,
          title: deletedConcert.title,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('콘서트 삭제 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '콘서트 삭제 실패',
        statusCode: 500,
      };
    }
  }
}
