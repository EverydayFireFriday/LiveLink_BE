import express from "express";
import { ConcertService } from "../../services/concert/concertService";
import { safeParseInt } from "../../utils/numberUtils";
import logger from "../../utils/logger";


/**
 * @swagger
 * /concert:
 *   post:
 *     summary: 콘서트 정보 업로드
 *     description: |
 *       콘서트 정보를 MongoDB에 저장합니다. UID에서 timestamp를 추출하여 ObjectId로 변환합니다.
 *
 *       **개발 환경**: 로그인 없이 사용 가능 (임시 세션 자동 생성)
 *       **프로덕션 환경**: 로그인 필수
 *
 *       세션 구조: email, userId, username, profileImage?, loginTime
 *
 *       **업데이트된 스키마**:
 *
 *       - location: 문자열 배열로 간소화됨
 *       - infoImages: 이미지 URL 배열 (기존 info에서 변경)
 * 
 *       **state 상태값**:
 *       - upcoming - 예정
 *       - ongoing - 진행 중
 *       - completed - 완료
 *       - cancelled - 취소
 * 
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *       - {} # 개발환경에서는 인증 없이도 가능
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *               - title
 *               - location
 *               - datetime
 *             properties:
 *               uid:
 *                 type: string
 *                 description: 고유 콘서트 ID (timestamp 포함)
 *                 example: "concert_1703123456789_iu2024"
 *               title:
 *                 type: string
 *                 description: 콘서트 제목
 *                 example: "아이유 콘서트 2024"
 *                 maxLength: 200
 *               artist:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 아티스트 목록 (빈 배열 허용)
 *                 example: ["아이유", "특별 게스트"]
 *               location:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 공연 장소 목록 (문자열 배열로 간소화)
 *                 example: ["올림픽공원 체조경기장", "부산 BEXCO"]
 *                 minItems: 1
 *               datetime:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date-time
 *                 description: 공연 일시 목록
 *                 example: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 minItems: 1
 *               price:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     tier: { type: string, example: "VIP" }
 *                     amount: { type: number, example: 200000 }
 *                 description: 가격 정보 (선택사항)
 *               description:
 *                 type: string
 *                 description: 콘서트 설명
 *                 maxLength: 2000
 *                 example: "아이유의 특별한 콘서트"
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, r&b/ballad, tour, idol, festival, fan, other]
 *                 description: 음악 카테고리
 *                 example: ["tour", "idol"]
 *               ticketLink:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     platform: { type: string, example: "인터파크" }
 *                     url: { type: string, example: "https://ticket.interpark.com/example" }
 *                 description: 티켓 예매 링크
 *               ticketOpenDate:
 *                 type: string
 *                 format: date-time
 *                 description: 티켓 오픈 일시
 *                 example: "2024-05-01T10:00:00+09:00"
 *               posterImage:
 *                 type: string
 *                 format: uri
 *                 description: 포스터 이미지 URL
 *                 example: "https://your-bucket.s3.amazonaws.com/concerts/iu2024/poster.jpg"
 *               infoImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: 추가 정보 이미지 URL 배열 (기존 info에서 변경)
 *                 example: ["https://your-bucket.s3.amazonaws.com/concerts/iu2024/info1.jpg"]
 *               status:
 *                 type: string
 *                 enum: ["upcoming", "ongoing", "completed", "cancelled"]
 *                 default: "upcoming"
 *                 description: 콘서트 상태
 *           examples:
 *             fullExample:
 *               summary: 완전한 콘서트 등록 예시
 *               value:
 *                 uid: "concert_1703123456789_iu2024"
 *                 title: "아이유 콘서트 2024"
 *                 artist: ["아이유", "특별 게스트"]
 *                 location: ["올림픽공원 체조경기장", "부산 BEXCO"]
 *                 datetime: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 price: [{"tier": "VIP", "amount": 200000}, {"tier": "R석", "amount": 150000}]
 *                 description: "아이유의 특별한 콘서트"
 *                 category: ["idol", "tour"]
 *                 ticketLink: [{"platform": "인터파크", "url": "https://ticket.interpark.com/example"}]
 *                 ticketOpenDate: "2024-05-01T10:00:00+09:00"
 *                 posterImage: "https://your-bucket.s3.amazonaws.com/concerts/iu2024/poster.jpg"
 *                 infoImages: ["https://your-bucket.s3.amazonaws.com/concerts/iu2024/info1.jpg", "https://your-bucket.s3.amazonaws.com/concerts/iu2024/info2.jpg"]
 *                 status: "upcoming"
 *             minimalExample:
 *               summary: 최소 필수 데이터만
 *               value:
 *                 uid: "concert_1703123456789_minimal"
 *                 title: "최소 데이터 콘서트"
 *                 location: ["어딘가 공연장"]
 *                 datetime: ["2024-07-01T20:00:00+09:00"]
 *             emptyArtistExample:
 *               summary: 빈 아티스트 배열 (허용됨)
 *               value:
 *                 uid: "concert_1703123456789_unknown"
 *                 title: "미정 콘서트"
 *                 artist: []
 *                 location: ["미정"]
 *                 datetime: ["2024-12-31T19:00:00+09:00"]
 *                 infoImages: ["https://your-bucket.s3.amazonaws.com/concerts/unknown/placeholder.jpg"]
 *                 status: "upcoming"
 *             multiLocationExample:
 *               summary: 여러 장소 공연 예시
 *               value:
 *                 uid: "concert_1703123456789_multi"
 *                 title: "전국투어 콘서트 2024"
 *                 artist: ["아티스트"]
 *                 location: ["서울 올림픽공원", "부산 BEXCO", "대구 엑스코"]
 *                 datetime: ["2024-08-15T19:00:00+09:00", "2024-08-20T19:00:00+09:00", "2024-08-25T19:00:00+09:00"]
 *                 category: ["tour", "idol"]
 *                 status: "upcoming"
 *     responses:
 *       201:
 *         description: 콘서트 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "콘서트 정보 업로드 성공"
 *                 data:
 *                   $ref: '#/components/schemas/Concert'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     imageInfo:
 *                       type: object
 *                       properties:
 *                         posterImageProvided: { type: boolean }
 *                         infoImagesCount: { type: integer }
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         uploadedBy: { type: string }
 *                         username: { type: string }
 *                         environment: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증이 필요합니다 (프로덕션 환경만)
 *       409:
 *         description: 중복된 콘서트 UID
 *       500:
 *         description: 서버 에러
 */
export const uploadConcert = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // 요청 데이터 유효성 검사
    if (!req.body) {
      return res.status(400).json({
        message: "요청 본문이 비어있습니다.",
        timestamp: new Date().toISOString(),
      });
    }

    // 미들웨어에서 이미 인증 처리되었으므로 여기서는 서비스 로직만
    const result = await ConcertService.createConcert(req.body);

    if (result.success) {
      // 세션 정보 가져오기 (개발환경에서는 임시 세션이 생성됨)
      const userInfo = {
        email: req.session?.user?.email || "unknown@localhost",
        username: req.session?.user?.username || "unknown-user",
        userId: req.session?.user?.userId || "unknown-id",
      };

      logger.info(
        `✅ 콘서트 정보 저장 완료: ${result.data.title} (UID: ${result.data.uid}) - 업로드 사용자: ${userInfo.username} (${userInfo.email})`
      );

      res.status(result.statusCode || 201).json({
        message: "콘서트 정보 업로드 성공",
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
            environment: process.env.NODE_ENV || "development",
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
        message: result.error || "콘서트 업로드 실패",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("❌ 콘서트 업로드 컨트롤러 에러:", error);

    // 구체적인 에러 타입에 따른 응답
    if (error instanceof Error) {
      if (error.message.includes("유효성 검사 실패")) {
        return res.status(400).json({
          message: "입력 데이터가 유효하지 않습니다.",
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (error.message.includes("중복")) {
        return res.status(409).json({
          message: "중복된 콘서트 UID입니다.",
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(500).json({
      message: "서버 에러로 콘서트 업로드 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert/{id}:
 *   get:
 *     summary: 특정 콘서트 정보 조회
 *     description: |
 *       ObjectId 또는 UID로 특정 콘서트의 상세 정보를 조회합니다.
 *       로그인한 사용자의 경우 좋아요 여부도 포함됩니다.
 *       인증 없이 접근 가능합니다.
 *
 *       **업데이트된 스키마**:
 *       - location: 문자열 배열로 반환
 *       - infoImages: 이미지 URL 배열로 반환
 *     tags: [Concerts - Basic]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *         example: concert_1703123456789_abc123
 *     responses:
 *       200:
 *         description: 콘서트 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "콘서트 정보 조회 성공"
 *                 data:
 *                   $ref: '#/components/schemas/Concert'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         isAuthenticated: { type: boolean }
 *                         userId: { type: string }
 *                         likedByUser: { type: boolean }
 *                     concertInfo:
 *                       type: object
 *                       properties:
 *                         likesCount: { type: integer }
 *                         status: { type: string }
 *                         hasTicketInfo: { type: boolean }
 *                         upcomingDates: { type: integer }
 *                 timestamp: { type: string, format: date-time }
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const getConcert = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;

    // ID 유효성 검사
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        message: "콘서트 ID가 필요합니다.",
        timestamp: new Date().toISOString(),
      });
    }

    // 세션에서 사용자 ID 가져오기 (로그인하지 않은 경우 undefined)
    const userId = req.session?.user?.userId;

    logger.info(
      `🔍 콘서트 조회 요청: ID=${id}, 사용자=${userId ? "로그인됨" : "비로그인"}`
    );

    const result = await ConcertService.getConcert(id, userId);

    if (result.success) {
      res.status(result.statusCode || 200).json({
        message: "콘서트 정보 조회 성공",
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
                (date: Date) => new Date(date) > new Date()
              ).length || 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      const statusCode =
        result.statusCode || (result.error?.includes("찾을 수 없") ? 404 : 500);
      res.status(statusCode).json({
        message: result.error || "콘서트 조회 실패",
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.info("❌ 콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      requestedId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert:
 *   get:
 *     summary: 콘서트 목록 조회 (페이지네이션, 필터링, 정렬 지원)
 *     description: |
 *       모든 콘서트 목록을 페이지네이션과 필터링을 통해 조회합니다.
 *       로그인한 사용자의 경우 좋아요 상태도 포함됩니다.
 *       인증 없이 접근 가능합니다.
 *
 *       **업데이트된 스키마**:
 *       - location: 문자열 배열로 반환
 *       - infoImages: 이미지 URL 배열로 반환
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
 *         name: title
 *         schema:
 *           type: string
 *         description: 제목으로 검색
 *         example: "아이유"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, r&b/ballad, tour, idol, festival, fan, other]
 *         description: 음악 카테고리 필터
 *       - in: query
 *         name: artist
 *         schema:
 *           type: string
 *         description: 아티스트명 필터 (부분 검색)
 *         example: 아이유
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: 위치 필터 (부분 검색)
 *         example: 서울
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: 콘서트 상태 필터
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, likes, created]
 *           default: date
 *         description: 정렬 기준 (date=날짜순, likes=좋아요순, created=생성순)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 전체 텍스트 검색 (제목, 아티스트, 설명 등)
 *     responses:
 *       200:
 *         description: 콘서트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     concerts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Concert'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage: { type: integer }
 *                         totalPages: { type: integer }
 *                         totalConcerts: { type: integer }
 *                         limit: { type: integer }
 *                 metadata:
 *                   type: object
 *                 timestamp: { type: string, format: date-time }
 *       500:
 *         description: 서버 에러
 */
export const getAllConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // 쿼리 파라미터 유효성 검사
    const page = safeParseInt(req.query.page, 1);
    const limit = Math.min(safeParseInt(req.query.limit, 20), 100);

    if (page < 1) {
      return res.status(400).json({
        message: "페이지 번호는 1 이상이어야 합니다.",
        timestamp: new Date().toISOString(),
      });
    }

    if (limit < 1) {
      return res.status(400).json({
        message: "페이지당 항목 수는 1 이상이어야 합니다.",
        timestamp: new Date().toISOString(),
      });
    }

    // 사용자 ID 가져오기 (로그인된 경우)
    const userId = req.session?.user?.userId;

    logger.info(
      `📋 콘서트 목록 조회: page=${page}, limit=${limit}, 사용자=${userId ? "로그인됨" : "비로그인"}`
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
      .filter(([key, value]) => value)
      .map(([key]) => key);
    if (activeFilters.length > 0) {
      logger.info(`🔍 적용된 필터: ${activeFilters.join(", ")}`);
    }

    const result = await ConcertService.getAllConcerts(
      {
        ...req.query,
        page,
        limit,
      },
      userId
    );

    if (result.success) {
      res.status(result.statusCode || 200).json({
        message: "콘서트 목록 조회 성공",
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
            sortBy: req.query.sortBy || "date",
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
        message: result.error || "콘서트 목록 조회 실패",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("❌ 콘서트 목록 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 목록 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};
/**
 * @swagger
 * /concert/{id}:
 *   put:
 *     summary: 콘서트 정보 수정
 *     description: |
 *       ObjectId 또는 UID로 특정 콘서트의 정보를 수정합니다.
 *       인증이 필요합니다. 세션의 user.email, user.userId 정보를 사용하여 권한을 확인합니다.
 *       좋아요 관련 필드(likes, likesCount)와 UID는 수정할 수 없습니다.
 *
 *       **업데이트된 스키마**:
 *       - location: 문자열 배열로 수정
 *       - infoImages: 이미지 URL 배열로 수정
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *         example: concert_1703123456789_abc123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "아이유 콘서트 2024 - 수정됨"
 *                 maxLength: 200
 *                 description: 콘서트 제목
 *               artist:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["아이유", "새로운 특별 게스트"]
 *                 description: 아티스트 목록
 *               location:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 공연 장소 목록 (문자열 배열)
 *                 example: ["서울 올림픽공원 체조경기장"]
 *                 minItems: 1
 *               datetime:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date-time
 *                 description: 공연 일시 목록
 *                 example: ["2024-06-15T19:00:00+09:00"]
 *                 minItems: 1
 *               description:
 *                 type: string
 *                 example: "수정된 콘서트 설명"
 *                 maxLength: 2000
 *                 description: 콘서트 상세 설명
 *               status:
 *                 type: string
 *                 enum: [upcoming, ongoing, completed, cancelled]
 *                 example: "upcoming"
 *                 description: 콘서트 상태
 *               ticketOpenDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-05-15T10:00:00+09:00"
 *                 description: 티켓 오픈 일시
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [rock/metal/indie, jazz/soul, rap/hiphop/edm, folk/trot, r&b/ballad, tour, idol, festival, fan, other]
 *                 example: ["tour", "idol"]
 *                 description: 음악 카테고리
 *               posterImage:
 *                 type: string
 *                 format: uri
 *                 description: 포스터 이미지 URL
 *                 example: "https://your-bucket.s3.amazonaws.com/concerts/updated/poster.jpg"
 *               infoImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: 정보 이미지 URL 배열 (기존 info에서 변경)
 *                 example: ["https://your-bucket.s3.amazonaws.com/concerts/updated/info1.jpg"]
 *               price:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     tier: { type: string, example: "VIP" }
 *                     amount: { type: number, example: 180000 }
 *                 description: 가격 정보 (선택사항)
 *               ticketLink:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     platform: { type: string, example: "티켓링크" }
 *                     url: { type: string, example: "https://ticketlink.co.kr/example" }
 *                 description: 티켓 예매 링크
 *           examples:
 *             titleUpdate:
 *               summary: 제목만 수정
 *               value:
 *                 title: "아이유 콘서트 2024 - 추가 공연 확정"
 *             statusUpdate:
 *               summary: 상태 변경
 *               value:
 *                 status: "ongoing"
 *             fullUpdate:
 *               summary: 여러 필드 동시 수정
 *               value:
 *                 title: "아이유 콘서트 2024 - HEREH WORLD TOUR"
 *                 location: ["서울 올림픽공원 체조경기장", "부산 BEXCO"]
 *                 datetime: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 description: "아이유의 월드투어 한국 공연"
 *                 category: ["idol", "tour"]
 *     responses:
 *       200:
 *         description: 콘서트 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "콘서트 정보 수정 성공"
 *                 data:
 *                   $ref: '#/components/schemas/Concert'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         modifiedBy:
 *                           type: string
 *                           example: "admin@example.com"
 *                         username:
 *                           type: string
 *                           example: "admin-user"
 *                         modifiedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-07-02T10:30:00Z"
 *                     changes:
 *                       type: object
 *                       properties:
 *                         fieldsModified:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["title", "location", "datetime"]
 *                         restrictedFieldsIgnored:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-07-02T10:30:00Z"
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "수정할 데이터가 없습니다." }
 *                 error: { type: string }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       401:
 *         description: 인증이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "인증이 필요합니다." }
 *                 timestamp: { type: string, format: date-time }
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트를 찾을 수 없습니다." }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트 수정 실패" }
 *                 error: { type: string }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 */
export const updateConcert = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;

    // ID 유효성 검사
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        message: "콘서트 ID가 필요합니다.",
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }

    // 요청 본문 유효성 검사
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "수정할 데이터가 없습니다.",
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }

    // 수정 불가능한 필드 확인 및 제거
    const restrictedFields = ["uid", "likes", "likesCount", "_id", "createdAt"];
    const providedRestrictedFields = restrictedFields.filter((field) =>
      req.body.hasOwnProperty(field)
    );

    if (providedRestrictedFields.length > 0) {
      logger.info(
        `⚠️ 수정 불가능한 필드 감지: ${providedRestrictedFields.join(", ")} - 해당 필드들은 무시됩니다.`
      );
      // 경고만 하고 해당 필드들을 제거
      providedRestrictedFields.forEach((field) => delete req.body[field]);
    }

    // 수정 가능한 필드가 남아있는지 확인
    const modifiableFields = Object.keys(req.body).filter(
      (key) => !restrictedFields.includes(key)
    );

    if (modifiableFields.length === 0) {
      return res.status(400).json({
        message: "수정 가능한 필드가 없습니다.",
        restrictedFieldsProvided: providedRestrictedFields,
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }

    // 미들웨어에서 이미 인증 확인됨
    const result = await ConcertService.updateConcert(id, req.body);

    if (result.success) {
      const userInfo = {
        email: req.session?.user?.email || "unknown@localhost",
        username: req.session?.user?.username || "unknown-user",
        userId: req.session?.user?.userId || "unknown-id",
      };

      logger.info(
        `✅ 콘서트 정보 수정 완료: ${id} - 수정 필드: [${modifiableFields.join(", ")}] - 수정 사용자: ${userInfo.username} (${userInfo.email})`
      );

      res.status(result.statusCode || 200).json({
        message: "콘서트 정보 수정 성공",
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
        result.statusCode || (result.error?.includes("찾을 수 없") ? 404 : 400);
      res.status(statusCode).json({
        message: result.error || "콘서트 수정 실패",
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.info("❌ 콘서트 수정 컨트롤러 에러:", error);

    // 구체적인 에러 타입에 따른 응답
    if (error instanceof Error) {
      if (error.message.includes("유효성 검사 실패")) {
        return res.status(400).json({
          message: "수정 데이터가 유효하지 않습니다.",
          error: error.message,
          requestedId: req.params.id,
          timestamp: new Date().toISOString(),
        });
      }

      if (error.message.includes("찾을 수 없")) {
        return res.status(404).json({
          message: "콘서트를 찾을 수 없습니다.",
          error: error.message,
          requestedId: req.params.id,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(500).json({
      message: "콘서트 수정 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      requestedId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  }
};
/**
 * @swagger
 * /concert/{id}:
 *   delete:
 *     summary: 콘서트 삭제
 *     description: |
 *       ObjectId 또는 UID로 특정 콘서트를 삭제합니다.
 *       인증이 필요합니다. 세션의 user.email, user.userId 정보를 사용하여 권한을 확인합니다.
 *       삭제된 콘서트는 복구할 수 없으므로 주의가 필요합니다.
 *
 *       **주의사항**:
 *       - 삭제된 데이터는 복구할 수 없습니다
 *       - 좋아요 정보도 함께 삭제됩니다
 *       - 관련된 이미지 파일은 별도로 정리해야 합니다
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *         example: concert_1703123456789_abc123
 *     responses:
 *       200:
 *         description: 콘서트 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "콘서트 삭제 성공"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     uid:
 *                       type: string
 *                       example: "concert_1703123456789_abc123"
 *                     title:
 *                       type: string
 *                       example: "아이유 콘서트 2024"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     userInfo:
 *                       type: object
 *                       properties:
 *                         deletedBy:
 *                           type: string
 *                           example: "admin@example.com"
 *                           description: 삭제를 수행한 사용자 이메일
 *                         username:
 *                           type: string
 *                           example: "admin-user"
 *                           description: 삭제를 수행한 사용자명
 *                         deletedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-07-02T10:30:00Z"
 *                           description: 삭제된 시간
 *                     deletedConcert:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: "아이유 콘서트 2024"
 *                           description: 삭제된 콘서트 제목
 *                         uid:
 *                           type: string
 *                           example: "concert_1703123456789_abc123"
 *                           description: 삭제된 콘서트 UID
 *                         likesCount:
 *                           type: integer
 *                           example: 150
 *                           description: 삭제 당시 좋아요 수
 *                         status:
 *                           type: string
 *                           example: "upcoming"
 *                           description: 삭제 당시 콘서트 상태
 *                         locationCount:
 *                           type: integer
 *                           example: 2
 *                           description: 공연 장소 개수
 *                         datetimeCount:
 *                           type: integer
 *                           example: 3
 *                           description: 공연 일정 개수
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-07-02T10:30:00Z"
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트 ID가 필요합니다." }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       401:
 *         description: 인증이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "인증이 필요합니다." }
 *                 timestamp: { type: string, format: date-time }
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트를 찾을 수 없습니다." }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "콘서트 삭제 실패" }
 *                 error: { type: string }
 *                 requestedId: { type: string }
 *                 timestamp: { type: string, format: date-time }
 */
export const deleteConcert = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;

    // ID 유효성 검사
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        message: "콘서트 ID가 필요합니다.",
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
        email: req.session?.user?.email || "unknown@localhost",
        username: req.session?.user?.username || "unknown-user",
        userId: req.session?.user?.userId || "unknown-id",
      };

      logger.info(
        `✅ 콘서트 삭제 완료: ${id} (제목: ${result.data?.title || concertInfo?.title || "제목 없음"}) - 삭제 사용자: ${userInfo.username} (${userInfo.email})`
      );

      // 삭제된 콘서트의 상세 정보 로깅
      if (concertInfo) {
        logger.info(
          `📊 삭제된 콘서트 정보: 좋아요 ${concertInfo.likesCount || 0}개, 상태: ${concertInfo.status || "unknown"}`
        );
      }

      res.status(result.statusCode || 200).json({
        message: "콘서트 삭제 성공",
        data: result.data,
        metadata: {
          userInfo: {
            deletedBy: userInfo.email,
            username: userInfo.username,
            deletedAt: new Date().toISOString(),
          },
          deletedConcert: {
            title: result.data?.title || concertInfo?.title || "제목 없음",
            uid: result.data?.uid || id,
            likesCount: result.data?.likesCount || concertInfo?.likesCount || 0,
            status: result.data?.status || concertInfo?.status || "unknown",
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
            message: "삭제된 데이터는 복구할 수 없습니다.",
            deletedAt: new Date().toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      const statusCode =
        result.statusCode || (result.error?.includes("찾을 수 없") ? 404 : 500);

      logger.info(`❌ 콘서트 삭제 실패: ${id} - ${result.error}`);

      res.status(statusCode).json({
        message: result.error || "콘서트 삭제 실패",
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("❌ 콘서트 삭제 컨트롤러 에러:", error);

    // 구체적인 에러 타입에 따른 응답
    if (error instanceof Error) {
      if (error.message.includes("찾을 수 없")) {
        return res.status(404).json({
          message: "콘서트를 찾을 수 없습니다.",
          error: error.message,
          requestedId: req.params.id,
          timestamp: new Date().toISOString(),
        });
      }

      if (error.message.includes("권한")) {
        return res.status(403).json({
          message: "콘서트 삭제 권한이 없습니다.",
          error: error.message,
          requestedId: req.params.id,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(500).json({
      message: "콘서트 삭제 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      requestedId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  }
};
