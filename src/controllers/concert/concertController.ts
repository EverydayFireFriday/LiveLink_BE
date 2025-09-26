import express from 'express';
import { ConcertService } from '../../services/concert/concertService';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';

export const uploadConcert = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    // 요청 데이터 유효성 검사
    if (!req.body) {
      return res.status(400).json({
        message: '요청 본문이 비어있습니다.',
        timestamp: new Date().toISOString(),
      });
    }

    // 미들웨어에서 이미 인증 처리되었으므로 여기서는 서비스 로직만
    const result = await ConcertService.createConcert(req.body);

    if (result.success) {
      // 세션 정보 가져오기 (개발환경에서는 임시 세션이 생성됨)
      const userInfo = {
        email:
          req.session?.user?.email ||
          process.env.DEFAULT_EMAIL ||
          'system@stagelives.com',
        username: req.session?.user?.username || 'unknown-user',
        userId: req.session?.user?.userId || 'unknown-id',
      };

      logger.info(
        `✅ 콘서트 정보 저장 완료: ${result.data.title} (UID: ${result.data.uid}) - 업로드 사용자: ${userInfo.username} (${userInfo.email})`,
      );

      res.status(result.statusCode || 201).json({
        message: '콘서트 정보 업로드 성공',
        data: result.data,
        metadata: {
          imageInfo: {
            posterImageProvided: !!result.data.posterImage,
            infoImagesCount: result.data.infoImages
              ? result.data.infoImages.length
              : 0, // info → infoImages
          },
          userInfo: {
            uploadedBy: userInfo.email,
            username: userInfo.username,
            environment: process.env.NODE_ENV || 'development',
            loginTime: req.session?.user?.loginTime,
          },
          validation: {
            artistCount: result.data.artist?.length || 0,
            locationCount: result.data.location?.length || 0,
            datetimeCount: result.data.datetime?.length || 0,
            categoryCount: result.data.category?.length || 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(result.statusCode || 400).json({
        message: result.error || '콘서트 업로드 실패',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('❌ 콘서트 업로드 컨트롤러 에러:', error);

    // 구체적인 에러 타입에 따른 응답
    if (error instanceof Error) {
      if (error.message.includes('유효성 검사 실패')) {
        return res.status(400).json({
          message: '입력 데이터가 유효하지 않습니다.',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (error.message.includes('중복')) {
        return res.status(409).json({
          message: '중복된 콘서트 UID입니다.',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(500).json({
      message: '서버 에러로 콘서트 업로드 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
      timestamp: new Date().toISOString(),
    });
  }
};

export const getConcert = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { id } = req.params;

    // ID 유효성 검사
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        message: '콘서트 ID가 필요합니다.',
        timestamp: new Date().toISOString(),
      });
    }

    // 세션에서 사용자 ID 가져오기 (로그인하지 않은 경우 undefined)
    const userId = req.session?.user?.userId;

    logger.info(
      `🔍 콘서트 조회 요청: ID=${id}, 사용자=${userId ? '로그인됨' : '비로그인'}`,
    );

    const result = await ConcertService.getConcert(id, userId);

    if (result.success) {
      res.status(result.statusCode || 200).json({
        message: '콘서트 정보 조회 성공',
        data: result.data,
        metadata: {
          userInfo: userId
            ? {
                isAuthenticated: true,
                userId: req.session?.user?.userId,
                email: req.session?.user?.email,
                username: req.session?.user?.username,
                likedByUser: result.data.isLiked || false,
              }
            : {
                isAuthenticated: false,
                likedByUser: false,
              },
          concertInfo: {
            likesCount: result.data.likesCount || 0,
            status: result.data.status,
            hasTicketInfo:
              !!result.data.ticketLink && result.data.ticketLink.length > 0,
            hasTicketOpenDate: !!result.data.ticketOpenDate,
            upcomingDates:
              result.data.datetime?.filter(
                (date: Date) => new Date(date) > new Date(),
              ).length || 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      const statusCode =
        result.statusCode || (result.error?.includes('찾을 수 없') ? 404 : 500);
      res.status(statusCode).json({
        message: result.error || '콘서트 조회 실패',
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.info('❌ 콘서트 조회 컨트롤러 에러:', error);
    res.status(500).json({
      message: '콘서트 조회 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
      requestedId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  }
};

export const getAllConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    // 쿼리 파라미터 유효성 검사
    const page = safeParseInt(req.query.page, 1);
    const limit = Math.min(safeParseInt(req.query.limit, 20), 100);

    if (page < 1) {
      return res.status(400).json({
        message: '페이지 번호는 1 이상이어야 합니다.',
        timestamp: new Date().toISOString(),
      });
    }

    if (limit < 1) {
      return res.status(400).json({
        message: '페이지당 항목 수는 1 이상이어야 합니다.',
        timestamp: new Date().toISOString(),
      });
    }

    // 사용자 ID 가져오기 (로그인된 경우)
    const userId = req.session?.user?.userId;

    logger.info(
      `📋 콘서트 목록 조회: page=${page}, limit=${limit}, 사용자=${userId ? '로그인됨' : '비로그인'}`,
    );

    // 필터 정보 로깅
    const filters = {
      title: req.query.title,
      category: req.query.category,
      artist: req.query.artist,
      location: req.query.location,
      status: req.query.status,
      sortBy: req.query.sortBy,
      search: req.query.search,
    };

    const activeFilters = Object.entries(filters)
      .filter(([, value]) => value) // key 대신 _ 사용하여 unused 경고 해결
      .map(([key]) => key);
    if (activeFilters.length > 0) {
      logger.info(`🔍 적용된 필터: ${activeFilters.join(', ')}`);
    }

    const result = await ConcertService.getAllConcerts(
      {
        ...req.query,
        page,
        limit,
      },
      userId,
    );

    if (result.success) {
      res.status(result.statusCode || 200).json({
        message: '콘서트 목록 조회 성공',
        data: result.data, // 이미 concerts와 pagination 포함
        metadata: {
          userInfo: userId
            ? {
                isAuthenticated: true,
                userId: req.session?.user?.userId,
                email: req.session?.user?.email,
                username: req.session?.user?.username,
              }
            : {
                isAuthenticated: false,
              },
          query: {
            appliedFilters: activeFilters,
            sortBy: req.query.sortBy || 'date',
            searchTerm: req.query.search || null,
          },
          statistics: {
            totalResults: result.data.pagination?.total || 0,
            currentPageResults: result.data.concerts?.length || 0,
            currentPage: page,
            totalPages: result.data.pagination?.totalPages || 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(result.statusCode || 500).json({
        message: result.error || '콘서트 목록 조회 실패',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('❌ 콘서트 목록 조회 컨트롤러 에러:', error);
    res.status(500).json({
      message: '콘서트 목록 조회 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
      timestamp: new Date().toISOString(),
    });
  }
};

export const getRandomConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const limit = Math.min(safeParseInt(req.query.limit, 10), 30);
    const userId = req.session?.user?.userId;

    if (limit < 1) {
      return res.status(400).json({
        message: "limit은 1 이상이어야 합니다.",
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(
      `🔀 랜덤 콘서트 조회: limit=${limit}, 사용자=${
        userId ? "로그인됨" : "비로그인"
      }`
    );

    const result = await ConcertService.getRandomConcerts(limit, userId);

    if (result.success) {
      res.status(result.statusCode || 200).json({
        message: "랜덤 콘서트 목록 조회 성공",
        data: result.data,
        metadata: {
          count: result.data.length,
          filter: {
            status: ["upcoming", "ongoing"],
          },
          userInfo: {
            isAuthenticated: !!userId,
            userId: userId || null,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(result.statusCode || 500).json({
        message: result.error || "랜덤 콘서트 목록 조회 실패",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("❌ 랜덤 콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "랜덤 콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};

export const updateConcert = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { id } = req.params;

    // ID 유효성 검사
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        message: '콘서트 ID가 필요합니다.',
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }

    // 요청 본문 유효성 검사
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: '수정할 데이터가 없습니다.',
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }

    // 수정 불가능한 필드 확인 및 제거
    const restrictedFields = ['uid', 'likes', 'likesCount', '_id', 'createdAt'];
    const providedRestrictedFields = restrictedFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    );

    if (providedRestrictedFields.length > 0) {
      logger.info(
        `⚠️ 수정 불가능한 필드 감지: ${providedRestrictedFields.join(', ')} - 해당 필드들은 무시됩니다.`,
      );
      // 경고만 하고 해당 필드들을 제거
      providedRestrictedFields.forEach((field) => delete req.body[field]);
    }

    // 수정 가능한 필드가 남아있는지 확인
    const modifiableFields = Object.keys(req.body).filter(
      (key) => !restrictedFields.includes(key),
    );

    if (modifiableFields.length === 0) {
      return res.status(400).json({
        message: '수정 가능한 필드가 없습니다.',
        restrictedFieldsProvided: providedRestrictedFields,
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }

    // 미들웨어에서 이미 인증 확인됨
    const result = await ConcertService.updateConcert(id, req.body);

    if (result.success) {
      const userInfo = {
        email:
          req.session?.user?.email ||
          process.env.DEFAULT_EMAIL ||
          'system@stagelives.com',
        username: req.session?.user?.username || 'unknown-user',
        userId: req.session?.user?.userId || 'unknown-id',
      };

      logger.info(
        `✅ 콘서트 정보 수정 완료: ${id} - 수정 필드: [${modifiableFields.join(', ')}] - 수정 사용자: ${userInfo.username} (${userInfo.email})`,
      );

      res.status(result.statusCode || 200).json({
        message: '콘서트 정보 수정 성공',
        data: result.data,
        metadata: {
          userInfo: {
            modifiedBy: userInfo.email,
            username: userInfo.username,
            modifiedAt: new Date().toISOString(),
          },
          changes: {
            fieldsModified: modifiableFields,
            restrictedFieldsIgnored: providedRestrictedFields,
            totalFieldsModified: modifiableFields.length,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      const statusCode =
        result.statusCode || (result.error?.includes('찾을 수 없') ? 404 : 400);
      res.status(statusCode).json({
        message: result.error || '콘서트 수정 실패',
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.info('❌ 콘서트 수정 컨트롤러 에러:', error);

    // 구체적인 에러 타입에 따른 응답
    if (error instanceof Error) {
      if (error.message.includes('유효성 검사 실패')) {
        return res.status(400).json({
          message: '수정 데이터가 유효하지 않습니다.',
          error: error.message,
          requestedId: req.params.id,
          timestamp: new Date().toISOString(),
        });
      }

      if (error.message.includes('찾을 수 없')) {
        return res.status(404).json({
          message: '콘서트를 찾을 수 없습니다.',
          error: error.message,
          requestedId: req.params.id,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(500).json({
      message: '콘서트 수정 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
      requestedId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  }
};
export const deleteConcert = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { id } = req.params;

    // ID 유효성 검사
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        message: '콘서트 ID가 필요합니다.',
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`🗑️ 콘서트 삭제 요청: ID=${id}`);

    // 삭제 전에 콘서트 정보 조회 (삭제 로그용)
    const existingConcert = await ConcertService.getConcert(id);
    const concertInfo = existingConcert.success ? existingConcert.data : null;

    // 미들웨어에서 이미 인증 확인됨
    const result = await ConcertService.deleteConcert(id);

    if (result.success) {
      const userInfo = {
        email:
          req.session?.user?.email ||
          process.env.DEFAULT_EMAIL ||
          'system@stagelives.com',
        username: req.session?.user?.username || 'unknown-user',
        userId: req.session?.user?.userId || 'unknown-id',
      };

      logger.info(
        `✅ 콘서트 삭제 완료: ${id} (제목: ${result.data?.title || concertInfo?.title || '제목 없음'}) - 삭제 사용자: ${userInfo.username} (${userInfo.email})`,
      );

      // 삭제된 콘서트의 상세 정보 로깅
      if (concertInfo) {
        logger.info(
          `📊 삭제된 콘서트 정보: 좋아요 ${concertInfo.likesCount || 0}개, 상태: ${concertInfo.status || 'unknown'}`,
        );
      }

      res.status(result.statusCode || 200).json({
        message: '콘서트 삭제 성공',
        data: result.data,
        metadata: {
          userInfo: {
            deletedBy: userInfo.email,
            username: userInfo.username,
            deletedAt: new Date().toISOString(),
          },
          deletedConcert: {
            title: result.data?.title || concertInfo?.title || '제목 없음',
            uid: result.data?.uid || id,
            likesCount: result.data?.likesCount || concertInfo?.likesCount || 0,
            status: result.data?.status || concertInfo?.status || 'unknown',
            locationCount: Array.isArray(concertInfo?.location)
              ? concertInfo.location.length
              : 0,
            datetimeCount: Array.isArray(concertInfo?.datetime)
              ? concertInfo.datetime.length
              : 0,
            hadPosterImage: !!(
              result.data?.posterImage || concertInfo?.posterImage
            ),
            infoImagesCount: Array.isArray(concertInfo?.infoImages)
              ? concertInfo.infoImages.length
              : 0,
          },
          warning: {
            message: '삭제된 데이터는 복구할 수 없습니다.',
            deletedAt: new Date().toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      const statusCode =
        result.statusCode || (result.error?.includes('찾을 수 없') ? 404 : 500);

      logger.info(`❌ 콘서트 삭제 실패: ${id} - ${result.error}`);

      res.status(statusCode).json({
        message: result.error || '콘서트 삭제 실패',
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('❌ 콘서트 삭제 컨트롤러 에러:', error);

    // 구체적인 에러 타입에 따른 응답
    if (error instanceof Error) {
      if (error.message.includes('찾을 수 없')) {
        return res.status(404).json({
          message: '콘서트를 찾을 수 없습니다.',
          error: error.message,
          requestedId: req.params.id,
          timestamp: new Date().toISOString(),
        });
      }

      if (error.message.includes('권한')) {
        return res.status(403).json({
          message: '콘서트 삭제 권한이 없습니다.',
          error: error.message,
          requestedId: req.params.id,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(500).json({
      message: '콘서트 삭제 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
      requestedId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  }
};
