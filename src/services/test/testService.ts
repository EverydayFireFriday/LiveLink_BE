import { ObjectId } from 'mongodb';
import { getConcertTestModel } from '../../models/test/test';
import logger from '../../utils/logger/logger';

import { validateConcertData } from '../../models/concert/validation/ConcertCreateValidation';
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
  datetime?: string[]; // 선택적 필드 (날짜 미정인 경우 빈 배열 또는 생략 가능)
  price?: Array<{ tier: string; amount: number }>;
  description?: string;
  category?: string[];
  ticketLink?: Array<{ platform: string; url: string }>;
  ticketOpenDate?: Array<{ openTitle: string; openDate: string }>;
  posterImage?: string;
  infoImages?: string[]; // info -> infoImages로 변경
}

export interface ConcertServiceResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
  statusCode?: number;
}

export class TestService {
  /**
   * 새 테스트 콘서트 생성
   */
  static async createTestConcert(
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

      const ConcertTestModel = getConcertTestModel();

      // 2. UID 중복 확인
      const existingConcert = await ConcertTestModel.findByUid(concertData.uid);
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
        const existingById = await ConcertTestModel.findById(
          mongoId.toString(),
        );
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
        datetime: concertData.datetime
          ? Array.isArray(concertData.datetime)
            ? concertData.datetime.map((dt) => new Date(dt)) // string을 Date로 변환
            : [new Date(concertData.datetime)]
          : [], // datetime이 없으면 빈 배열
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
        ticketOpenDate: Array.isArray(concertData.ticketOpenDate)
          ? concertData.ticketOpenDate.map((item) => ({
              openTitle: item.openTitle,
              openDate: new Date(item.openDate),
            }))
          : undefined,
        posterImage: concertData.posterImage || '',
        infoImages: concertData.infoImages || [], // info -> infoImages로 변경

        status: 'upcoming',
        likesCount: 0,
      };

      // 7. MongoDB에 저장
      const newConcert = await ConcertTestModel.create(processedData);

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
      logger.error('테스트 콘서트 생성 서비스 에러:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '테스트 콘서트 생성 실패',
        statusCode: 500,
      };
    }
  }
}
