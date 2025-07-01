import express from "express";
import { ConcertService } from "../../services/concert/concertService";

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
 *     tags: [Concerts - Basic]
 *     security:
 *       - sessionAuth: []
 *       - {} # 개발환경에서는 인증 없이도 가능
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConcertCreateRequest'
 *           examples:
 *             fullExample:
 *               summary: 완전한 콘서트 등록 예시
 *               value:
 *                 uid: "concert_1703123456789_iu2024"
 *                 title: "아이유 콘서트 2024"
 *                 artist: ["아이유", "특별 게스트"]
 *                 location: [{"location": "올림픽공원 체조경기장"}]
 *                 datetime: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *                 price: [{"tier": "VIP", "amount": 200000}, {"tier": "R석", "amount": 150000}]
 *                 description: "아이유의 특별한 콘서트"
 *                 category: ["pop", "kpop"]
 *                 ticketLink: [{"platform": "인터파크", "url": "https://ticket.interpark.com/example"}]
 *                 ticketOpenDate: "2024-05-01T10:00:00+09:00"
 *                 posterImage: "https://your-bucket.s3.amazonaws.com/concerts/iu2024/poster.jpg"
 *                 info: ["https://your-bucket.s3.amazonaws.com/concerts/iu2024/info1.jpg", "https://your-bucket.s3.amazonaws.com/concerts/iu2024/info2.jpg", "https://your-bucket.s3.amazonaws.com/concerts/iu2024/info3.jpg"]
 *                 tags: ["발라드", "K-POP", "솔로"]
 *                 status: "upcoming"
 *             minimalExample:
 *               summary: 최소 필수 데이터만
 *               value:
 *                 uid: "concert_1703123456789_minimal"
 *                 title: "최소 데이터 콘서트"
 *                 location: [{"location": "어딘가 공연장"}]
 *                 datetime: ["2024-07-01T20:00:00+09:00"]
 *             emptyArtistExample:
 *               summary: 빈 아티스트 배열 (허용됨)
 *               value:
 *                 uid: "concert_1703123456789_unknown"
 *                 title: "미정 콘서트"
 *                 artist: []
 *                 location: [{"location": "미정"}]
 *                 datetime: ["2024-12-31T19:00:00+09:00"]
 *                 info: ["https://your-bucket.s3.amazonaws.com/concerts/unknown/placeholder.jpg"]
 *                 status: "upcoming"
 *     responses:
 *       201:
 *         description: 콘서트 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Concert'
 *             example:
 *               message: "콘서트 정보 업로드 성공"
 *               data:
 *                 _id: "507f1f77bcf86cd799439011"
 *                 uid: "concert_1703123456789_iu2024"
 *                 title: "아이유 콘서트 2024"
 *                 artist: ["아이유"]
 *                 location: [{"location": "올림픽공원 체조경기장"}]
 *                 datetime: ["2024-06-15T19:00:00+09:00"]
 *                 likesCount: 0
 *                 status: "upcoming"
 *                 createdAt: "2024-06-21T12:00:00Z"
 *                 updatedAt: "2024-06-21T12:00:00Z"
 *               imageInfo:
 *                 posterImageProvided: true
 *                 infoItemsCount: 3
 *               userInfo:
 *                 uploadedBy: "dev-user@localhost"
 *                 environment: "development"
 *               timestamp: "2024-06-21T12:00:00Z"
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

      console.log(
        `✅ 콘서트 정보 저장 완료: ${result.data.title} (UID: ${result.data.uid}) - 업로드 사용자: ${userInfo.username} (${userInfo.email})`
      );

      res.status(result.statusCode || 201).json({
        message: "콘서트 정보 업로드 성공",
        data: result.data,
        metadata: {
          imageInfo: {
            posterImageProvided: !!result.data.posterImage,
            infoItemsCount: result.data.info ? result.data.info.length : 0,
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
    console.error("❌ 콘서트 업로드 컨트롤러 에러:", error);

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
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Concert'
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

    console.log(
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
                likedByUser: result.data.isLikedByUser || false,
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
    console.error("❌ 콘서트 조회 컨트롤러 에러:", error);
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
 *           enum: [pop, rock, jazz, classical, hiphop, electronic, indie, folk, r&b, country, musical, opera, kpop, j-pop, c-pop, ballad, dance, trot, rap, hip-hop, edm, house, techno, dubstep, reggae, blues, soul, funk, punk, metal, alternative, grunge, fusion, world, latin, gospel, new-age, ambient, instrumental, acoustic, live, concert, festival, other]
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
 *               $ref: '#/components/schemas/ConcertListResponse'
 *       500:
 *         description: 서버 에러
 */
export const getAllConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // 쿼리 파라미터 유효성 검사
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

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

    console.log(
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
      console.log(`🔍 적용된 필터: ${activeFilters.join(", ")}`);
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
    console.error("❌ 콘서트 목록 조회 컨트롤러 에러:", error);
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
 *               artist:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["아이유", "새로운 특별 게스트"]
 *               description:
 *                 type: string
 *                 example: "수정된 콘서트 설명"
 *               status:
 *                 type: string
 *                 enum: [upcoming, ongoing, completed, cancelled]
 *                 example: "upcoming"
 *               location:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     location:
 *                       type: string
 *               datetime:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date-time
 *               ticketOpenDate:
 *                 type: string
 *                 format: date-time
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 콘서트 수정 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증이 필요합니다
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
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
        timestamp: new Date().toISOString(),
      });
    }

    // 요청 본문 유효성 검사
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "수정할 데이터가 없습니다.",
        timestamp: new Date().toISOString(),
      });
    }

    // 수정 불가능한 필드 확인 및 제거
    const restrictedFields = ["uid", "likes", "likesCount", "_id", "createdAt"];
    const providedRestrictedFields = restrictedFields.filter((field) =>
      req.body.hasOwnProperty(field)
    );

    if (providedRestrictedFields.length > 0) {
      console.log(
        `⚠️ 수정 불가능한 필드 감지: ${providedRestrictedFields.join(", ")}`
      );
      // 경고만 하고 해당 필드들을 제거
      providedRestrictedFields.forEach((field) => delete req.body[field]);
    }

    // 미들웨어에서 이미 인증 확인됨
    const result = await ConcertService.updateConcert(id, req.body);

    if (result.success) {
      const userInfo = {
        email: req.session?.user?.email || "unknown@localhost",
        username: req.session?.user?.username || "unknown-user",
        userId: req.session?.user?.userId || "unknown-id",
      };

      console.log(
        `✅ 콘서트 정보 수정 완료: ${id} - 수정 사용자: ${userInfo.username} (${userInfo.email})`
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
            fieldsModified: Object.keys(req.body).filter(
              (key) => !restrictedFields.includes(key)
            ),
            restrictedFieldsIgnored: providedRestrictedFields,
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
    console.error("❌ 콘서트 수정 컨트롤러 에러:", error);

    // 구체적인 에러 타입에 따른 응답
    if (error instanceof Error && error.message.includes("유효성 검사 실패")) {
      return res.status(400).json({
        message: "수정 데이터가 유효하지 않습니다.",
        error: error.message,
        requestedId: req.params.id,
        timestamp: new Date().toISOString(),
      });
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
 *       401:
 *         description: 인증이 필요합니다
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
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
        timestamp: new Date().toISOString(),
      });
    }

    // 미들웨어에서 이미 인증 확인됨
    const result = await ConcertService.deleteConcert(id);

    if (result.success) {
      const userInfo = {
        email: req.session?.user?.email || "unknown@localhost",
        username: req.session?.user?.username || "unknown-user",
        userId: req.session?.user?.userId || "unknown-id",
      };

      console.log(
        `✅ 콘서트 삭제 완료: ${id} (제목: ${result.data?.title || "제목 없음"}) - 삭제 사용자: ${userInfo.username} (${userInfo.email})`
      );

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
            title: result.data?.title || "제목 없음",
            uid: result.data?.uid || id,
            likesCount: result.data?.likesCount || 0,
            status: result.data?.status || "unknown",
          },
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      const statusCode =
        result.statusCode || (result.error?.includes("찾을 수 없") ? 404 : 500);
      res.status(statusCode).json({
        message: result.error || "콘서트 삭제 실패",
        requestedId: id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("❌ 콘서트 삭제 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 삭제 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      requestedId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert/{id}/like:
 *   post:
 *     summary: 콘서트 좋아요 추가
 *     description: |
 *       특정 콘서트에 좋아요를 추가합니다.
 *       인증이 필요하며, 이미 좋아요한 콘서트인 경우 에러를 반환합니다.
 *     tags: [Concerts - Likes]
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
 *         description: 좋아요 추가 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Concert'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     userInfo:
 *                       type: object
 *                     likeInfo:
 *                       type: object
 *       400:
 *         description: 이미 좋아요한 콘서트
 *       401:
 *         description: 인증이 필요합니다
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const likeConcert = async (
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

    // 사용자 인증 확인 (미들웨어에서 이미 처리되었지만 재확인)
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({
        message: "로그인이 필요합니다.",
        timestamp: new Date().toISOString(),
      });
    }

    // 좋아요 기능이 아직 서비스에 구현되지 않은 경우 임시 응답
    // const result = await ConcertService.likeConcert(id, userId);

    // 임시로 에러 응답 반환
    res.status(501).json({
      message: "좋아요 기능이 아직 구현되지 않았습니다.",
      requestedId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 좋아요 추가 컨트롤러 에러:", error);
    res.status(500).json({
      message: "좋아요 추가 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      requestedId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert/{id}/unlike:
 *   delete:
 *     summary: 콘서트 좋아요 취소
 *     description: |
 *       특정 콘서트의 좋아요를 취소합니다.
 *       인증이 필요합니다.
 *     tags: [Concerts - Likes]
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
 *         description: 좋아요 취소 성공
 *       401:
 *         description: 인증이 필요합니다
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const unlikeConcert = async (
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

    // 사용자 인증 확인
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({
        message: "로그인이 필요합니다.",
        timestamp: new Date().toISOString(),
      });
    }

    // 좋아요 취소 기능이 아직 서비스에 구현되지 않은 경우 임시 응답
    // const result = await ConcertService.unlikeConcert(id, userId);

    // 임시로 에러 응답 반환
    res.status(501).json({
      message: "좋아요 취소 기능이 아직 구현되지 않았습니다.",
      requestedId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 좋아요 취소 컨트롤러 에러:", error);
    res.status(500).json({
      message: "좋아요 취소 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      requestedId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert/liked:
 *   get:
 *     summary: 사용자가 좋아요한 콘서트 목록 조회
 *     description: |
 *       현재 로그인한 사용자가 좋아요한 콘서트 목록을 조회합니다.
 *       인증이 필요합니다.
 *     tags: [Concerts - Likes]
 *     security:
 *       - sessionAuth: []
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
 *     responses:
 *       200:
 *         description: 좋아요한 콘서트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConcertListResponse'
 *       401:
 *         description: 인증이 필요합니다
 *       500:
 *         description: 서버 에러
 */
export const getLikedConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // 사용자 인증 확인
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.status(401).json({
        message: "로그인이 필요합니다.",
        timestamp: new Date().toISOString(),
      });
    }

    // 쿼리 파라미터 유효성 검사
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit as string) || 20, 1),
      100
    );

    // 좋아요한 콘서트 조회 기능이 아직 서비스에 구현되지 않은 경우 임시 응답
    // const result = await ConcertService.getLikedConcerts(userId, { page, limit });

    // 임시로 에러 응답 반환
    res.status(501).json({
      message: "좋아요한 콘서트 조회 기능이 아직 구현되지 않았습니다.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 좋아요한 콘서트 목록 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "좋아요한 콘서트 목록 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert/search:
 *   get:
 *     summary: 콘서트 텍스트 검색
 *     description: |
 *       제목, 아티스트, 설명 등에서 텍스트 검색을 수행합니다.
 *       MongoDB의 텍스트 인덱스를 활용한 전체 텍스트 검색입니다.
 *       인증 없이 접근 가능합니다.
 *     tags: [Concerts - Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색 키워드
 *         example: "아이유 콘서트"
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
 *     responses:
 *       200:
 *         description: 검색 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConcertListResponse'
 *       400:
 *         description: 검색 키워드가 필요합니다
 *       500:
 *         description: 서버 에러
 */
export const searchConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const searchQuery = req.query.q as string;

    // 검색 키워드 유효성 검사
    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        message: "검색 키워드가 필요합니다.",
        timestamp: new Date().toISOString(),
      });
    }

    if (searchQuery.trim().length < 2) {
      return res.status(400).json({
        message: "검색 키워드는 최소 2자 이상이어야 합니다.",
        timestamp: new Date().toISOString(),
      });
    }

    // 쿼리 파라미터 유효성 검사
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit as string) || 20, 1),
      100
    );

    // 사용자 ID 가져오기 (로그인된 경우)
    const userId = req.session?.user?.userId;

    console.log(
      `🔍 콘서트 텍스트 검색: "${searchQuery}" - 사용자: ${userId ? "로그인됨" : "비로그인"}`
    );

    // 검색 기능이 아직 서비스에 구현되지 않은 경우 임시 응답
    // const result = await ConcertService.searchConcerts(searchQuery, { page, limit }, userId);

    // 임시로 에러 응답 반환
    res.status(501).json({
      message: "콘서트 검색 기능이 아직 구현되지 않았습니다.",
      searchQuery,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 콘서트 검색 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 검색 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      searchQuery: req.query.q,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /concert/stats:
 *   get:
 *     summary: 콘서트 통계 정보 조회
 *     description: |
 *       전체 콘서트의 상태별 통계와 좋아요 통계 정보를 조회합니다.
 *       인증 없이 접근 가능합니다.
 *     tags: [Concerts - Analytics]
 *     responses:
 *       200:
 *         description: 통계 조회 성공
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
 *                     total:
 *                       type: integer
 *                     upcoming:
 *                       type: integer
 *                     ongoing:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *                     totalLikes:
 *                       type: integer
 *                     averageLikes:
 *                       type: number
 *       500:
 *         description: 서버 에러
 */
export const getConcertStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // 통계 기능이 아직 서비스에 구현되지 않은 경우 임시 응답
    // const result = await ConcertService.getConcertStats();

    // 임시로 에러 응답 반환
    res.status(501).json({
      message: "콘서트 통계 조회 기능이 아직 구현되지 않았습니다.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 콘서트 통계 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 통계 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};
