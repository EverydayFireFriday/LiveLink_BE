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
 *                 category: ["pop", "k-pop"]
 *                 ticketLink: [{"platform": "인터파크", "url": "https://ticket.interpark.com/example"}]
 *                 ticketOpenDate: "2024-05-01T10:00:00+09:00"
 *                 posterImage: "https://your-bucket.s3.amazonaws.com/concerts/iu2024/poster.jpg"
 *                 info: ["주차 가능", "음식 반입 불가", "사진 촬영 금지"]
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
 *                 info: ["아티스트 미정", "추후 공지"]
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
        `콘서트 정보 저장 완료: ${result.data.title} (UID: ${result.data.uid}) - 업로드 사용자: ${userInfo.username} (${userInfo.email})`
      );

      res.status(result.statusCode!).json({
        message: "콘서트 정보 업로드 성공",
        data: result.data,
        imageInfo: {
          posterImageProvided: !!result.data.posterImage,
          infoItemsCount: result.data.info ? result.data.info.length : 0,
        },
        userInfo: {
          uploadedBy: userInfo.email,
          environment: process.env.NODE_ENV,
          loginTime: req.session?.user?.loginTime,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("콘서트 업로드 컨트롤러 에러:", error);
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
    // 세션에서 사용자 ID 가져오기 (로그인하지 않은 경우 undefined)
    const userId = req.session?.user?.userId;

    const result = await ConcertService.getConcert(id, userId);

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "콘서트 정보 조회 성공",
        data: result.data,
        userInfo: userId
          ? {
              isAuthenticated: true,
              userId: req.session?.user?.userId,
              email: req.session?.user?.email,
            }
          : {
              isAuthenticated: false,
            },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
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
 *           enum: [pop, rock, jazz, classical, hiphop, electronic, indie, folk, r&b, country, musical, opera, other]
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
    // 사용자 ID 가져오기 (로그인된 경우)
    const userId = req.session?.user?.userId;

    const result = await ConcertService.getAllConcerts(req.query, userId);

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "콘서트 목록 조회 성공",
        data: result.data, // 이미 concerts와 pagination 포함
        userInfo: userId
          ? {
              isAuthenticated: true,
              userId: req.session?.user?.userId,
              email: req.session?.user?.email,
            }
          : {
              isAuthenticated: false,
            },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("콘서트 목록 조회 컨트롤러 에러:", error);
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
 *     responses:
 *       200:
 *         description: 콘서트 수정 성공
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
    // 미들웨어에서 이미 인증 확인됨
    const { id } = req.params;
    const result = await ConcertService.updateConcert(id, req.body);

    if (result.success) {
      const userInfo = {
        email: req.session?.user?.email || "unknown@localhost",
        username: req.session?.user?.username || "unknown-user",
        userId: req.session?.user?.userId || "unknown-id",
      };

      console.log(
        `콘서트 정보 수정 완료: ${id} - 수정 사용자: ${userInfo.username} (${userInfo.email})`
      );

      res.status(result.statusCode!).json({
        message: "콘서트 정보 수정 성공",
        data: result.data,
        userInfo: {
          modifiedBy: userInfo.email,
          modifiedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("콘서트 수정 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 수정 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
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
    // 미들웨어에서 이미 인증 확인됨
    const { id } = req.params;
    const result = await ConcertService.deleteConcert(id);

    if (result.success) {
      const userInfo = {
        email: req.session?.user?.email || "unknown@localhost",
        username: req.session?.user?.username || "unknown-user",
        userId: req.session?.user?.userId || "unknown-id",
      };

      console.log(
        `콘서트 삭제 완료: ${id} - 삭제 사용자: ${userInfo.username} (${userInfo.email})`
      );

      res.status(result.statusCode!).json({
        message: "콘서트 삭제 성공",
        data: result.data,
        userInfo: {
          deletedBy: userInfo.email,
          deletedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("콘서트 삭제 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 삭제 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
      timestamp: new Date().toISOString(),
    });
  }
};
