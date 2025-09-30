import { getConcertModel } from '../../models/concert/concert';
import type { IConcert } from '../../models/concert/base/ConcertTypes';
import { validateConcertData } from '../../models/concert/validation/ConcertCreateValidation';
import { generateObjectIdFromUid } from '../../models/concert/validation/ConcertValidationUtils';
import { validateAndNormalizeBatchSize } from '../../models/concert/validation/ConcertSearchValidation';
import logger from '../../utils/logger/logger';

export interface ConcertServiceResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}

export interface BatchUploadRequest {
  concerts: IConcert[];
  skipDuplicates?: boolean;
  batchSize?: number;
}

export interface BatchUpdateRequest {
  updates: Array<{
    uid: string; // Controller에서 uid로 사용
    title?: string;
    status?: 'completed' | 'upcoming' | 'ongoing' | 'cancelled'; // 타입 명시
    price?: unknown[];
    [key: string]: unknown; // 기타 업데이트 필드들
  }>;
  continueOnError?: boolean;
  batchSize?: number;
}

export interface BatchDeleteRequest {
  uids: string[]; // Controller에서 uids로 사용
  softDelete?: boolean;
  continueOnError?: boolean;
  batchSize?: number;
}

export interface BatchLikeRequest {
  operations: Array<{
    uid: string; // Controller에서 uid로 사용
    action: 'like' | 'unlike'; // Controller에서 like/unlike로 사용
  }>;
  continueOnError?: boolean;
  batchSize?: number;
  useBulkWrite?: boolean;
}

interface ConcertResult {
  index: number;
  uid: string;
  title?: string;
  error?: string;
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: string;
  deleteType?: string;
  action?: string;
  success?: boolean;
  newLikesCount?: number;
}

interface ValidationResult {
  index: number;
  concertData: IConcert;
  validationError: string | null | undefined;
}

interface BatchResults {
  success: ConcertResult[];
  failed: ConcertResult[];
  duplicates?: ConcertResult[];
  notFound?: ConcertResult[];
}

interface ConcertToInsert {
  index: number;
  processedData: Omit<IConcert, 'createdAt' | 'updatedAt'>;
}

export class ConcertBatchService {
  /**
   * 여러 콘서트 일괄 등록
   */
  static async batchUploadConcerts(
    request: BatchUploadRequest,
  ): Promise<ConcertServiceResponse> {
    try {
      const { concerts, skipDuplicates = false, batchSize = 100 } = request;

      if (!Array.isArray(concerts) || concerts.length === 0) {
        return {
          success: false,
          error: 'concerts 배열이 비어있거나 올바르지 않습니다.',
          statusCode: 400,
        };
      }

      const ConcertModel = getConcertModel();
      const results: BatchResults = {
        success: [],
        failed: [],
        duplicates: [],
      };

      logger.info(`⚡ 배치 콘서트 등록 시작: ${concerts.length}개 콘서트`);
      const startTime = Date.now();

      // 1. 모든 콘서트 데이터 유효성 검증
      const validationResults = await Promise.allSettled(
        concerts.map(async (concertData, index): Promise<ValidationResult> => {
          const validationResult = validateConcertData(concertData);
          return {
            index,
            concertData,
            validationError: validationResult.isValid
              ? null
              : validationResult.message,
          };
        }),
      );

      const validConcerts: Array<{ index: number; concertData: IConcert }> = [];
      const invalidConcerts: ConcertResult[] = [];

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
            error: '데이터 검증 중 오류 발생',
          });
        }
      });

      results.failed.push(...invalidConcerts);

      if (validConcerts.length === 0) {
        return {
          success: false,
          error: '유효한 콘서트 데이터가 없습니다.',
          data: {
            message: '유효한 콘서트 데이터가 없습니다.',
            results: {
              totalRequested: concerts.length,
              successCount: 0,
              errorCount: results.failed.length,
              duplicateCount: 0,
              errors: results.failed,
              created: [],
              duplicates: [],
            },
            timestamp: new Date().toISOString(),
          },
          statusCode: 400,
        };
      }

      // 2. 중복 UID 일괄 확인
      const uids = validConcerts.map((vc) => vc.concertData.uid);
      const existingConcerts = await ConcertModel.findByUids(uids);
      const existingUidSet = new Set(existingConcerts.map((c) => c.uid));

      // 3. 중복 처리 및 데이터 준비
      const concertsToInsert: ConcertToInsert[] = [];

      for (const { index, concertData } of validConcerts) {
        if (existingUidSet.has(concertData.uid)) {
          if (skipDuplicates) {
            results.duplicates?.push({
              index,
              uid: concertData.uid,
              title: concertData.title,
            });
            continue;
          } else {
            results.failed.push({
              index,
              uid: concertData.uid,
              error: '이미 존재하는 콘서트 UID입니다.',
            });
            continue;
          }
        }

        // ObjectId 생성 및 데이터 준비 - Model의 Concert 타입 사용
        const mongoId = generateObjectIdFromUid(concertData.uid);
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
          datetime: Array.isArray(concertData.datetime)
            ? concertData.datetime.map((dt: unknown) => new Date(dt as string))
            : [new Date(concertData.datetime as string)],
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
          ticketOpenDate: concertData.ticketOpenDate
            ? new Date(concertData.ticketOpenDate)
            : undefined,
          posterImage: concertData.posterImage || '',
          infoImages: concertData.infoImages || [], // info → infoImages로 변경

          status: 'upcoming',
          likesCount: 0,
        };

        concertsToInsert.push({ index, processedData });
      }

      // 4. 배치 단위로 MongoDB에 저장
      const normalizedBatchSize = validateAndNormalizeBatchSize(batchSize);
      const insertPromises: Promise<void>[] = [];
      const totalBatches = Math.ceil(
        concertsToInsert.length / normalizedBatchSize,
      );

      for (let i = 0; i < concertsToInsert.length; i += normalizedBatchSize) {
        const batch = concertsToInsert.slice(i, i + normalizedBatchSize);
        const batchData = batch.map((item) => item.processedData);

        const insertPromise = ConcertModel.insertMany(batchData)
          .then((insertedConcerts) => {
            batch.forEach(({ index }, batchIndex) => {
              const insertedConcert = insertedConcerts[batchIndex];
              results.success.push({
                index,
                id: insertedConcert._id?.toString(),
                uid: insertedConcert.uid,
                title: insertedConcert.title,
                createdAt: insertedConcert.createdAt,
              });
            });
          })
          .catch(() => {
            // 배치 실패 시 개별 처리
            const individualPromises = batch.map(
              async ({ index, processedData }) => {
                try {
                  const newConcert = await ConcertModel.create(processedData);
                  results.success.push({
                    index,
                    id: newConcert._id?.toString(),
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
                        : '알 수 없는 에러',
                  });
                }
              },
            );
            return Promise.allSettled(individualPromises);
          })
          .then(() => {
            // Promise chain을 void로 만들기 위한 then
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
          message: '콘서트 일괄 등록 처리 완료',
          results: {
            totalRequested: concerts.length,
            successCount: results.success.length,
            errorCount: results.failed.length,
            duplicateCount: results.duplicates?.length || 0,
            created: results.success,
            errors: results.failed,
            duplicates: results.duplicates,
            processingTime: `${processingTime}초`,
            batchCount: totalBatches,
          },
          timestamp: new Date().toISOString(),
        },
        statusCode: 201,
      };
    } catch (error) {
      logger.error('❌ 콘서트 일괄 등록 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '콘서트 일괄 등록 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 여러 콘서트 일괄 수정
   */
  static async batchUpdateConcerts(
    request: BatchUpdateRequest,
  ): Promise<ConcertServiceResponse> {
    try {
      const { updates, continueOnError = true, batchSize = 50 } = request;

      if (!Array.isArray(updates) || updates.length === 0) {
        return {
          success: false,
          error: 'updates 배열이 비어있거나 올바르지 않습니다.',
          statusCode: 400,
        };
      }

      const ConcertModel = getConcertModel();
      const results: BatchResults = {
        success: [],
        failed: [],
        notFound: [],
      };

      const startTime = Date.now();

      // 1. 모든 콘서트 UID 존재 확인
      const uids = updates.map((update) => update.uid).filter(Boolean);
      const existingConcerts = await ConcertModel.findByUids(uids);
      const existingUidMap = new Map(existingConcerts.map((c) => [c.uid, c]));

      // 2. 배치 단위로 병렬 처리
      const normalizedBatchSize = validateAndNormalizeBatchSize(batchSize, 50);
      const updatePromises: Promise<PromiseSettledResult<void>[]>[] = [];
      const totalBatches = Math.ceil(updates.length / normalizedBatchSize);

      for (let i = 0; i < updates.length; i += normalizedBatchSize) {
        const batch = updates.slice(i, i + normalizedBatchSize);

        const batchPromise = Promise.allSettled(
          batch.map(async (updateItem, batchIndex) => {
            const globalIndex = i + batchIndex;
            const { uid, ...data } = updateItem;

            try {
              if (!uid || !data) {
                throw new Error('uid 또는 data가 누락되었습니다.');
              }

              const existingConcert = existingUidMap.get(uid);
              if (!existingConcert) {
                results.notFound?.push({
                  index: globalIndex,
                  uid,
                  error: '콘서트를 찾을 수 없습니다.',
                });
                return;
              }

              // 수정 불가능한 필드 제거 및 타입 안전성 확보
              const updateData: Partial<IConcert> = {
                ...data,
              } as Partial<IConcert>;
              delete (updateData as Record<string, unknown>).uid;
              delete (updateData as Record<string, unknown>).likesCount;
              delete (updateData as Record<string, unknown>)._id;
              delete (updateData as Record<string, unknown>).createdAt;
              updateData.updatedAt = new Date();

              // status 필드 유효성 검증
              if (
                updateData.status &&
                !['completed', 'upcoming', 'ongoing', 'cancelled'].includes(
                  updateData.status,
                )
              ) {
                throw new Error(
                  `유효하지 않은 status 값: ${updateData.status}`,
                );
              }

              const updatedConcert = await ConcertModel.updateById(
                existingConcert._id?.toString() || '',
                updateData,
              );

              if (updatedConcert) {
                results.success.push({
                  index: globalIndex,
                  uid,
                  title: updatedConcert.title,
                  updatedAt: updatedConcert.updatedAt,
                });
              } else {
                throw new Error('수정 처리 중 오류가 발생했습니다.');
              }
            } catch (error) {
              results.failed.push({
                index: globalIndex,
                uid,
                error:
                  error instanceof Error ? error.message : '알 수 없는 에러',
              });

              if (!continueOnError) {
                throw error;
              }
            }
          }),
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
          message: '콘서트 일괄 수정 처리 완료',
          results: {
            totalRequested: updates.length,
            successCount: results.success.length,
            errorCount: results.failed.length,
            notFoundCount: results.notFound?.length || 0,
            updated: results.success,
            errors: results.failed,
            notFound: results.notFound,
            processingTime: `${processingTime}초`,
            batchCount: totalBatches,
          },
          timestamp: new Date().toISOString(),
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('❌ 콘서트 일괄 수정 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '콘서트 일괄 수정 실패',
        statusCode: 500,
      };
    }
  }

  /**
   * 여러 콘서트 일괄 삭제
   */
  static async batchDeleteConcerts(
    request: BatchDeleteRequest,
  ): Promise<ConcertServiceResponse> {
    try {
      const {
        uids,
        softDelete = true,
        continueOnError = true,
        batchSize = 100,
      } = request;

      if (!Array.isArray(uids) || uids.length === 0) {
        return {
          success: false,
          error: 'uids 배열이 비어있거나 올바르지 않습니다.',
          statusCode: 400,
        };
      }

      const ConcertModel = getConcertModel();
      const results: BatchResults = {
        success: [],
        failed: [],
        notFound: [],
      };

      const startTime = Date.now();

      // 1. 존재하는 콘서트들 일괄 조회
      const existingConcerts = await ConcertModel.findByUids(uids);
      const existingConcertMap = new Map(
        existingConcerts.map((concert) => [concert.uid, concert]),
      );

      // 2. 존재하지 않는 UID들 처리
      uids.forEach((uid, index) => {
        if (typeof uid !== 'string' || !uid) {
          results.failed.push({
            index,
            uid,
            error: '올바르지 않은 UID 형식입니다.',
          });
        } else if (!existingConcertMap.has(uid)) {
          results.notFound?.push({
            index,
            uid,
            error: '콘서트를 찾을 수 없습니다.',
          });
        }
      });

      // 3. 삭제할 유효한 UID들
      const validUids = uids.filter(
        (uid) => typeof uid === 'string' && uid && existingConcertMap.has(uid),
      );

      if (validUids.length === 0) {
        const endTime = Date.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(2);

        return {
          success: true,
          data: {
            message: '삭제할 유효한 콘서트가 없습니다.',
            results: {
              totalRequested: uids.length,
              successCount: 0,
              errorCount: results.failed.length,
              notFoundCount: results.notFound?.length || 0,
              deleted: [],
              errors: results.failed,
              notFound: results.notFound,
              processingTime: `${processingTime}초`,
            },
            timestamp: new Date().toISOString(),
          },
          statusCode: 200,
        };
      }

      // 4. 배치 단위로 삭제 처리
      const normalizedBatchSize = validateAndNormalizeBatchSize(batchSize);
      const deletePromises: Promise<void>[] = [];
      const totalBatches = Math.ceil(validUids.length / normalizedBatchSize);

      for (let i = 0; i < validUids.length; i += normalizedBatchSize) {
        const batch = validUids.slice(i, i + normalizedBatchSize);

        const deletePromise = (async () => {
          for (const uid of batch) {
            const originalIndex = uids.indexOf(uid);
            try {
              const concert = existingConcertMap.get(uid);
              if (!concert) continue;

              let deletedConcert;
              if (softDelete) {
                // 소프트 삭제 (상태 변경)
                deletedConcert = await ConcertModel.updateById(
                  concert._id?.toString() || '',
                  { status: 'cancelled', updatedAt: new Date() },
                );
              } else {
                // 하드 삭제
                deletedConcert = await ConcertModel.deleteById(
                  concert._id?.toString() || '',
                );
              }

              if (deletedConcert) {
                results.success.push({
                  index: originalIndex,
                  uid,
                  title: concert.title,
                  deletedAt: new Date().toISOString(),
                  deleteType: softDelete ? 'soft' : 'hard',
                });
              } else {
                throw new Error('삭제 처리 중 오류가 발생했습니다.');
              }
            } catch (error) {
              results.failed.push({
                index: originalIndex,
                uid,
                error:
                  error instanceof Error ? error.message : '알 수 없는 에러',
              });

              if (!continueOnError) {
                throw error;
              }
            }
          }
        })();

        deletePromises.push(deletePromise);
      }

      // 5. 모든 배치 처리 완료 대기
      await Promise.allSettled(deletePromises);

      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      return {
        success: true,
        data: {
          message: '콘서트 일괄 삭제 처리 완료',
          results: {
            totalRequested: uids.length,
            successCount: results.success.length,
            errorCount: results.failed.length,
            notFoundCount: results.notFound?.length || 0,
            deleted: results.success,
            errors: results.failed,
            notFound: results.notFound,
            processingTime: `${processingTime}초`,
            batchCount: totalBatches,
            deleteType: softDelete ? 'soft' : 'hard',
          },
          timestamp: new Date().toISOString(),
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('❌ 콘서트 일괄 삭제 서비스 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '콘서트 일괄 삭제 실패',
        statusCode: 500,
      };
    }
  }

}
