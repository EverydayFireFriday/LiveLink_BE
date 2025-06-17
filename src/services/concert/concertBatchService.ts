import { getConcertModel } from "../../models/concert";
import type {
  IConcert,
  ILocation,
  IPrice,
  ITicketLink,
} from "../../models/concert";
import {
  validateConcertData,
  generateObjectIdFromUid,
  validateAndNormalizeBatchSize,
} from "../../utils/validation/concertValidation";

export interface ConcertServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export interface BatchUploadRequest {
  concerts: any[];
  skipDuplicates?: boolean;
  batchSize?: number;
}

export interface BatchUpdateRequest {
  updates: Array<{
    id: string;
    data: any;
  }>;
  continueOnError?: boolean;
  batchSize?: number;
}

export interface BatchDeleteRequest {
  ids: string[];
  continueOnError?: boolean;
  batchSize?: number;
}

export interface BatchLikeRequest {
  actions: Array<{
    concertId: string;
    action: "add" | "remove";
  }>;
  continueOnError?: boolean;
  batchSize?: number;
  useBulkWrite?: boolean;
}

export class ConcertBatchService {
  /**
   * 여러 콘서트 일괄 등록
   */
  static async batchUploadConcerts(
    request: BatchUploadRequest
  ): Promise<ConcertServiceResponse> {
    try {
      const { concerts, skipDuplicates = false, batchSize = 100 } = request;

      if (!Array.isArray(concerts) || concerts.length === 0) {
        return {
          success: false,
          error: "concerts 배열이 비어있거나 올바르지 않습니다.",
          statusCode: 400,
        };
      }

      const Concert = getConcertModel();
      const results = {
        success: [] as any[],
        failed: [] as any[],
        duplicates: [] as any[],
      };

      console.log(`⚡ 배치 콘서트 등록 시작: ${concerts.length}개 콘서트`);
      const startTime = Date.now();

      // 1. 모든 콘서트 데이터 유효성 검증
      const validationResults = await Promise.allSettled(
        concerts.map(async (concertData, index) => {
          const validationResult = validateConcertData(concertData);
          return {
            index,
            concertData,
            validationError: validationResult.isValid
              ? null
              : validationResult.message,
          };
        })
      );

      const validConcerts: any[] = [];
      const invalidConcerts: any[] = [];

      validationResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
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
            uid: concerts[index]?.uid || "unknown",
            error: "데이터 검증 중 오류 발생",
          });
        }
      });

      results.failed.push(...invalidConcerts);

      if (validConcerts.length === 0) {
        return {
          success: false,
          error: "유효한 콘서트 데이터가 없습니다.",
          data: {
            summary: {
              total: concerts.length,
              success: 0,
              failed: results.failed.length,
              duplicates: 0,
            },
            results,
          },
          statusCode: 400,
        };
      }

      // 2. 중복 UID 일괄 확인
      const uids = validConcerts.map((vc) => vc.concertData.uid);
      const existingConcerts = await Concert.findByUids(uids);
      const existingUidSet = new Set(existingConcerts.map((c) => c.uid));

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

        // ObjectId 생성 및 데이터 준비 - Model의 IConcert 타입 사용
        const mongoId = generateObjectIdFromUid(concertData.uid);
        const processedData: Omit<IConcert, "createdAt" | "updatedAt"> = {
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
            ? concertData.datetime.map((dt: any) => new Date(dt))
            : [new Date(concertData.datetime)],
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
          status: "upcoming",
          likes: [],
          likesCount: 0,
        };

        concertsToInsert.push({ index, processedData });
      }

      // 4. 배치 단위로 MongoDB에 저장
      const normalizedBatchSize = validateAndNormalizeBatchSize(batchSize);
      const insertPromises: Promise<any>[] = [];
      const totalBatches = Math.ceil(
        concertsToInsert.length / normalizedBatchSize
      );

      for (let i = 0; i < concertsToInsert.length; i += normalizedBatchSize) {
        const batch = concertsToInsert.slice(i, i + normalizedBatchSize);
        const batchData = batch.map((item) => item.processedData);

        const insertPromise = Concert.insertMany(batchData)
          .then((insertedConcerts) => {
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
          })
          .catch((error) => {
            // 배치 실패 시 개별 처리
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
                    error:
                      individualError instanceof Error
                        ? individualError.message
                        : "알 수 없는 에러",
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

      return {
        success: true,
        data: {
          message: "콘서트 일괄 등록 처리 완료",
          summary: {
            total: concerts.length,
            success: results.success.length,
            failed: results.failed.length,
            duplicates: results.duplicates.length,
            processingTime: `${processingTime}초`,
            batchCount: totalBatches,
          },
          results,
        },
        statusCode: 201,
      };
    } catch (error) {
      console.error("❌ 콘서트 일괄 등록 서비스 에러:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "콘서트 일괄 등록 실패",
        statusCode: 500,
      };
    }
  }

  /**
   * 여러 콘서트 일괄 수정
   */
  static async batchUpdateConcerts(
    request: BatchUpdateRequest
  ): Promise<ConcertServiceResponse> {
    try {
      const { updates, continueOnError = true, batchSize = 50 } = request;

      if (!Array.isArray(updates) || updates.length === 0) {
        return {
          success: false,
          error: "updates 배열이 비어있거나 올바르지 않습니다.",
          statusCode: 400,
        };
      }

      const Concert = getConcertModel();
      const results = {
        success: [] as any[],
        failed: [] as any[],
      };

      const startTime = Date.now();

      // 1. 모든 콘서트 ID 존재 확인
      const ids = updates.map((update) => update.id).filter(Boolean);
      const existingConcerts = await Concert.findByIds(ids);
      const existingIdSet = new Set(
        existingConcerts.map((c) => c._id.toString())
      );

      // 2. 배치 단위로 병렬 처리
      const normalizedBatchSize = validateAndNormalizeBatchSize(batchSize, 50);
      const updatePromises: Promise<any>[] = [];
      const totalBatches = Math.ceil(updates.length / normalizedBatchSize);

      for (let i = 0; i < updates.length; i += normalizedBatchSize) {
        const batch = updates.slice(i, i + normalizedBatchSize);

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
                error:
                  error instanceof Error ? error.message : "알 수 없는 에러",
              });

              if (!continueOnError) {
                throw error;
              }
            }
          })
        );

        updatePromises.push(batchPromise);
      }

      // 3. 모든 배치 처리 완료 대기
      await Promise.allSettled(updatePromises);

      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      return {
        success: true,
        data: {
          message: "콘서트 일괄 수정 처리 완료",
          summary: {
            total: updates.length,
            success: results.success.length,
            failed: results.failed.length,
            processingTime: `${processingTime}초`,
            batchCount: totalBatches,
          },
          results,
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("❌ 콘서트 일괄 수정 서비스 에러:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "콘서트 일괄 수정 실패",
        statusCode: 500,
      };
    }
  }

  /**
   * 여러 콘서트 일괄 삭제
   */
  static async batchDeleteConcerts(
    request: BatchDeleteRequest
  ): Promise<ConcertServiceResponse> {
    try {
      const { ids, continueOnError = true, batchSize = 100 } = request;

      if (!Array.isArray(ids) || ids.length === 0) {
        return {
          success: false,
          error: "ids 배열이 비어있거나 올바르지 않습니다.",
          statusCode: 400,
        };
      }

      const Concert = getConcertModel();
      const results = {
        success: [] as any[],
        failed: [] as any[],
        notFound: [] as any[],
      };

      const startTime = Date.now();

      // 1. 존재하는 콘서트들 일괄 조회
      const existingConcerts = await Concert.findByIds(ids);
      const existingConcertMap = new Map(
        existingConcerts.map((concert) => [concert._id.toString(), concert])
      );

      // 2. 존재하지 않는 ID들 처리
      ids.forEach((id, index) => {
        if (typeof id !== "string" || !id) {
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
      const validIds = ids.filter(
        (id) => typeof id === "string" && id && existingConcertMap.has(id)
      );

      if (validIds.length === 0) {
        const endTime = Date.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(2);

        return {
          success: true,
          data: {
            message: "삭제할 유효한 콘서트가 없습니다.",
            summary: {
              total: ids.length,
              success: 0,
              failed: results.failed.length,
              notFound: results.notFound.length,
              processingTime: `${processingTime}초`,
            },
            results,
          },
          statusCode: 200,
        };
      }

      // 4. 배치 단위로 삭제 처리
      const normalizedBatchSize = validateAndNormalizeBatchSize(batchSize);
      const deletePromises: Promise<any>[] = [];
      const totalBatches = Math.ceil(validIds.length / normalizedBatchSize);

      for (let i = 0; i < validIds.length; i += normalizedBatchSize) {
        const batch = validIds.slice(i, i + normalizedBatchSize);

        const deletePromise = Concert.deleteByIds(batch)
          .then((deletedCount) => {
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
          })
          .catch((error) => {
            // 배치 삭제 실패 시 개별 처리
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
                    error:
                      individualError instanceof Error
                        ? individualError.message
                        : "알 수 없는 에러",
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

      return {
        success: true,
        data: {
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
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("❌ 콘서트 일괄 삭제 서비스 에러:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "콘서트 일괄 삭제 실패",
        statusCode: 500,
      };
    }
  }

  /**
   * 여러 콘서트 일괄 좋아요 처리
   */
  static async batchLikeConcerts(
    request: BatchLikeRequest,
    userId: string
  ): Promise<ConcertServiceResponse> {
    try {
      const {
        actions,
        continueOnError = true,
        batchSize = 50,
        useBulkWrite = true,
      } = request;

      if (!userId) {
        return {
          success: false,
          error: "로그인이 필요합니다.",
          statusCode: 401,
        };
      }

      if (!Array.isArray(actions) || actions.length === 0) {
        return {
          success: false,
          error: "actions 배열이 비어있거나 올바르지 않습니다.",
          statusCode: 400,
        };
      }

      const Concert = getConcertModel();
      const results = {
        success: [] as any[],
        failed: [] as any[],
      };

      const startTime = Date.now();

      if (useBulkWrite) {
        // MongoDB bulkWrite 사용 (초고성능)
        try {
          const batchResult = await Concert.batchLikeOperations(
            actions.map((action) => ({
              concertId: action.concertId,
              userId,
              action: action.action,
            }))
          );

          // 결과 매핑
          actions.forEach((action, index) => {
            const error = batchResult.errors.find(
              (e) =>
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
                title: "처리됨",
              });
            }
          });
        } catch (bulkError) {
          console.warn("⚠️ bulkWrite 실패, 개별 처리로 전환:", bulkError);
          // bulkWrite 실패 시 개별 처리로 fallback
          results.success = [];
          results.failed = [];
        }
      }

      // bulkWrite를 사용하지 않거나 실패한 경우 개별 처리
      if (!useBulkWrite || results.success.length === 0) {
        // 1. 모든 콘서트 ID 존재 확인 및 현재 좋아요 상태 조회
        const concertIds = actions
          .map((action) => action.concertId)
          .filter(Boolean);
        const existingConcerts = await Concert.findByIds(concertIds);
        const concertMap = new Map(
          existingConcerts.map((concert) => [concert._id.toString(), concert])
        );

        // 2. 배치 단위로 병렬 처리
        const normalizedBatchSize = validateAndNormalizeBatchSize(
          batchSize,
          50
        );
        const likePromises: Promise<any>[] = [];
        const totalBatches = Math.ceil(actions.length / normalizedBatchSize);

        for (let i = 0; i < actions.length; i += normalizedBatchSize) {
          const batch = actions.slice(i, i + normalizedBatchSize);

          const batchPromise = Promise.allSettled(
            batch.map(async ({ concertId, action }, batchIndex) => {
              const globalIndex = i + batchIndex;

              try {
                if (
                  !concertId ||
                  !action ||
                  !["add", "remove"].includes(action)
                ) {
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
                  error:
                    error instanceof Error ? error.message : "알 수 없는 에러",
                });

                if (!continueOnError) {
                  throw error;
                }
              }
            })
          );

          likePromises.push(batchPromise);
        }

        // 3. 모든 배치 처리 완료 대기
        await Promise.allSettled(likePromises);
      }

      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      return {
        success: true,
        data: {
          message: "좋아요 일괄 처리 완료",
          summary: {
            total: actions.length,
            success: results.success.length,
            failed: results.failed.length,
            processingTime: `${processingTime}초`,
            method: useBulkWrite ? "bulkWrite" : "individual",
            batchCount: useBulkWrite
              ? 1
              : Math.ceil(actions.length / batchSize),
          },
          results,
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error("❌ 좋아요 일괄 처리 서비스 에러:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "좋아요 일괄 처리 실패",
        statusCode: 500,
      };
    }
  }
}
