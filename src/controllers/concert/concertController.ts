import express from "express";
import { ConcertService } from "../../services/concert/concertService";

/**
 * @swagger
 * /concert:
 *   post:
 *     summary: 콘서트 정보 업로드
 *     description: 콘서트 정보를 MongoDB에 저장합니다. UID에서 timestamp를 추출하여 ObjectId로 변환합니다.
 *     tags: [Concerts - Basic]
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
 *                 description: 사용자 지정 ID (timestamp 포함)
 *                 example: concert_1703123456789_abc123
 *               title:
 *                 type: string
 *                 description: 콘서트 제목
 *                 example: 아이유 콘서트 2024
 *               artist:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 아티스트명 배열 (빈 배열 허용)
 *                 example: ["아이유", "특별 게스트"]
 *               location:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     location:
 *                       type: string
 *                       description: 공연장소
 *                 description: 공연 장소 정보 배열
 *                 example: [{"location": "올림픽공원 체조경기장"}]
 *               datetime:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date-time
 *                 description: 공연 날짜 및 시간 배열 (ISO 8601 형식)
 *                 example: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"]
 *               price:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     tier:
 *                       type: string
 *                       description: 티켓 등급
 *                     amount:
 *                       type: number
 *                       description: 가격 (원)
 *                 description: 티켓 가격 정보 배열
 *                 example: [{"tier": "VIP", "amount": 200000}, {"tier": "R석", "amount": 150000}]
 *               description:
 *                 type: string
 *                 description: 콘서트 설명
 *                 example: 아이유의 특별한 콘서트
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [pop, rock, jazz, classical, hiphop, electronic, indie, folk, r&b, country, musical, opera, other]
 *                 description: 음악 카테고리 배열
 *                 example: ["pop", "k-pop"]
 *               ticketLink:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                       description: 티켓 판매 플랫폼명
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: 티켓 구매 링크
 *                 description: 티켓 구매 링크 배열
 *                 example: [{"platform": "인터파크", "url": "https://ticket.interpark.com/example"}]
 *               ticketOpenDate:
 *                 type: string
 *                 format: date-time
 *                 description: 티켓 오픈 날짜/시간
 *                 example: "2024-05-01T10:00:00+09:00"
 *               posterImage:
 *                 type: string
 *                 format: uri
 *                 description: S3에 업로드된 포스터 이미지 URL
 *                 example: https://your-bucket.s3.amazonaws.com/concerts/poster.jpg
 *               info:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 콘서트 추가 정보 배열
 *                 example: ["주차 가능", "음식 반입 불가", "사진 촬영 금지"]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 콘서트 태그 배열
 *                 example: ["발라드", "K-POP", "솔로"]
 *     responses:
 *       201:
 *         description: 콘서트 업로드 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증이 필요합니다 (로그인 필요)
 *       500:
 *         description: 서버 에러
 */
export const uploadConcert = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // 세션에서 사용자 정보 확인
    if (!req.session?.user) {
      return res.status(401).json({
        message: "로그인이 필요합니다",
        error: "AUTHENTICATION_REQUIRED",
      });
    }

    const result = await ConcertService.createConcert(req.body);

    if (result.success) {
      console.log(
        `콘서트 정보 저장 완료: ${result.data.title} (UID: ${result.data.uid}) - 업로드 사용자: ${req.session.user.username}`
      );

      res.status(result.statusCode!).json({
        message: "콘서트 정보 업로드 성공",
        concert: result.data,
        imageInfo: {
          posterImageProvided: !!result.data.posterImage,
          infoItemsCount: result.data.info ? result.data.info.length : 0,
        },
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    console.error("콘서트 업로드 컨트롤러 에러:", error);
    res.status(500).json({
      message: "서버 에러로 콘서트 업로드 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert/{id}:
 *   get:
 *     summary: 특정 콘서트 정보 조회
 *     description: ObjectId 또는 UID로 특정 콘서트의 상세 정보를 조회합니다. 로그인한 사용자의 경우 좋아요 여부도 포함됩니다.
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
        concert: result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    console.error("콘서트 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert:
 *   get:
 *     summary: 콘서트 목록 조회 (페이지네이션, 필터링, 정렬 지원)
 *     description: 모든 콘서트 목록을 페이지네이션과 필터링을 통해 조회합니다.
 *     tags: [Concerts - Basic]
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
 *       500:
 *         description: 서버 에러
 */
export const getAllConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const result = await ConcertService.getAllConcerts(req.query);

    if (result.success) {
      res.status(result.statusCode!).json({
        message: "콘서트 목록 조회 성공",
        ...result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    console.error("콘서트 목록 조회 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 목록 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert/{id}:
 *   put:
 *     summary: 콘서트 정보 수정
 *     description: ObjectId 또는 UID로 특정 콘서트의 정보를 수정합니다.
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
 *         description: 콘서트 수정 성공
 *       401:
 *         description: 인증이 필요합니다 (로그인 필요)
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
    // 세션에서 사용자 정보 확인
    if (!req.session?.user) {
      return res.status(401).json({
        message: "로그인이 필요합니다",
        error: "AUTHENTICATION_REQUIRED",
      });
    }

    const { id } = req.params;
    const result = await ConcertService.updateConcert(id, req.body);

    if (result.success) {
      console.log(
        `콘서트 정보 수정 완료: ${id} - 수정 사용자: ${req.session.user.username}`
      );

      res.status(result.statusCode!).json({
        message: "콘서트 정보 수정 성공",
        concert: result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    console.error("콘서트 수정 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 수정 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert/{id}:
 *   delete:
 *     summary: 콘서트 삭제
 *     description: ObjectId 또는 UID로 특정 콘서트를 삭제합니다.
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
 *         description: 콘서트 삭제 성공
 *       401:
 *         description: 인증이 필요합니다 (로그인 필요)
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
    // 세션에서 사용자 정보 확인
    if (!req.session?.user) {
      return res.status(401).json({
        message: "로그인이 필요합니다",
        error: "AUTHENTICATION_REQUIRED",
      });
    }

    const { id } = req.params;
    const result = await ConcertService.deleteConcert(id);

    if (result.success) {
      console.log(
        `콘서트 삭제 완료: ${id} - 삭제 사용자: ${req.session.user.username}`
      );

      res.status(result.statusCode!).json({
        message: "콘서트 삭제 성공",
        deletedConcert: result.data,
      });
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
      });
    }
  } catch (error) {
    console.error("콘서트 삭제 컨트롤러 에러:", error);
    res.status(500).json({
      message: "콘서트 삭제 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};
