import express from "express";
import { ObjectId } from "mongodb";
import { getConcertModel } from "../models/concert";

// 유틸리티 함수들
/**
 * 콘서트 데이터 유효성 검증 함수
 */
const validateConcertData = (concertData: any): string | null => {
  // 필수 필드 검증
  if (
    !concertData.uid ||
    !concertData.title ||
    !concertData.location ||
    !concertData.datetime
  ) {
    return "필수 필드가 누락되었습니다. (uid, title, location, datetime)";
  }

  // 배열 필드 검증
  if (concertData.artist && !Array.isArray(concertData.artist)) {
    return "artist는 배열이어야 합니다.";
  }

  if (
    !Array.isArray(concertData.location) ||
    concertData.location.length === 0
  ) {
    return "location은 비어있지 않은 배열이어야 합니다.";
  }

  if (
    !Array.isArray(concertData.datetime) ||
    concertData.datetime.length === 0
  ) {
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
      if (typeof infoItem !== "string" || infoItem.trim().length === 0) {
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
 *     summary: 여러 콘서트 일괄 등록 (성능 최적화)
 *     description: 여러 콘서트 정보를 한 번에 MongoDB에 저장합니다. 대량 처리에 최적화되어 있습니다.
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
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 100
 *                 minimum: 1
 *                 maximum: 1000
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
    const { concerts, skipDuplicates = false, batchSize = 100 } = req.body;

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

    console.log(`⚡ 배치 콘서트 등록 시작: ${concerts.length}개 콘서트, 배치 크기: ${batchSize}`);
    const startTime = Date.now();

    // 1. 모든 콘서트 데이터 유효성 검증 (병렬 처리)
    const validationResults = await Promise.allSettled(
      concerts.map(async (concertData, index) => {
        const validationError = validateConcertData(concertData);
        return { index, concertData, validationError };
      })
    );

    const validConcerts: any[] = [];
    const invalidConcerts: any[] = [];

    validationResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { concertData, validationError } = result.value;
        if (validationError) {
          invalidConcerts.push({
            index,
            uid: concertData.uid,
            error: validationError,
          });
        } else {
          validConcerts.push({ index, concertData });
        }
      } else {
        invalidConcerts.push({
          index,
          uid: concerts[index]?.uid || 'unknown',
          error: "데이터 검증 중 오류 발생",
        });
      }
    });

    results.failed.push(...invalidConcerts);

    if (validConcerts.length === 0) {
      res.status(400).json({
        message: "유효한 콘서트 데이터가 없습니다.",
        summary: {
          total: concerts.length,
          success: 0,
          failed: results.failed.length,
          duplicates: 0,
        },
        results,
      });
      return;
    }

    // 2. ⚡ 중복 UID 일괄 확인 (N+1 → 1 쿼리)
    const uids = validConcerts.map(vc => vc.concertData.uid);
    const existingConcerts = await Concert.findByUids(uids);
    const existingUidSet = new Set(existingConcerts.map(c => c.uid));

    console.log(`🔍 중복 검사 완료: ${existingConcerts.length}개 중복 발견`);

    // 3. 중복 처리 및 데이터 준비
    const concertsToInsert: any[] = [];
    
    for (const { index, concertData } of validConcerts) {
      if (existingUidSet.has(concertData.uid)) {
        if (skipDuplicates) {
          results.duplicates.push({
            index,
            uid: concertData.uid,
            title: concertData.title,
          });
          continue;
        } else {
          results.failed.push({
            index,
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
        artist: Array.isArray(concertData.artist)
          ? concertData.artist
          : concertData.artist
            ? [concertData.artist]
            : [],
        location: Array.isArray(concertData.location)
          ? concertData.location
          : [concertData.location],
        datetime: Array.isArray(concertData.datetime)
          ? concertData.datetime
          : [concertData.datetime],
        price: Array.isArray(concertData.price)
          ? concertData.price
          : concertData.price
            ? [concertData.price]
            : [],
        description: concertData.description || "",
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
        posterImage: concertData.posterImage || "",
        info: concertData.info || [],
        tags: concertData.tags || [],
        status: "upcoming" as const,
        likes: [],
        likesCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      concertsToInsert.push({ index, processedData });
    }

    // 4. ⚡ 배치 단위로 MongoDB에 저장 (N번 create → insertMany)
    const insertPromises: Promise<any>[] = [];
    const totalBatches = Math.ceil(concertsToInsert.length / batchSize);
    
    for (let i = 0; i < concertsToInsert.length; i += batchSize) {
      const batch = concertsToInsert.slice(i, i + batchSize);
      const batchData = batch.map(item => item.processedData);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 배치 ${batchNumber}/${totalBatches} 처리 중... (${batch.length}개)`);
      
      const insertPromise = Concert.insertMany(batchData)
        .then((insertedConcerts) => {
          // 성공한 항목들 기록
          batch.forEach(({ index }, batchIndex) => {
            const insertedConcert = insertedConcerts[batchIndex];
            results.success.push({
              index,
              id: insertedConcert._id,
              uid: insertedConcert.uid,
              title: insertedConcert.title,
              createdAt: insertedConcert.createdAt,
            });
          });
          console.log(`✅ 배치 ${batchNumber} 완료: ${batch.length}개 삽입 성공`);
        })
        .catch((error) => {
          // 배치 전체 실패 시 개별 항목으로 재시도
          console.warn(`⚠️ 배치 ${batchNumber} 실패, 개별 처리로 전환: ${error.message}`);
          return Promise.allSettled(
            batch.map(async ({ index, processedData }) => {
              try {
                const newConcert = await Concert.create(processedData);
                results.success.push({
                  index,
                  id: newConcert._id,
                  uid: newConcert.uid,
                  title: newConcert.title,
                  createdAt: newConcert.createdAt,
                });
              } catch (individualError) {
                results.failed.push({
                  index,
                  uid: processedData.uid,
                  error: individualError instanceof Error ? individualError.message : "알 수 없는 에러",
                });
              }
            })
          );
        });

      insertPromises.push(insertPromise);
    }

    // 5. 모든 배치 처리 완료 대기
    await Promise.allSettled(insertPromises);

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`🎉 배치 콘서트 등록 완료: 성공 ${results.success.length}, 실패 ${results.failed.length}, 중복 ${results.duplicates.length} (처리시간: ${processingTime}초)`);

    res.status(201).json({
      message: "콘서트 일괄 등록 처리 완료",
      summary: {
        total: concerts.length,
        success: results.success.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length,
        processingTime: `${processingTime}초`,
        batchCount: totalBatches,
        avgBatchSize: Math.round(concertsToInsert.length / totalBatches),
      },
      results,
    });

  } catch (error) {
    console.error("❌ 콘서트 일괄 등록 에러:", error);
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
 *     summary: 여러 콘서트 일괄 수정 (성능 최적화)
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
 *               continueOnError:
 *                 type: boolean
 *                 description: "에러 발생 시 계속 진행 여부"
 *                 default: true
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 50
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
    const { updates, continueOnError = true, batchSize = 50 } = req.body;

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

    console.log(`⚡ 배치 콘서트 수정 시작: ${updates.length}개 콘서트`);
    const startTime = Date.now();

    // 1. ⚡ 모든 콘서트 ID 존재 확인 (일괄 조회)
    const ids = updates.map(update => update.id).filter(Boolean);
    const existingConcerts = await Concert.findByIds(ids);
    const existingIdSet = new Set(existingConcerts.map(c => c._id.toString()));

    console.log(`🔍 존재 확인 완료: ${existingConcerts.length}/${ids.length}개 발견`);

    // 2. ⚡ 배치 단위로 병렬 처리
    const updatePromises: Promise<any>[] = [];
    const totalBatches = Math.ceil(updates.length / batchSize);

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 배치 ${batchNumber}/${totalBatches} 수정 중... (${batch.length}개)`);
      
      const batchPromise = Promise.allSettled(
        batch.map(async ({ id, data }, batchIndex) => {
          const globalIndex = i + batchIndex;
          
          try {
            if (!id || !data) {
              throw new Error("id 또는 data가 누락되었습니다.");
            }

            if (!existingIdSet.has(id)) {
              throw new Error("콘서트를 찾을 수 없습니다.");
            }

            // 수정 불가능한 필드 제거
            const updateData = { ...data };
            delete updateData.uid;
            delete updateData.likes;
            delete updateData.likesCount;
            delete updateData._id;
            delete updateData.createdAt;
            updateData.updatedAt = new Date();

            const updatedConcert = await Concert.updateById(id, updateData);

            if (updatedConcert) {
              results.success.push({
                index: globalIndex,
                id,
                title: updatedConcert.title,
                updatedAt: updatedConcert.updatedAt,
              });
            } else {
              throw new Error("수정 처리 중 오류가 발생했습니다.");
            }

          } catch (error) {
            results.failed.push({
              index: globalIndex,
              id,
              error: error instanceof Error ? error.message : "알 수 없는 에러",
            });
            
            if (!continueOnError) {
              throw error; // 배치 전체 중단
            }
          }
        })
      ).then(() => {
        console.log(`✅ 배치 ${batchNumber} 수정 완료`);
      });

      updatePromises.push(batchPromise);
    }

    // 3. 모든 배치 처리 완료 대기
    await Promise.allSettled(updatePromises);

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`🎉 배치 콘서트 수정 완료: 성공 ${results.success.length}, 실패 ${results.failed.length} (처리시간: ${processingTime}초)`);

    res.status(200).json({
      message: "콘서트 일괄 수정 처리 완료",
      summary: {
        total: updates.length,
        success: results.success.length,
        failed: results.failed.length,
        processingTime: `${processingTime}초`,
        batchCount: totalBatches,
      },
      results,
    });

  } catch (error) {
    console.error("❌ 콘서트 일괄 수정 에러:", error);
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
 *     summary: 여러 콘서트 일괄 삭제 (성능 최적화)
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
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 100
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
    const { ids, continueOnError = true, batchSize = 100 } = req.body;

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

    console.log(`⚡ 배치 콘서트 삭제 시작: ${ids.length}개 콘서트`);
    const startTime = Date.now();

    // 1. ⚡ 존재하는 콘서트들 일괄 조회
    const existingConcerts = await Concert.findByIds(ids);
    const existingConcertMap = new Map(
      existingConcerts.map(concert => [concert._id.toString(), concert])
    );

    console.log(`🔍 존재 확인 완료: ${existingConcerts.length}/${ids.length}개 발견`);

    // 2. 존재하지 않는 ID들 처리
    ids.forEach((id, index) => {
      if (typeof id !== 'string' || !id) {
        results.failed.push({
          index,
          id,
          error: "올바르지 않은 ID 형식입니다.",
        });
      } else if (!existingConcertMap.has(id)) {
        results.notFound.push({
          index,
          id,
          error: "콘서트를 찾을 수 없습니다.",
        });
      }
    });

    // 3. 삭제할 유효한 ID들
    const validIds = ids.filter((id, index) => {
      const isValid = typeof id === 'string' && id && existingConcertMap.has(id);
      return isValid;
    });

    if (validIds.length === 0) {
      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      
      res.status(200).json({
        message: "삭제할 유효한 콘서트가 없습니다.",
        summary: {
          total: ids.length,
          success: 0,
          failed: results.failed.length,
          notFound: results.notFound.length,
          processingTime: `${processingTime}초`,
        },
        results,
      });
      return;
    }

    // 4. ⚡ 배치 단위로 삭제 처리 (N번 delete → deleteMany)
    const deletePromises: Promise<any>[] = [];
    const totalBatches = Math.ceil(validIds.length / batchSize);

    for (let i = 0; i < validIds.length; i += batchSize) {
      const batch = validIds.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 배치 ${batchNumber}/${totalBatches} 삭제 중... (${batch.length}개)`);
      
      const deletePromise = Concert.deleteByIds(batch)
        .then((deletedCount) => {
          // 성공한 삭제들 기록
          batch.forEach((id) => {
            const originalIndex = ids.indexOf(id);
            const concert = existingConcertMap.get(id);
            results.success.push({
              index: originalIndex,
              id,
              uid: concert?.uid,
              title: concert?.title,
            });
          });
          console.log(`✅ 배치 ${batchNumber} 삭제 완료: ${deletedCount}개`);
        })
        .catch((error) => {
          // 배치 삭제 실패 시 개별 처리
          console.warn(`⚠️ 배치 ${batchNumber} 삭제 실패, 개별 처리로 전환: ${error.message}`);
          return Promise.allSettled(
            batch.map(async (id) => {
              const originalIndex = ids.indexOf(id);
              try {
                const deletedConcert = await Concert.deleteById(id);
                if (deletedConcert) {
                  results.success.push({
                    index: originalIndex,
                    id,
                    uid: deletedConcert.uid,
                    title: deletedConcert.title,
                  });
                } else {
                  throw new Error("삭제 처리 중 오류가 발생했습니다.");
                }
              } catch (individualError) {
                results.failed.push({
                  index: originalIndex,
                  id,
                  error: individualError instanceof Error ? individualError.message : "알 수 없는 에러",
                });
                
                if (!continueOnError) {
                  throw individualError;
                }
              }
            })
          );
        });

      deletePromises.push(deletePromise);
    }

    // 5. 모든 배치 처리 완료 대기
    await Promise.allSettled(deletePromises);

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`🎉 배치 콘서트 삭제 완료: 성공 ${results.success.length}, 실패 ${results.failed.length}, 미발견 ${results.notFound.length} (처리시간: ${processingTime}초)`);

    res.status(200).json({
      message: "콘서트 일괄 삭제 처리 완료",
      summary: {
        total: ids.length,
        success: results.success.length,
        failed: results.failed.length,
        notFound: results.notFound.length,
        processingTime: `${processingTime}초`,
        batchCount: totalBatches,
      },
      results,
    });

  } catch (error) {
    console.error("❌ 콘서트 일괄 삭제 에러:", error);
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
 *     summary: 여러 콘서트 일괄 좋아요 처리 (성능 최적화)
 *     description: 여러 콘서트에 대해 좋아요를 일괄로 처리합니다.
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
 *               batchSize:
 *                 type: integer
 *                 description: "배치 처리 크기"
 *                 default: 50
 *               useBulkWrite:
 *                 type: boolean
 *                 description: "MongoDB bulkWrite 사용 여부 (고성능)"
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
    const { actions, continueOnError = true, batchSize = 50, useBulkWrite = true } = req.body;
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

    console.log(`⚡ 배치 좋아요 처리 시작: ${actions.length}개 액션 (bulkWrite: ${useBulkWrite})`);
    const startTime = Date.now();

    if (useBulkWrite) {
      // ⚡ MongoDB bulkWrite 사용 (초고성능)
      try {
        const batchResult = await Concert.batchLikeOperations(
          actions.map(action => ({
            concertId: action.concertId,
            userId,
            action: action.action
          }))
        );

        // 결과 매핑
        actions.forEach((action, index) => {
          const error = batchResult.errors.find(e => 
            e.concertId === action.concertId && e.action === action.action
          );
          
          if (error) {
            results.failed.push({
              index,
              concertId: action.concertId,
              action: action.action,
              error: error.error,
            });
          } else {
            results.success.push({
              index,
              concertId: action.concertId,
              action: action.action,
              title: "처리됨", // bulkWrite에서는 title을 개별로 가져오기 어려움
            });
          }
        });

        console.log(`🚀 bulkWrite 완료: 성공 ${batchResult.success}, 실패 ${batchResult.failed}`);

      } catch (bulkError) {
        console.warn(`⚠️ bulkWrite 실패, 개별 처리로 전환: ${bulkError instanceof Error ? bulkError.message : "알 수 없는 에러"}`);
        // bulkWrite 실패 시 개별 처리로 fallback
        results.success = [];
        results.failed = [];
      }
    }

    // bulkWrite를 사용하지 않거나 실패한 경우 개별 처리
    if (!useBulkWrite || results.success.length === 0) {
      // 1. ⚡ 모든 콘서트 ID 존재 확인 및 현재 좋아요 상태 조회
      const concertIds = actions.map(action => action.concertId).filter(Boolean);
      const existingConcerts = await Concert.findByIds(concertIds);
      const concertMap = new Map(
        existingConcerts.map(concert => [concert._id.toString(), concert])
      );

      console.log(`🔍 콘서트 확인 완료: ${existingConcerts.length}/${concertIds.length}개 발견`);

      // 2. ⚡ 배치 단위로 병렬 처리
      const likePromises: Promise<any>[] = [];
      const totalBatches = Math.ceil(actions.length / batchSize);

      for (let i = 0; i < actions.length; i += batchSize) {
        const batch = actions.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        console.log(`📦 배치 ${batchNumber}/${totalBatches} 처리 중... (${batch.length}개)`);
        
        const batchPromise = Promise.allSettled(
          batch.map(async ({ concertId, action }, batchIndex) => {
            const globalIndex = i + batchIndex;
            
            try {
              if (!concertId || !action || !["add", "remove"].includes(action)) {
                throw new Error("concertId 또는 action이 유효하지 않습니다.");
              }

              const concert = concertMap.get(concertId);
              if (!concert) {
                throw new Error("콘서트를 찾을 수 없습니다.");
              }

              let updatedConcert;
              if (action === "add") {
                // 이미 좋아요했는지 확인
                const isAlreadyLiked = concert.likes?.some(
                  (like: any) => like.userId?.toString() === userId.toString()
                );
                
                if (isAlreadyLiked) {
                  throw new Error("이미 좋아요한 콘서트입니다.");
                }
                
                updatedConcert = await Concert.addLike(concertId, userId);
              } else {
                updatedConcert = await Concert.removeLike(concertId, userId);
              }

              results.success.push({
                index: globalIndex,
                concertId,
                action,
                title: updatedConcert.title,
                likesCount: updatedConcert.likesCount,
              });

            } catch (error) {
              results.failed.push({
                index: globalIndex,
                concertId,
                action,
                error: error instanceof Error ? error.message : "알 수 없는 에러",
              });
              
              if (!continueOnError) {
                throw error;
              }
            }
          })
        ).then(() => {
          console.log(`✅ 배치 ${batchNumber} 좋아요 처리 완료`);
        });

        likePromises.push(batchPromise);
      }

      // 3. 모든 배치 처리 완료 대기
      await Promise.allSettled(likePromises);
    }

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`🎉 배치 좋아요 처리 완료: 성공 ${results.success.length}, 실패 ${results.failed.length} (처리시간: ${processingTime}초)`);

    res.status(200).json({
      message: "좋아요 일괄 처리 완료",
      summary: {
        total: actions.length,
        success: results.success.length,
        failed: results.failed.length,
        processingTime: `${processingTime}초`,
        method: useBulkWrite ? "bulkWrite" : "individual",
        batchCount: useBulkWrite ? 1 : Math.ceil(actions.length / batchSize),
      },
      results,
    });

  } catch (error) {
    console.error("❌ 좋아요 일괄 처리 에러:", error);
    res.status(500).json({
      message: "서버 에러로 좋아요 일괄 처리 실패",
      error: error instanceof Error ? error.message : "알 수 없는 에러",
    });
  }
};