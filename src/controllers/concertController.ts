import express from "express";
import { ObjectId } from "mongodb";
import { getConcertModel, IConcert } from "../models/concert";

/**
 * @swagger
 * /concert/{id}/like/status:
 *   get:
 *     summary: 콘서트 좋아요 상태 확인
 *     description: 로그인된 사용자의 특정 콘서트에 대한 좋아요 상태를 확인합니다.
 *     tags: [Concerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *     responses:
 *       200:
 *         description: 좋아요 상태 조회 성공
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const getLikeStatus = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const Concert = getConcertModel();

    const concert = await Concert.findById(id);
    if (!concert) {
      res.status(404).json({ message: "콘서트를 찾을 수 없습니다." });
      return;
    }

    const isLiked = concert.likes?.some((like: any) => 
      like.userId?.toString() === userId.toString()
    ) || false;

    res.status(200).json({
      message: "좋아요 상태 조회 성공",
      isLiked,
      likesCount: concert.likesCount || 0,
      concert: {
        id: concert._id,
        uid: concert.uid,
        title: concert.title,
      },
    });
  } catch (error) {
    console.error("좋아요 상태 조회 에러:", error);
    res.status(500).json({ 
      message: "좋아요 상태 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러"
    });
  }
};

/**
 * @swagger
 * /concert:
 *   post:
 *     summary: 콘서트 정보 업로드
 *     description: 콘서트 정보를 MongoDB에 저장합니다. UID에서 timestamp를 추출하여 ObjectId로 변환합니다.
 *     tags: [Concerts]
 *     security:
 *       - bearerAuth: []
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
 *       500:
 *         description: 서버 에러
 */
export const uploadConcert = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const {
      uid,
      title,
      artist = [], // 빈 배열 기본값
      location,
      datetime,
      price,
      description,
      category,
      ticketLink,
      ticketOpenDate,
      posterImage,
      info, // galleryImages에서 info로 변경
      tags,
    } = req.body;

    // 필수 필드 검증
    if (!uid || !title || !location || !datetime) {
      res.status(400).json({
        message: "필수 필드가 누락되었습니다. (uid, title, location, datetime)",
      });
      return;
    }

    // 배열 필드 검증 - artist는 빈 배열 허용
    if (!Array.isArray(artist)) {
      res.status(400).json({
        message: "artist는 배열이어야 합니다.",
      });
      return;
    }

    if (!Array.isArray(location) || location.length === 0) {
      res.status(400).json({
        message: "location은 비어있지 않은 배열이어야 합니다.",
      });
      return;
    }

    if (!Array.isArray(datetime) || datetime.length === 0) {
      res.status(400).json({
        message: "datetime은 비어있지 않은 배열이어야 합니다.",
      });
      return;
    }

    // location 필드 유효성 검증 - 간소화된 구조
    for (const loc of location) {
      if (!loc.location) {
        res.status(400).json({
          message: "각 location은 location 필드를 포함해야 합니다.",
        });
        return;
      }
    }

    // datetime 형식 검증
    for (const dt of datetime) {
      if (!Date.parse(dt)) {
        res.status(400).json({
          message: "datetime 배열의 모든 항목은 유효한 날짜 형식이어야 합니다.",
        });
        return;
      }
    }

    // ticketOpenDate 검증
    if (ticketOpenDate && !Date.parse(ticketOpenDate)) {
      res.status(400).json({
        message: "ticketOpenDate는 유효한 날짜 형식이어야 합니다.",
      });
      return;
    }

    const Concert = getConcertModel();

    // uid 중복 확인
    const existingConcert = await Concert.findByUid(uid);
    if (existingConcert) {
      res.status(400).json({ message: "이미 존재하는 콘서트 UID입니다." });
      return;
    }

    // 이미지 URL 유효성 검증 (선택사항)
    if (posterImage && !isValidImageUrl(posterImage)) {
      res.status(400).json({ message: "올바르지 않은 포스터 이미지 URL입니다." });
      return;
    }

    // info 배열 검증
    if (info && Array.isArray(info)) {
      for (const infoItem of info) {
        if (typeof infoItem !== 'string' || infoItem.trim().length === 0) {
          res.status(400).json({ message: "info 배열의 모든 항목은 비어있지 않은 문자열이어야 합니다." });
          return;
        }
      }
    }

    // uid에서 timestamp 추출하여 ObjectId 생성
    let mongoId: ObjectId;
    try {
      const timestampMatch = uid.match(/(\d{13})/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[1]);
        const timestampInSeconds = Math.floor(timestamp / 1000);
        mongoId = new ObjectId(timestampInSeconds);
      } else {
        mongoId = new ObjectId();
        console.warn(`UID에서 timestamp를 찾을 수 없음: ${uid}, 새로운 ObjectId 생성: ${mongoId}`);
      }
    } catch (error) {
      mongoId = new ObjectId();
      console.warn(`UID를 ObjectId로 변환 실패: ${uid}, 새로운 ObjectId 생성: ${mongoId}`);
    }

    // MongoDB ObjectId 중복 확인
    const existingById = await Concert.findById(mongoId.toString());
    if (existingById) {
      mongoId = new ObjectId();
      console.warn(`ObjectId 충돌 발생, 새로운 ObjectId 생성: ${mongoId}`);
    }

    // 콘서트 정보 생성 데이터 준비
    const concertData = {
      _id: mongoId,
      uid: uid,
      title,
      artist: Array.isArray(artist) ? artist : [artist],
      location: Array.isArray(location) ? location : [location],
      datetime: Array.isArray(datetime) ? datetime : [datetime],
      price: Array.isArray(price) ? price : (price ? [price] : []),
      description,
      category: Array.isArray(category) ? category : (category ? [category] : []),
      ticketLink: Array.isArray(ticketLink) ? ticketLink : (ticketLink ? [ticketLink] : []),
      ticketOpenDate: ticketOpenDate ? new Date(ticketOpenDate) : undefined,
      posterImage: posterImage || "",
      info: info || [], // galleryImages에서 info로 변경
      tags: tags || [],
      status: "upcoming" as const,
      likes: [],
      likesCount: 0,
    };

    // MongoDB에 저장
    const newConcert = await Concert.create(concertData);

    console.log(`콘서트 정보 저장 완료: ${title} (UID: ${uid}, ObjectId: ${mongoId})`);

    res.status(201).json({
      message: "콘서트 정보 업로드 성공",
      concert: {
        id: mongoId,
        uid: uid,
        title,
        artist,
        location,
        datetime,
        price,
        category,
        ticketLink,
        ticketOpenDate,
        posterImage,
        info, // galleryImages에서 info로 변경
        tags,
        likesCount: 0,
        createdAt: newConcert.createdAt,
        updatedAt: newConcert.updatedAt,
      },
      imageInfo: {
        posterImageProvided: !!posterImage,
        infoItemsCount: info ? info.length : 0,
      },
    });
  } catch (error) {
    console.error("콘서트 업로드 에러:", error);
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
 *     tags: [Concerts]
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
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const Concert = getConcertModel();

    const concert = await Concert.findById(id);

    if (!concert) {
      res.status(404).json({ message: "콘서트를 찾을 수 없습니다." });
      return;
    }

    // 로그인한 사용자의 경우 좋아요 여부 확인
    let isLiked = false;
    if (userId) {
      try {
        if (concert.likes && Array.isArray(concert.likes)) {
          isLiked = concert.likes.some((like: any) => {
            if (!like || !like.userId) return false;
            try {
              const likeUserId = like.userId.toString();
              const currentUserId = userId.toString();
              return likeUserId === currentUserId;
            } catch (error) {
              console.warn("좋아요 상태 비교 중 에러:", error);
              return false;
            }
          });
        }
      } catch (error) {
        console.warn("좋아요 상태 확인 전체 에러:", error);
        isLiked = false;
      }
    }

    res.status(200).json({
      message: "콘서트 정보 조회 성공",
      concert: {
        ...concert,
        isLiked: userId ? isLiked : undefined,
      },
    });
  } catch (error) {
    console.error("콘서트 조회 에러:", error);
    res.status(500).json({ message: "콘서트 조회 실패" });
  }
};

/**
 * @swagger
 * /concert:
 *   get:
 *     summary: 콘서트 목록 조회 (페이지네이션, 필터링, 정렬 지원)
 *     description: 모든 콘서트 목록을 페이지네이션과 필터링을 통해 조회합니다.
 *     tags: [Concerts]
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
    const { 
      page = 1, 
      limit = 20, 
      category, 
      artist, 
      location, // city에서 location으로 변경
      status,
      sortBy = 'date'
    } = req.query;
    const Concert = getConcertModel();

    // 필터 조건 구성
    const filter: any = {};
    if (category) filter.category = { $in: [category] };
    if (artist) filter.artist = { $in: [new RegExp(artist as string, "i")] };
    if (location) filter["location.location"] = new RegExp(location as string, "i"); // city에서 location으로 변경
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

    const { concerts, total } = await Concert.findMany(filter, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort
    });

    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.status(200).json({
      message: "콘서트 목록 조회 성공",
      concerts,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages,
        totalConcerts: total,
        limit: parseInt(limit as string),
      },
      filters: { category, artist, location, status, sortBy }, // city에서 location으로 변경
    });
  } catch (error) {
    console.error("콘서트 목록 조회 에러:", error);
    res.status(500).json({ message: "콘서트 목록 조회 실패" });
  }
};

/**
 * @swagger
 * /concert/{id}:
 *   put:
 *     summary: 콘서트 정보 수정
 *     description: ObjectId 또는 UID로 특정 콘서트의 정보를 수정합니다.
 *     tags: [Concerts]
 *     security:
 *       - bearerAuth: []
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
 *         description: 인증 필요
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
    const updateData = req.body;
    const Concert = getConcertModel();

    // 기존 콘서트 조회
    const existingConcert = await Concert.findById(id);
    if (!existingConcert) {
      res.status(404).json({ message: "콘서트를 찾을 수 없습니다." });
      return;
    }

    // 수정 불가능한 필드 제거
    delete updateData.uid;
    delete updateData.likes;
    delete updateData.likesCount;
    delete updateData._id;
    delete updateData.createdAt;

    const concert = await Concert.updateById(id, updateData);

    if (!concert) {
      res.status(404).json({ message: "콘서트를 찾을 수 없습니다." });
      return;
    }

    res.status(200).json({
      message: "콘서트 정보 수정 성공",
      concert,
    });
  } catch (error) {
    console.error("콘서트 수정 에러:", error);
    res.status(500).json({ 
      message: "콘서트 수정 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러"
    });
  }
};

/**
 * @swagger
 * /concert/{id}:
 *   delete:
 *     summary: 콘서트 삭제
 *     description: ObjectId 또는 UID로 특정 콘서트를 삭제합니다.
 *     tags: [Concerts]
 *     security:
 *       - bearerAuth: []
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
 *         description: 인증 필요
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
    const Concert = getConcertModel();

    // 기존 콘서트 조회
    const existingConcert = await Concert.findById(id);
    if (!existingConcert) {
      res.status(404).json({ message: "콘서트를 찾을 수 없습니다." });
      return;
    }

    const concert = await Concert.deleteById(id);

    if (!concert) {
      res.status(404).json({ message: "콘서트를 찾을 수 없습니다." });
      return;
    }

    res.status(200).json({
      message: "콘서트 삭제 성공",
      deletedConcert: {
        id: concert._id,
        uid: concert.uid,
        title: concert.title,
      },
    });
  } catch (error) {
    console.error("콘서트 삭제 에러:", error);
    res.status(500).json({ 
      message: "콘서트 삭제 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러"
    });
  }
};

/**
 * @swagger
 * /concert/{id}/like:
 *   post:
 *     summary: 콘서트 좋아요 추가
 *     description: 로그인된 사용자가 특정 콘서트에 좋아요를 추가합니다.
 *     tags: [Concerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *     responses:
 *       200:
 *         description: 좋아요 추가 성공
 *       400:
 *         description: 이미 좋아요한 콘서트
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const addLike = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const Concert = getConcertModel();

    if (!userId) {
      res.status(401).json({ message: "로그인이 필요합니다." });
      return;
    }

    const concert = await Concert.findById(id);
    if (!concert) {
      res.status(404).json({ message: "콘서트를 찾을 수 없습니다." });
      return;
    }

    // 이미 좋아요한지 확인
    let isAlreadyLiked = false;
    try {
      if (concert.likes && Array.isArray(concert.likes)) {
        isAlreadyLiked = concert.likes.some((like: any) => {
          if (!like || !like.userId) return false;
          try {
            const likeUserId = like.userId.toString();
            const currentUserId = userId.toString();
            return likeUserId === currentUserId;
          } catch (error) {
            console.warn("좋아요 중복 검사 비교 중 에러:", error);
            return false;
          }
        });
      }
    } catch (error) {
      console.warn("좋아요 중복 검사 전체 에러:", error);
      isAlreadyLiked = false;
    }

    if (isAlreadyLiked) {
      res.status(400).json({ message: "이미 좋아요한 콘서트입니다." });
      return;
    }

    const updatedConcert = await Concert.addLike(id, userId);

    res.status(200).json({
      message: "좋아요 추가 성공",
      concert: {
        id: updatedConcert._id,
        uid: updatedConcert.uid,
        title: updatedConcert.title,
        likesCount: updatedConcert.likesCount,
        isLiked: true,
      },
    });
  } catch (error) {
    console.error("좋아요 추가 에러:", error);
    res.status(500).json({ 
      message: "좋아요 추가 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러"
    });
  }
};

/**
 * @swagger
 * /concert/{id}/like:
 *   delete:
 *     summary: 콘서트 좋아요 삭제
 *     description: 로그인된 사용자가 특정 콘서트의 좋아요를 삭제합니다.
 *     tags: [Concerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘서트 ObjectId 또는 UID
 *     responses:
 *       200:
 *         description: 좋아요 삭제 성공
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 콘서트를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const removeLike = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const Concert = getConcertModel();

    if (!userId) {
      res.status(401).json({ message: "로그인이 필요합니다." });
      return;
    }

    const concert = await Concert.findById(id);
    if (!concert) {
      res.status(404).json({ message: "콘서트를 찾을 수 없습니다." });
      return;
    }

    const updatedConcert = await Concert.removeLike(id, userId);

    res.status(200).json({
      message: "좋아요 삭제 성공",
      concert: {
        id: updatedConcert._id,
        uid: updatedConcert.uid,
        title: updatedConcert.title,
        likesCount: updatedConcert.likesCount,
        isLiked: false,
      },
    });
  } catch (error) {
    console.error("좋아요 삭제 에러:", error);
    res.status(500).json({ 
      message: "좋아요 삭제 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러"
    });
  }
};

/**
 * @swagger
 * /concert/liked:
 *   get:
 *     summary: 사용자가 좋아요한 콘서트 목록 조회
 *     description: 로그인된 사용자가 좋아요한 콘서트 목록을 조회합니다.
 *     tags: [Concerts]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 에러
 */
export const getLikedConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const Concert = getConcertModel();

    if (!userId) {
      res.status(401).json({ message: "로그인이 필요합니다." });
      return;
    }

    const { concerts, total } = await Concert.findLikedByUser(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.status(200).json({
      message: "좋아요한 콘서트 목록 조회 성공",
      concerts: concerts.map((concert: any) => ({
        ...concert,
        isLiked: true,
      })),
      pagination: {
        currentPage: parseInt(page as string),
        totalPages,
        totalConcerts: total,
        limit: parseInt(limit as string),
      },
    });
  } catch (error) {
    console.error("좋아요한 콘서트 목록 조회 에러:", error);
    res.status(500).json({ 
      message: "좋아요한 콘서트 목록 조회 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러"
    });
  }
};

/**
 * @swagger
 * /concert/popular:
 *   get:
 *     summary: 인기 콘서트 목록 조회 (좋아요 기준)
 *     description: 좋아요 수를 기준으로 인기 콘서트 목록을 조회합니다.
 *     tags: [Concerts]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: 콘서트 상태 필터
 *       - in: query
 *         name: minLikes
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 1
 *         description: 최소 좋아요 수
 *     responses:
 *       200:
 *         description: 인기 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
export const getPopularConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      minLikes = 1
    } = req.query;
    const Concert = getConcertModel();

    const filter: any = {
      likesCount: { $gte: parseInt(minLikes as string) }
    };
    if (status) filter.status = status;

    const { concerts, total } = await Concert.findMany(filter, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { likesCount: -1, datetime: 1 }
    });

    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.status(200).json({
      message: "인기 콘서트 목록 조회 성공",
      concerts,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages,
        totalConcerts: total,
        limit: parseInt(limit as string),
      },
      filters: { status, minLikes },
    });
  } catch (error) {
    console.error("인기 콘서트 목록 조회 에러:", error);
    res.status(500).json({ message: "인기 콘서트 목록 조회 실패" });
  }
};

/**
 * @swagger
 * /concert/search:
 *   get:
 *     summary: 콘서트 텍스트 검색
 *     description: 제목, 아티스트, 장소, 설명을 기준으로 콘서트를 검색합니다.
 *     tags: [Concerts]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어
 *         example: 아이유
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
 *         description: 콘서트 검색 성공
 *       400:
 *         description: 검색어가 필요함
 *       500:
 *         description: 서버 에러
 */
export const searchConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { q: query, page = 1, limit = 20 } = req.query;
    const Concert = getConcertModel();

    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: "검색어가 필요합니다." });
      return;
    }

    const concerts = await Concert.searchConcerts(query);
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const paginatedConcerts = concerts.slice(skip, skip + limitNum);
    const total = concerts.length;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      message: "콘서트 검색 성공",
      concerts: paginatedConcerts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalConcerts: total,
        limit: limitNum,
      },
      searchQuery: query,
    });
  } catch (error) {
    console.error("콘서트 검색 에러:", error);
    res.status(500).json({ message: "콘서트 검색 실패" });
  }
};

/**
 * @swagger
 * /concert/upcoming:
 *   get:
 *     summary: 다가오는 콘서트 목록 조회
 *     description: 현재 날짜 이후의 예정된 콘서트 목록을 조회합니다.
 *     tags: [Concerts]
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
 *         description: 다가오는 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
export const getUpcomingConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const Concert = getConcertModel();

    const allUpcomingConcerts = await Concert.findUpcoming();
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const concerts = allUpcomingConcerts.slice(skip, skip + limitNum);
    const total = allUpcomingConcerts.length;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      message: "다가오는 콘서트 목록 조회 성공",
      concerts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalConcerts: total,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("다가오는 콘서트 조회 에러:", error);
    res.status(500).json({ message: "다가오는 콘서트 조회 실패" });
  }
};

/**
 * @swagger
 * /concert/ticket-open:
 *   get:
 *     summary: 티켓 오픈 예정 콘서트 목록 조회
 *     description: 티켓 오픈이 예정된 콘서트 목록을 조회합니다.
 *     tags: [Concerts]
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
 *         description: 티켓 오픈 예정 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
export const getTicketOpenConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const Concert = getConcertModel();

    const allTicketOpenConcerts = await Concert.findUpcomingTicketOpen();
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const concerts = allTicketOpenConcerts.slice(skip, skip + limitNum);
    const total = allTicketOpenConcerts.length;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      message: "티켓 오픈 예정 콘서트 목록 조회 성공",
      concerts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalConcerts: total,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("티켓 오픈 예정 콘서트 조회 에러:", error);
    res.status(500).json({ message: "티켓 오픈 예정 콘서트 조회 실패" });
  }
};

/**
 * @swagger
 * /concert/by-artist/{artist}:
 *   get:
 *     summary: 아티스트별 콘서트 목록 조회
 *     description: 특정 아티스트의 콘서트 목록을 조회합니다.
 *     tags: [Concerts]
 *     parameters:
 *       - in: path
 *         name: artist
 *         required: true
 *         schema:
 *           type: string
 *         description: 아티스트명
 *         example: 아이유
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
 *         description: 아티스트별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
export const getConcertsByArtist = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { artist } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const Concert = getConcertModel();

    const allArtistConcerts = await Concert.findByArtist(artist);
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const concerts = allArtistConcerts.slice(skip, skip + limitNum);
    const total = allArtistConcerts.length;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      message: `${artist} 콘서트 목록 조회 성공`,
      concerts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalConcerts: total,
        limit: limitNum,
      },
      artist,
    });
  } catch (error) {
    console.error("아티스트별 콘서트 조회 에러:", error);
    res.status(500).json({ message: "아티스트별 콘서트 조회 실패" });
  }
};

/**
 * @swagger
 * /concert/by-location/{location}:
 *   get:
 *     summary: 지역별 콘서트 목록 조회
 *     description: 특정 지역의 콘서트 목록을 조회합니다.
 *     tags: [Concerts]
 *     parameters:
 *       - in: path
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: 지역명
 *         example: 서울
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
 *         description: 지역별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
export const getConcertsByLocation = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { location } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const Concert = getConcertModel();

    const allLocationConcerts = await Concert.findByLocation(location);
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const concerts = allLocationConcerts.slice(skip, skip + limitNum);
    const total = allLocationConcerts.length;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      message: `${location} 콘서트 목록 조회 성공`,
      concerts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalConcerts: total,
        limit: limitNum,
      },
      location,
    });
  } catch (error) {
    console.error("지역별 콘서트 조회 에러:", error);
    res.status(500).json({ message: "지역별 콘서트 조회 실패" });
  }
};

/**
 * @swagger
 * /concert/by-category/{category}:
 *   get:
 *     summary: 카테고리별 콘서트 목록 조회
 *     description: 특정 카테고리의 콘서트 목록을 조회합니다.
 *     tags: [Concerts]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pop, rock, jazz, classical, hiphop, electronic, indie, folk, r&b, country, musical, opera, other]
 *         description: 음악 카테고리
 *         example: pop
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
 *         description: 카테고리별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
export const getConcertsByCategory = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const Concert = getConcertModel();

    const allCategoryConcerts = await Concert.findByCategory(category);
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const concerts = allCategoryConcerts.slice(skip, skip + limitNum);
    const total = allCategoryConcerts.length;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      message: `${category} 카테고리 콘서트 목록 조회 성공`,
      concerts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalConcerts: total,
        limit: limitNum,
      },
      category,
    });
  } catch (error) {
    console.error("카테고리별 콘서트 조회 에러:", error);
    res.status(500).json({ message: "카테고리별 콘서트 조회 실패" });
  }
};

/**
 * @swagger
 * /concert/by-status/{status}:
 *   get:
 *     summary: 상태별 콘서트 목록 조회
 *     description: 특정 상태의 콘서트 목록을 조회합니다.
 *     tags: [Concerts]
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: 콘서트 상태
 *         example: upcoming
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
 *         description: 상태별 콘서트 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
export const getConcertsByStatus = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const Concert = getConcertModel();

    const validStatuses = ["upcoming", "ongoing", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "유효하지 않은 상태입니다." });
      return;
    }

    const allStatusConcerts = await Concert.findByStatus(status as any);
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const concerts = allStatusConcerts.slice(skip, skip + limitNum);
    const total = allStatusConcerts.length;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      message: `${status} 상태 콘서트 목록 조회 성공`,
      concerts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalConcerts: total,
        limit: limitNum,
      },
      status,
    });
  } catch (error) {
    console.error("상태별 콘서트 조회 에러:", error);
    res.status(500).json({ message: "상태별 콘서트 조회 실패" });
  }
};

/**
 * @swagger
 * /concert/stats:
 *   get:
 *     summary: 콘서트 통계 정보 조회
 *     description: 전체 콘서트의 통계 정보를 조회합니다.
 *     tags: [Concerts]
 *     responses:
 *       200:
 *         description: 콘서트 통계 조회 성공
 *       500:
 *         description: 서버 에러
 */
export const getConcertStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const Concert = getConcertModel();
    const stats = await Concert.getStats();

    res.status(200).json({
      message: "콘서트 통계 조회 성공",
      stats,
    });
  } catch (error) {
    console.error("콘서트 통계 조회 에러:", error);
    res.status(500).json({ message: "콘서트 통계 조회 실패" });
  }
};

// 이미지 URL 유효성 검증 함수
const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;

  const s3UrlPattern =
    /^https:\/\/[\w.-]+\.s3\.[\w.-]+\.amazonaws\.com\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
  const generalUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

  return s3UrlPattern.test(url) || generalUrlPattern.test(url);
};