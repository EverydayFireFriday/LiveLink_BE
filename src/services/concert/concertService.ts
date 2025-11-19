import { ObjectId, Sort } from 'mongodb';
import { getConcertModel } from '../../models/concert/concert';
import { UserModel } from '../../models/auth/user';
import logger from '../../utils/logger/logger';

import { validateConcertData } from '../../models/concert/validation/ConcertCreateValidation';
import { validateConcertUpdateData } from '../../models/concert/validation/ConcertUpdateValidation';
import {
  generateObjectIdFromUid,
  isValidImageUrl,
} from '../../models/concert/validation/ConcertValidationUtils';

// Model의 Concert 타입을 그대로 사용 (I 접두사 제거)
import type { IConcert } from '../../models/concert/base/ConcertTypes';

// Live DB 동기화 서비스 import
import { ConcertSyncService } from './concertSyncService';
// Music Services import
// import { YouTubeMusicService } from './youtubeMusicService'; // YouTube 비활성화
import { SpotifyService } from './spotifyService';
import type { ISetlistSong } from '../../models/concert/base/ConcertTypes';
// Setlist 서비스 import
import { setlistService } from '../setlist/setlistService';

// 캐시 유틸리티 import
import {
  cacheManager,
  CacheKeyBuilder,
  CacheTTL,
  CacheInvalidationPatterns,
} from '../../utils';

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
  ticketOpenDate?: string;
  posterImage?: string;
  infoImages?: string[]; // info -> infoImages로 변경
  setlist?: ISetlistSong[]; // 셋리스트 곡 목록
}

export interface ConcertServiceResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      } catch {
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
          ? concertData.ticketOpenDate.map(
              (item: { openTitle: string; openDate: string }) => ({
                openTitle: item.openTitle,
                openDate: new Date(item.openDate),
              }),
            )
          : undefined,
        posterImage: concertData.posterImage || '',
        infoImages: concertData.infoImages || [], // info -> infoImages로 변경

        status: 'upcoming',
        likesCount: 0,
        // 주의: setlist는 Concert 컬렉션이 아닌 별도 Setlist 컬렉션에 저장됨
      };

      // 7. MongoDB에 저장
      const newConcert = await ConcertModel.create(processedData);

      // 8. 셋리스트가 있는 경우 Setlist 컬렉션에도 저장
      if (concertData.setlist && concertData.setlist.length > 0) {
        try {
          await setlistService.createOrUpdateSetlist({
            concertId: concertData.uid,
            setList: concertData.setlist,
          });
          logger.info(
            `✅ 셋리스트 저장 완료: ${concertData.uid} (${concertData.setlist.length}곡)`,
          );
        } catch (error) {
          logger.warn(
            `⚠️ 셋리스트 저장 실패 (콘서트는 생성됨): ${concertData.uid} - ${error}`,
          );
          // 셋리스트 저장 실패해도 콘서트 생성은 성공으로 처리
        }
      }

      // 9. Live DB에 동기화 (비동기, 실패해도 메인 기능에 영향 없음)
      void ConcertSyncService.syncCreate(newConcert);

      // 10. 캐시 무효화 - 모든 콘서트 목록 캐시 삭제
      await cacheManager.delByPattern(CacheInvalidationPatterns.CONCERT_ALL());

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
      // 캐시 키 생성
      const cacheKey = CacheKeyBuilder.concertDetail(id, { userId });

      // 캐시 확인
      const cachedData =
        await cacheManager.get<ConcertServiceResponse>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

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
      if (userId && ObjectId.isValid(userId)) {
        const userModel = new UserModel();
        const user = await userModel.findById(userId);
        if (user && user.likedConcerts) {
          isLiked = user.likedConcerts.some((id) => id.equals(concert._id));
        }
      }

      const response: ConcertServiceResponse = {
        success: true,
        data: {
          ...concert,
          isLiked: userId ? isLiked : undefined,
        },
        statusCode: 200,
      };

      // 캐시 저장
      await cacheManager.set(cacheKey, response, CacheTTL.CONCERT_DETAIL);

      return response;
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
      title?: string;
      search?: string;
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
        sortBy = 'upcoming_soon',
        title,
        search,
      } = params;

      // 캐시 키 생성
      const cacheKey = CacheKeyBuilder.concertList({
        page,
        limit,
        category,
        location,
        userId,
      });

      // 캐시 확인
      const cachedData =
        await cacheManager.get<ConcertServiceResponse>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const ConcertModel = getConcertModel();

      // 필터 조건 구성
      const filter: Record<string, unknown> = {};
      if (category) filter.category = { $in: [category] };
      if (artist) filter.artist = { $in: [new RegExp(artist, 'i')] };
      if (location) filter.location = new RegExp(location, 'i'); // location이 string 배열이므로 직접 검색
      if (status) filter.status = status;

      // 제목 검색 (부분 문자열 매칭)
      if (title) filter.title = new RegExp(title, 'i');

      // 통합 검색 (title, artist, description, location에서 검색)
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { title: { $regex: searchRegex } },
          { artist: { $elemMatch: { $regex: searchRegex } } },
          { description: { $regex: searchRegex } },
          { location: { $elemMatch: { $regex: searchRegex } } },
        ];
      }

      // 정렬 조건 구성
      let sort: Sort = {};
      let concerts: IConcert[] = [];
      let total = 0;

      const pageInt = parseInt(page.toString());
      const limitInt = parseInt(limit.toString());

      switch (sortBy) {
        case 'upcoming_soon': {
          const now = new Date();

          // 1. 미래 공연 조회 (임박순)
          const futureFilter = { ...filter, datetime: { $gte: now } };
          const { concerts: futureConcerts, total: futureTotal } =
            await ConcertModel.findMany(futureFilter, {
              sort: { datetime: 1 },
              page: 1, // 페이지네이션은 나중에 수동으로 처리
              limit: 0, // 모든 결과 가져오기
            });

          // 2. 과거 공연 조회 (최신순)
          const pastFilter = { ...filter, datetime: { $lt: now } };
          const { concerts: pastConcerts, total: pastTotal } =
            await ConcertModel.findMany(pastFilter, {
              sort: { datetime: -1 },
              page: 1,
              limit: 0,
            });

          total = futureTotal + pastTotal;
          const allConcerts = [...futureConcerts, ...pastConcerts];

          // 수동 페이지네이션
          const skip = (pageInt - 1) * limitInt;
          concerts = allConcerts.slice(skip, skip + limitInt);
          break;
        }
        case 'likes': {
          sort = { likesCount: -1, datetime: 1 };
          const result = await ConcertModel.findMany(filter, {
            page: pageInt,
            limit: limitInt,
            sort,
          });
          concerts = result.concerts;
          total = result.total;
          break;
        }
        case 'created': {
          sort = { createdAt: -1 };
          const result = await ConcertModel.findMany(filter, {
            page: pageInt,
            limit: limitInt,
            sort,
          });
          concerts = result.concerts;
          total = result.total;
          break;
        }
        case 'ticket_soon': {
          filter['ticketOpenDate.0.openDate'] = { $gte: new Date() };
          sort = { 'ticketOpenDate.0.openDate': 1 };
          const result = await ConcertModel.findMany(filter, {
            page: pageInt,
            limit: limitInt,
            sort,
          });
          concerts = result.concerts;
          total = result.total;
          break;
        }
        default: {
          const now = new Date();
          const futureFilter = { ...filter, datetime: { $gte: now } };
          const { concerts: futureConcerts, total: futureTotal } =
            await ConcertModel.findMany(futureFilter, {
              sort: { datetime: 1 },
              page: 1,
              limit: 0,
            });
          const pastFilter = { ...filter, datetime: { $lt: now } };
          const { concerts: pastConcerts, total: pastTotal } =
            await ConcertModel.findMany(pastFilter, {
              sort: { datetime: -1 },
              page: 1,
              limit: 0,
            });
          total = futureTotal + pastTotal;
          const allConcerts = [...futureConcerts, ...pastConcerts];
          const skip = (pageInt - 1) * limitInt;
          concerts = allConcerts.slice(skip, skip + limitInt);
          break;
        }
      }

      // 로그인한 사용자의 경우 각 콘서트의 좋아요 상태 확인
      let likedConcertIds = new Set<string>();
      if (userId && ObjectId.isValid(userId)) {
        const userModel = new UserModel();
        const user = await userModel.findById(userId);
        if (user && user.likedConcerts) {
          likedConcertIds = new Set(
            user.likedConcerts.map((id) => id.toString()),
          );
        }
      }

      const concertsWithLikeStatus = concerts.map((concert: IConcert) => ({
        ...concert,
        ...(userId && { isLiked: likedConcertIds.has(concert._id.toString()) }),
      }));

      const totalPages = Math.ceil(total / parseInt(limit.toString()));

      const response: ConcertServiceResponse = {
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

      // 캐시 저장
      await cacheManager.set(cacheKey, response, CacheTTL.CONCERT_LIST);

      return response;
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
   * 랜덤 콘서트 목록 조회
   */
  static async getRandomConcerts(
    limit: number,
    userId?: string,
  ): Promise<ConcertServiceResponse> {
    try {
      const ConcertModel = getConcertModel();

      // 1. 'upcoming' 또는 'ongoing' 상태의 콘서트를 대상으로 필터링
      const matchStage = {
        $match: {
          status: { $in: ['upcoming', 'ongoing'] },
        },
      };

      // 2. $sample 파이프라인을 사용하여 랜덤 샘플링
      const sampleStage = {
        $sample: { size: limit },
      };

      // 3. 집계 파이프라인 실행
      const randomConcerts = await ConcertModel.collection
        .aggregate<IConcert>([matchStage, sampleStage])
        .toArray();

      // 4. 로그인한 사용자의 경우 각 콘서트의 좋아요 상태 확인
      let likedConcertIds = new Set<string>();
      if (userId && ObjectId.isValid(userId)) {
        const userModel = new UserModel();
        const user = await userModel.findById(userId);
        if (user && user.likedConcerts) {
          likedConcertIds = new Set(
            user.likedConcerts.map((id) => id.toString()),
          );
        }
      }

      const concertsWithLikeStatus = randomConcerts.map(
        (concert: IConcert) => ({
          ...concert,
          ...(userId && {
            isLiked: likedConcertIds.has(concert._id.toString()),
          }),
        }),
      );

      return {
        success: true,
        data: concertsWithLikeStatus,
        statusCode: 200,
      };
    } catch (error) {
      logger.error('랜덤 콘서트 조회 서비스 에러:', error);
      return {
        success: false,
        error: '랜덤 콘서트 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 최신 콘서트 목록 조회 (티켓 플랫폼별, 장르별로 적절히 섞어서 반환)
   */
  static async getLatestConcerts(
    limit: number,
    userId?: string,
  ): Promise<ConcertServiceResponse> {
    try {
      // 캐시 키 생성
      const cacheKey = CacheKeyBuilder.concertList({
        page: 1,
        limit,
        userId,
      });

      // 캐시 확인
      const cachedData =
        await cacheManager.get<ConcertServiceResponse>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const ConcertModel = getConcertModel();

      const filter = {
        status: { $in: ['upcoming', 'ongoing'] as const },
      };

      //플랫폼 파이프라인
      const platformPipeline = [
        { $match: filter },
        { $sort: { createdAt: -1 } as Sort },
        {
          $addFields: {
            primaryPlatform: {
              $ifNull: [{ $arrayElemAt: ['$ticketLink.platform', 0] }, 'none'],
            },
          },
        },
        {
          $group: {
            _id: '$primaryPlatform',
            concerts: { $push: '$$ROOT' },
          },
        },
        {
          $project: {
            _id: 0,
            platform: '$_id',
            concerts: { $slice: ['$concerts', Math.ceil(limit / 2)] },
          },
        },
        {
          $unset: 'concerts.primaryPlatform', // ← 명시적 제거
        },
      ];

      // 카테고리 파이프라인
      const categoryPipeline = [
        { $match: filter },
        { $sort: { createdAt: -1 } as Sort },
        {
          $addFields: {
            primaryCategory: {
              $ifNull: [{ $arrayElemAt: ['$category', 0] }, 'uncategorized'],
            },
          },
        },
        {
          $group: {
            _id: '$primaryCategory',
            concerts: { $push: '$$ROOT' },
          },
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            concerts: { $slice: ['$concerts', Math.ceil(limit / 2)] },
          },
        },
        {
          $unset: 'concerts.primaryCategory', // ← 명시적 제거
        },
      ];

      const [platformGroups, categoryGroups] = await Promise.all([
        ConcertModel.collection
          .aggregate<{
            platform: string;
            concerts: IConcert[];
          }>(platformPipeline)
          .toArray(),
        ConcertModel.collection
          .aggregate<{
            category: string;
            concerts: IConcert[];
          }>(categoryPipeline)
          .toArray(),
      ]);

      // 플랫폼별 맵 생성
      const platformMap = new Map<string, IConcert[]>();
      for (const group of platformGroups) {
        platformMap.set(group.platform, group.concerts);
      }

      // 카테고리별 맵 생성
      const categoryMap = new Map<string, IConcert[]>();
      for (const group of categoryGroups) {
        categoryMap.set(group.category, group.concerts);
      }

      // 라운드 로빈으로 섞기
      const result: IConcert[] = [];
      const seenIds = new Set<string>();
      const platforms = Array.from(platformMap.keys());
      const categories = Array.from(categoryMap.keys());

      let platformIdx = 0;
      let categoryIdx = 0;
      let consecutiveFails = 0;
      const maxFails = platforms.length + categories.length;

      while (result.length < limit && consecutiveFails < maxFails) {
        let added = false;

        // 플랫폼에서 하나 선택
        if (platforms.length > 0) {
          const platform = platforms[platformIdx % platforms.length];
          const concerts = platformMap.get(platform) || [];

          for (const concert of concerts) {
            const id = concert._id.toString();
            if (!seenIds.has(id)) {
              result.push(concert);
              seenIds.add(id);
              added = true;
              consecutiveFails = 0;
              break;
            }
          }
          platformIdx++;
        }

        if (result.length >= limit) break;

        // 카테고리에서 하나 선택
        if (categories.length > 0) {
          const category = categories[categoryIdx % categories.length];
          const concerts = categoryMap.get(category) || [];

          let categoryAdded = false;
          for (const concert of concerts) {
            const id = concert._id.toString();
            if (!seenIds.has(id)) {
              result.push(concert);
              seenIds.add(id);
              categoryAdded = true;
              consecutiveFails = 0;
              break;
            }
          }
          if (!categoryAdded && !added) {
            consecutiveFails++;
          }
          categoryIdx++;
        }
      }

      // 아직 limit에 못 미치면 남은 콘서트 추가
      if (result.length < limit) {
        const allConcerts = new Set<IConcert>();
        for (const concerts of platformMap.values()) {
          concerts.forEach((c) => allConcerts.add(c));
        }
        for (const concerts of categoryMap.values()) {
          concerts.forEach((c) => allConcerts.add(c));
        }

        const remaining = Array.from(allConcerts)
          .filter((c) => !seenIds.has(c._id.toString()))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        for (const concert of remaining) {
          if (result.length >= limit) break;
          result.push(concert);
        }
      }

      // limit만큼만 반환
      const finalConcerts = result.slice(0, limit);

      // 좋아요 상태 확인
      let likedConcertIds = new Set<string>();
      if (userId && ObjectId.isValid(userId)) {
        const userModel = new UserModel();
        const user = await userModel.findById(userId);
        if (user && user.likedConcerts) {
          likedConcertIds = new Set(
            user.likedConcerts.map((id) => id.toString()),
          );
        }
      }

      const concertsWithLikeStatus = finalConcerts.map((concert: IConcert) => ({
        ...concert,
        ...(userId && { isLiked: likedConcertIds.has(concert._id.toString()) }),
      }));

      const response: ConcertServiceResponse = {
        success: true,
        data: concertsWithLikeStatus,
        statusCode: 200,
      };

      // 캐시 저장
      await cacheManager.set(cacheKey, response, CacheTTL.CONCERT_LIST);

      return response;
    } catch (error) {
      logger.error('최신 콘서트 조회 서비스 에러:', error);
      return {
        success: false,
        error: '최신 콘서트 조회 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 콘서트 정보 수정 - 수정된 버전
   */
  static async updateConcert(
    id: string,
    updateData: Partial<CreateConcertRequest>,
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
      const cleanUpdateData: Record<string, unknown> = { ...updateData };
      delete cleanUpdateData.uid;
      // likesCount, _id, createdAt는 CreateConcertRequest에 없으므로 제거
      cleanUpdateData.updatedAt = new Date();

      // 4. 포스터 이미지 URL 유효성 검증 (수정하는 경우)
      if (
        cleanUpdateData.posterImage &&
        typeof cleanUpdateData.posterImage === 'string' &&
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
        for (const imageUrl of cleanUpdateData.infoImages as string[]) {
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
        const datetimeValue = cleanUpdateData.datetime;
        cleanUpdateData.datetime = Array.isArray(datetimeValue)
          ? (datetimeValue as string[]).map((dt: string) => new Date(dt))
          : [new Date(datetimeValue as string)];
      }

      if (cleanUpdateData.ticketOpenDate) {
        cleanUpdateData.ticketOpenDate = Array.isArray(
          cleanUpdateData.ticketOpenDate,
        )
          ? cleanUpdateData.ticketOpenDate.map(
              (item: { openTitle: string; openDate: string }) => ({
                openTitle: item.openTitle,
                openDate: new Date(item.openDate),
              }),
            )
          : cleanUpdateData.ticketOpenDate;
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

      // 8. Live DB에 동기화 (비동기, 실패해도 메인 기능에 영향 없음)
      // updatedConcert._id는 실제 MongoDB ObjectId이므로 UID가 아닌 ObjectId를 전달
      void ConcertSyncService.syncUpdate(updatedConcert._id, cleanUpdateData);

      // 9. 캐시 무효화
      await Promise.all([
        cacheManager.delByPattern(CacheInvalidationPatterns.CONCERT_BY_ID(id)),
        cacheManager.delByPattern(CacheInvalidationPatterns.CONCERT_LIST()),
      ]);

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

      // Live DB에서도 삭제 (비동기, 실패해도 메인 기능에 영향 없음)
      // deletedConcert._id는 실제 MongoDB ObjectId이므로 UID가 아닌 ObjectId를 전달
      void ConcertSyncService.syncDelete(deletedConcert._id);

      // 캐시 무효화
      await Promise.all([
        cacheManager.delByPattern(CacheInvalidationPatterns.CONCERT_BY_ID(id)),
        cacheManager.delByPattern(CacheInvalidationPatterns.CONCERT_LIST()),
      ]);

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

  /**
   * 셋리스트 재생목록 생성 (유저가 버튼 클릭 시)
   * - 이미 생성된 경우: 저장된 URL 반환
   * - 미생성 상태: YouTube & Spotify 재생목록 생성 후 DB 저장
   */
  static async generatePlaylist(
    concertId: string,
    platform?: 'youtube' | 'spotify' | 'both',
  ): Promise<ConcertServiceResponse> {
    try {
      const ConcertModel = getConcertModel();
      const concert = await ConcertModel.findById(concertId);

      if (!concert) {
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      // 별도 Setlist 컬렉션에서 셋리스트 조회
      const setlistResult = await setlistService.getSetlistByConcertId(
        concert.uid,
      );

      if (!setlistResult.success || !setlistResult.data) {
        return {
          success: false,
          error: '셋리스트 정보가 없습니다.',
          statusCode: 400,
        };
      }

      const setlist = setlistResult.data.setList;

      // 셋리스트가 비어있는 경우
      if (!setlist || setlist.length === 0) {
        return {
          success: false,
          error: '셋리스트 정보가 없습니다.',
          statusCode: 400,
        };
      }

      const targetPlatform = platform || 'both';
      const youtubePlaylistUrl = concert.youtubePlaylistUrl;
      let spotifyPlaylistUrl = concert.spotifyPlaylistUrl;
      let needsUpdate = false;

      // YouTube 재생목록 생성 (필요한 경우) - 현재 주석 처리됨
      // if (
      //   (targetPlatform === 'youtube' || targetPlatform === 'both') &&
      //   !youtubePlaylistUrl
      // ) {
      //   logger.info(
      //     `🎵 YouTube Music 재생목록 생성 시작: ${concert.title} (${setlist.length}곡)`,
      //   );

      //   const youtubeResult =
      //     await YouTubeMusicService.createPlaylistFromSetlist(
      //       concert.title,
      //       setlist,
      //     );

      //   if (youtubeResult.success && youtubeResult.data) {
      //     youtubePlaylistUrl = youtubeResult.data.playlistUrl;
      //     needsUpdate = true;
      //     logger.info(
      //       `✅ YouTube Music 재생목록 생성 완료: ${youtubePlaylistUrl}`,
      //     );
      //   } else {
      //     logger.warn(
      //       `⚠️ YouTube Music 재생목록 생성 실패: ${youtubeResult.error}`,
      //     );
      //   }
      // }

      // Spotify 재생목록 생성 (필요한 경우)
      if (
        (targetPlatform === 'spotify' || targetPlatform === 'both') &&
        !spotifyPlaylistUrl
      ) {
        logger.info(
          `🎵 Spotify 재생목록 생성 시작: ${concert.title} (${setlist.length}곡)`,
        );

        const spotifyResult = await SpotifyService.createPlaylistFromSetlist(
          concert.title,
          setlist,
        );

        if (spotifyResult.success && spotifyResult.data) {
          spotifyPlaylistUrl = spotifyResult.data.playlistUrl;
          needsUpdate = true;
          logger.info(`✅ Spotify 재생목록 생성 완료: ${spotifyPlaylistUrl}`);
        } else {
          logger.warn(`⚠️ Spotify 재생목록 생성 실패: ${spotifyResult.error}`);
        }
      }

      // DB 업데이트 (새로 생성된 URL이 있는 경우)
      if (needsUpdate) {
        const updateData: Partial<IConcert> = {};
        if (youtubePlaylistUrl) {
          updateData.youtubePlaylistUrl = youtubePlaylistUrl;
        }
        if (spotifyPlaylistUrl) {
          updateData.spotifyPlaylistUrl = spotifyPlaylistUrl;
        }

        await ConcertModel.updateById(concertId, updateData);

        // Live DB 동기화 (비동기)
        void ConcertSyncService.syncUpdate(concertId, updateData);

        logger.info(
          `✅ 재생목록 URL DB 저장 완료: ${concertId} (YouTube: ${!!youtubePlaylistUrl}, Spotify: ${!!spotifyPlaylistUrl})`,
        );
      }

      // 응답 반환
      return {
        success: true,
        data: {
          concertId,
          concertTitle: concert.title,
          setlistCount: setlist.length,
          playlists: {
            youtube: youtubePlaylistUrl
              ? {
                  url: youtubePlaylistUrl,
                  cached: !needsUpdate || !!concert.youtubePlaylistUrl,
                }
              : null,
            spotify: spotifyPlaylistUrl
              ? {
                  url: spotifyPlaylistUrl,
                  cached: !needsUpdate || !!concert.spotifyPlaylistUrl,
                }
              : null,
          },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('재생목록 생성 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '재생목록 생성 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 셋리스트 재생목록 업데이트
   * 기존 재생목록의 모든 트랙을 제거하고 새 트랙으로 교체
   */
  static async updatePlaylist(
    concertId: string,
    setlist: ISetlistSong[],
    platform?: 'youtube' | 'spotify' | 'both',
  ): Promise<ConcertServiceResponse> {
    try {
      const ConcertModel = getConcertModel();
      const concert = await ConcertModel.findById(concertId);

      if (!concert) {
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      const targetPlatform = platform || 'both';
      const spotifyPlaylistUrl = concert.spotifyPlaylistUrl;

      // Spotify 재생목록 업데이트
      if (
        (targetPlatform === 'spotify' || targetPlatform === 'both') &&
        spotifyPlaylistUrl
      ) {
        logger.info(
          `🔄 Spotify 재생목록 업데이트: ${concert.title} (${setlist.length}곡)`,
        );

        // Spotify Playlist ID 추출 (URL에서)
        const playlistIdMatch = spotifyPlaylistUrl.match(
          /playlist\/([a-zA-Z0-9]+)/,
        );
        if (!playlistIdMatch) {
          logger.warn('⚠️ Spotify Playlist ID를 추출할 수 없습니다.');
          return {
            success: false,
            error: 'Invalid Spotify playlist URL',
            statusCode: 400,
          };
        }

        const playlistId = playlistIdMatch[1];

        try {
          // 1. 기존 재생목록의 모든 트랙 삭제
          await SpotifyService.clearPlaylist(playlistId);

          // 2. 새 트랙 검색
          const trackUris: string[] = [];
          for (const song of setlist) {
            const trackUri = await SpotifyService.searchSong(song);
            if (trackUri) {
              trackUris.push(trackUri);
            }
          }

          // 3. 새 트랙 추가
          if (trackUris.length > 0) {
            await SpotifyService.addTracksToPlaylist(playlistId, trackUris);
            logger.info(
              `✅ Spotify 재생목록 업데이트 완료: ${trackUris.length}/${setlist.length}곡 추가됨`,
            );
          }
        } catch (updateError) {
          logger.error('Spotify 재생목록 업데이트 실패:', updateError);
          return {
            success: false,
            error: '재생목록 업데이트 중 오류가 발생했습니다.',
            statusCode: 500,
          };
        }
      }

      // 응답 반환
      return {
        success: true,
        data: {
          concertId,
          concertTitle: concert.title,
          setlistCount: setlist.length,
          playlists: {
            youtube: null,
            spotify: spotifyPlaylistUrl
              ? {
                  url: spotifyPlaylistUrl,
                  cached: false,
                }
              : null,
          },
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('재생목록 업데이트 서비스 에러:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '재생목록 업데이트 실패',
        statusCode: 500,
      };
    }
  }
}
