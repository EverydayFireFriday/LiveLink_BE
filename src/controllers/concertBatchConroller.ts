import express from "express";
import { ObjectId } from "mongodb";
import { getConcertModel } from "../models/concert";

// 유틸리티 함수들
/**
 * 콘서트 데이터 유효성 검증 함수
 */
const validateConcertData = (concertData: any): string | null => {
  // 필수 필드 검증
  if (!concertData.uid || !concertData.title || !concertData.location || !concertData.datetime) {
    return "필수 필드가 누락되었습니다. (uid, title, location, datetime)";
  }

  // 배열 필드 검증
  if (concertData.artist && !Array.isArray(concertData.artist)) {
    return "artist는 배열이어야 합니다.";
  }

  if (!Array.isArray(concertData.location) || concertData.location.length === 0) {
    return "location은 비어있지 않은 배열이어야 합니다.";
  }

  if (!Array.isArray(concertData.datetime) || concertData.datetime.length === 0) {
    return "datetime은 비어있지 않은 배열이어야 합니다.";
  }

  // location 필드 유효성 검증
  for (const loc of concertData.location) {
    if (!loc.location) {
      return "각 location은 location 필드를 포함해야 합니다.";
    }
  }

  // datetime 형식 검증
  for (const dt of concertData.datetime) {
    if (!Date.parse(dt)) {
      return "datetime 배열의 모든 항목은 유효한 날짜 형식이어야 합니다.";
    }
  }

  // ticketOpenDate 검증
  if (concertData.ticketOpenDate && !Date.parse(concertData.ticketOpenDate)) {
    return "ticketOpenDate는 유효한 날짜 형식이어야 합니다.";
  }

  // info 배열 검증
  if (concertData.info && Array.isArray(concertData.info)) {
    for (const infoItem of concertData.info) {
      if (typeof infoItem !== 'string' || infoItem.trim().length === 0) {
        return "info 배열의 모든 항목은 비어있지 않은 문자열이어야 합니다.";
      }
    }
  }

  return null; // 유효성 검증 통과
};

/**
 * UID에서 ObjectId 생성 함수
 */
const generateObjectIdFromUid = (uid: string): ObjectId => {
  try {
    const timestampMatch = uid.match(/(\d{13})/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]);
      const timestampInSeconds = Math.floor(timestamp / 1000);
      return new ObjectId(timestampInSeconds);
    } else {
      return new ObjectId();
    }
  } catch (error) {
    return new ObjectId();
  }
};

/**
 * @swagger
 * /concert/batch:
 *   post:
 *     summary: 여러 콘서트 일괄 등록
 *     description: 여러 콘서트 정보를 한 번에 MongoDB에 저장합니다.
 *     tags: [Concerts - Batch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - concerts
 *             properties:
 *               concerts:
 *                 type: array
 *                 description: 등록할 콘서트들의 배열
 *                 items:
 *                   type: object
 *                   required:
 *                     - uid
 *                     - title
 *                     - location
 *                     - datetime
 *                   properties:
 *                     uid:
 *                       type: string
 *                       description: 사용자 지정 ID (timestamp 포함)
 *                     title:
 *                       type: string
 *                       description: 콘서트 제목
 *                     artist:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 아티스트명 배열
 *                     location:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           location:
 *                             type: string
 *                       description: 공연 장소 정보 배열
 *                     datetime:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: date-time
 *                       description: 공연 날짜 및 시간 배열
 *               skipDuplicates:
 *                 type: boolean
 *                 description: "중복 UID 무시 여부"
 *                 default: false
 *     responses:
 *       201:
 *         description: 콘서트 일괄 등록 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 에러
 */
export const batchUploadConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { concerts, skipDuplicates = false } = req.body;

    if (!Array.isArray(concerts) || concerts.length === 0) {
      res.status(400).json({
        message: "concerts 배열이 비어있거나 올바르지 않습니다.",
      });
      return;
    }

    const Concert = getConcertModel();
    const results = {
      success: [] as any[],
      failed: [] as any[],
      duplicates: [] as any[],
    };

    for (let i = 0; i < concerts.length; i++) {
      const concertData = concerts[i];
      
      try {
        // 각 콘서트 데이터 유효성 검증
        const validationError = validateConcertData(concertData);
        if (validationError) {
          results.failed.push({
            index: i,
            uid: concertData.uid,
            error: validationError,
          });
          continue;
        }

        // UID 중복 확인
        const existingConcert = await Concert.findByUid(concertData.uid);
        if (existingConcert) {
          if (skipDuplicates) {
            results.duplicates.push({
              index: i,
              uid: concertData.uid,
              title: concertData.title,
            });
            continue;
          } else {
            results.failed.push({
              index: i,
              uid: concertData.uid,
              error: "이미 존재하는 콘서트 UID입니다.",
            });
            continue;
          }
        }

        // ObjectId 생성
        const mongoId = generateObjectIdFromUid(concertData.uid);

        // 콘서트 데이터 준비
        const processedData = {
          _id: mongoId,
          uid: concertData.uid,
          title: concertData.title,
          artist: Array.isArray(concertData.artist) ? concertData.artist : (concertData.artist ? [concertData.artist] : []),
          location: Array.isArray(concertData.location) ? concertData.location : [concertData.location],
          datetime: Array.isArray(concertData.datetime) ? concertData.datetime : [concertData.datetime],
          price: Array.isArray(concertData.price) ? concertData.price : (concertData.price ? [concertData.price] : []),
          description: concertData.description || "",
          category: Array.isArray(concertData.category) ? concertData.category : (concertData.category ? [concertData.category] : []),
          ticketLink: Array.isArray(concertData.ticketLink) ? concertData.ticketLink : (concertData.ticketLink ? [concertData.ticketLink] : []),
          ticketOpenDate: concertData.ticketOpenDate ? new Date(concertData.ticketOpenDate) : undefined,
          posterImage: concertData.posterImage || "",
          info: concertData.info || [],
          tags: concertData.tags || [],
          status: "upcoming" as const,
          likes: [],
          likesCount: 0,
        };

        // MongoDB에 저장
        const newConcert = await Concert.create(processedData);

        results.success.push({
          index: i,
          id: mongoId,
          uid: concertData.uid,
          title: concertData.title,
          createdAt: newConcert.createdAt,
        });

      } catch (error) {
        results.failed.push({
          index: i,
          uid: concertData.uid,
          error: error instanceof Error ? error.message : "알 수 없는 에러",
        });
      }
    }

    console.log(`배치 콘서트 등록 완료: 성공 ${results.success.length}, 실패 ${results.failed.length}, 중복 ${results.duplicates.length}`);

    res.status(201).json({
      message: "콘서트 일괄 등록 처리 완료",
      summary: {
        total: concerts.length,
        success: results.success.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length,
      },
      results,
    });

  } catch (error) {
    console.error("콘서트 일괄 등록 에러:", error);
    res.status(500).json({
      message: "서버 에러로 콘서트 일괄 등록 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert/batch:
 *   put:
 *     summary: 여러 콘서트 일괄 수정
 *     description: 여러 콘서트의 정보를 한 번에 수정합니다.
 *     tags: [Concerts - Batch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 description: 수정할 콘서트들의 배열
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - data
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 콘서트 ObjectId 또는 UID
 *                     data:
 *                       type: object
 *                       description: 수정할 데이터
 *                       properties:
 *                         title:
 *                           type: string
 *                         artist:
 *                           type: array
 *                           items:
 *                             type: string
 *                         location:
 *                           type: array
 *                           items:
 *                             type: object
 *                         datetime:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: date-time
 *                         status:
 *                           type: string
 *                           enum: [upcoming, ongoing, completed, cancelled]
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *     responses:
 *       200:
 *         description: 콘서트 일괄 수정 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 에러
 */
export const batchUpdateConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { updates, continueOnError = true } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({
        message: "updates 배열이 비어있거나 올바르지 않습니다.",
      });
      return;
    }

    const Concert = getConcertModel();
    const results = {
      success: [] as any[],
      failed: [] as any[],
    };

    for (let i = 0; i < updates.length; i++) {
      const { id, data } = updates[i];
      
      try {
        if (!id || !data) {
          results.failed.push({
            index: i,
            id,
            error: "id 또는 data가 누락되었습니다.",
          });
          if (!continueOnError) break;
          continue;
        }

        // 기존 콘서트 확인
        const existingConcert = await Concert.findById(id);
        if (!existingConcert) {
          results.failed.push({
            index: i,
            id,
            error: "콘서트를 찾을 수 없습니다.",
          });
          if (!continueOnError) break;
          continue;
        }

        // 수정 불가능한 필드 제거
        const updateData = { ...data };
        delete updateData.uid;
        delete updateData.likes;
        delete updateData.likesCount;
        delete updateData._id;
        delete updateData.createdAt;

        // 콘서트 수정
        const updatedConcert = await Concert.updateById(id, updateData);

        if (updatedConcert) {
          results.success.push({
            index: i,
            id,
            title: updatedConcert.title,
            updatedAt: updatedConcert.updatedAt,
          });
        } else {
          results.failed.push({
            index: i,
            id,
            error: "수정 처리 중 오류가 발생했습니다.",
          });
          if (!continueOnError) break;
        }

      } catch (error) {
        results.failed.push({
          index: i,
          id,
          error: error instanceof Error ? error.message : "알 수 없는 에러",
        });
        if (!continueOnError) break;
      }
    }

    console.log(`배치 콘서트 수정 완료: 성공 ${results.success.length}, 실패 ${results.failed.length}`);

    res.status(200).json({
      message: "콘서트 일괄 수정 처리 완료",
      summary: {
        total: updates.length,
        success: results.success.length,
        failed: results.failed.length,
      },
      results,
    });

  } catch (error) {
    console.error("콘서트 일괄 수정 에러:", error);
    res.status(500).json({
      message: "서버 에러로 콘서트 일괄 수정 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert/batch:
 *   delete:
 *     summary: 여러 콘서트 일괄 삭제
 *     description: 여러 콘서트를 한 번에 삭제합니다.
 *     tags: [Concerts - Batch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 description: 삭제할 콘서트 ID들의 배열
 *                 items:
 *                   type: string
 *                 example: ["concert_1703123456789_abc123", "674a1b2c3d4e5f6789abcdef"]
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *     responses:
 *       200:
 *         description: 콘서트 일괄 삭제 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 에러
 */
export const batchDeleteConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { ids, continueOnError = true } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        message: "ids 배열이 비어있거나 올바르지 않습니다.",
      });
      return;
    }

    const Concert = getConcertModel();
    const results = {
      success: [] as any[],
      failed: [] as any[],
      notFound: [] as any[],
    };

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      
      try {
        if (!id || typeof id !== 'string') {
          results.failed.push({
            index: i,
            id,
            error: "올바르지 않은 ID 형식입니다.",
          });
          if (!continueOnError) break;
          continue;
        }

        // 기존 콘서트 확인
        const existingConcert = await Concert.findById(id);
        if (!existingConcert) {
          results.notFound.push({
            index: i,
            id,
            error: "콘서트를 찾을 수 없습니다.",
          });
          if (!continueOnError) break;
          continue;
        }

        // 콘서트 삭제
        const deletedConcert = await Concert.deleteById(id);

        if (deletedConcert) {
          results.success.push({
            index: i,
            id,
            uid: deletedConcert.uid,
            title: deletedConcert.title,
          });
        } else {
          results.failed.push({
            index: i,
            id,
            error: "삭제 처리 중 오류가 발생했습니다.",
          });
          if (!continueOnError) break;
        }

      } catch (error) {
        results.failed.push({
          index: i,
          id,
          error: error instanceof Error ? error.message : "알 수 없는 에러",
        });
        if (!continueOnError) break;
      }
    }

    console.log(`배치 콘서트 삭제 완료: 성공 ${results.success.length}, 실패 ${results.failed.length}, 미발견 ${results.notFound.length}`);

    res.status(200).json({
      message: "콘서트 일괄 삭제 처리 완료",
      summary: {
        total: ids.length,
        success: results.success.length,
        failed: results.failed.length,
        notFound: results.notFound.length,
      },
      results,
    });

  } catch (error) {
    console.error("콘서트 일괄 삭제 에러:", error);
    res.status(500).json({
      message: "서버 에러로 콘서트 일괄 삭제 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};

/**
 * @swagger
 * /concert/batch/like:
 *   post:
 *     summary: 여러 콘서트 일괄 좋아요 추가/삭제
 *     description: 여러 콘서트에 대해 좋아요를 일괄로 추가하거나 삭제합니다.
 *     tags: [Concerts - Batch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actions
 *             properties:
 *               actions:
 *                 type: array
 *                 description: 좋아요 액션들의 배열
 *                 items:
 *                   type: object
 *                   required:
 *                     - concertId
 *                     - action
 *                   properties:
 *                     concertId:
 *                       type: string
 *                       description: 콘서트 ObjectId 또는 UID
 *                     action:
 *                       type: string
 *                       enum: [add, remove]
 *                       description: 수행할 액션 (add=좋아요 추가, remove=좋아요 삭제)
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *     responses:
 *       200:
 *         description: 좋아요 일괄 처리 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 에러
 */
export const batchLikeConcerts = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { actions, continueOnError = true } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ message: "로그인이 필요합니다." });
      return;
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      res.status(400).json({
        message: "actions 배열이 비어있거나 올바르지 않습니다.",
      });
      return;
    }

    const Concert = getConcertModel();
    const results = {
      success: [] as any[],
      failed: [] as any[],
    };

    for (let i = 0; i < actions.length; i++) {
      const { concertId, action } = actions[i];
      
      try {
        if (!concertId || !action || !['add', 'remove'].includes(action)) {
          results.failed.push({
            index: i,
            concertId,
            action,
            error: "concertId 또는 action이 유효하지 않습니다.",
          });
          if (!continueOnError) break;
          continue;
        }

        // 콘서트 존재 확인
        const concert = await Concert.findById(concertId);
        if (!concert) {
          results.failed.push({
            index: i,
            concertId,
            action,
            error: "콘서트를 찾을 수 없습니다.",
          });
          if (!continueOnError) break;
          continue;
        }

        let updatedConcert;
        if (action === 'add') {
          // 이미 좋아요했는지 확인
          const isAlreadyLiked = concert.likes?.some((like: any) => 
            like.userId?.toString() === userId.toString()
          );
          
          if (isAlreadyLiked) {
            results.failed.push({
              index: i,
              concertId,
              action,
              error: "이미 좋아요한 콘서트입니다.",
            });
            if (!continueOnError) break;
            continue;
          }
          
          updatedConcert = await Concert.addLike(concertId, userId);
        } else {
          updatedConcert = await Concert.removeLike(concertId, userId);
        }

        results.success.push({
          index: i,
          concertId,
          action,
          title: updatedConcert.title,
          likesCount: updatedConcert.likesCount,
        });

      } catch (error) {
        results.failed.push({
          index: i,
          concertId,
          action,
          error: error instanceof Error ? error.message : "알 수 없는 에러",
        });
        if (!continueOnError) break;
      }
    }

    console.log(`배치 좋아요 처리 완료: 성공 ${results.success.length}, 실패 ${results.failed.length}`);

    res.status(200).json({
      message: "좋아요 일괄 처리 완료",
      summary: {
        total: actions.length,
        success: results.success.length,
        failed: results.failed.length,
      },
      results,
    });

  } catch (error) {
    console.error("좋아요 일괄 처리 에러:", error);
    res.status(500).json({
      message: "서버 에러로 좋아요 일괄 처리 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};