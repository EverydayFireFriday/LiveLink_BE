import { ObjectId } from "mongodb";

/**
 * ObjectId 검증 및 변환 유틸리티
 */

/**
 * ObjectId 유효성 검사
 * @param id - 검사할 ID
 * @returns 유효 여부
 */
export const isValidObjectId = (id: any): boolean => {
  if (!id) return false;
  
  // string인 경우 ObjectId 형식 검증
  if (typeof id === 'string') {
    return ObjectId.isValid(id);
  }
  
  // 이미 ObjectId인 경우
  if (id instanceof ObjectId) {
    return true;
  }
  
  return false;
};

/**
 * 안전한 ObjectId 변환
 * @param id - 변환할 ID
 * @returns ObjectId 또는 null
 */
export const toObjectId = (id: any): ObjectId | null => {
  if (!isValidObjectId(id)) {
    return null;
  }
  
  if (id instanceof ObjectId) {
    return id;
  }
  
  try {
    return new ObjectId(id);
  } catch (error) {
    return null;
  }
};

/**
 * ObjectId 배열 검증
 * @param ids - 검증할 ID 배열
 * @returns 모든 ID가 유효한지 여부
 */
export const areValidObjectIds = (ids: any[]): boolean => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return false;
  }
  
  return ids.every(id => isValidObjectId(id));
};

/**
 * 안전한 ObjectId 배열 변환
 * @param ids - 변환할 ID 배열
 * @returns 유효한 ObjectId들의 배열
 */
export const toObjectIds = (ids: any[]): ObjectId[] => {
  if (!Array.isArray(ids)) {
    return [];
  }
  
  const validObjectIds: ObjectId[] = [];
  
  for (const id of ids) {
    const objectId = toObjectId(id);
    if (objectId) {
      validObjectIds.push(objectId);
    }
  }
  
  return validObjectIds;
};

/**
 * 여러 ObjectId 검증 함수
 * @param params - {id, name} 형태의 객체 배열
 * @throws Error - 유효하지 않은 ID가 있을 경우
 */
export const validateObjectIds = (params: Array<{ id: any; name: string }>): void => {
  for (const { id, name } of params) {
    if (!isValidObjectId(id)) {
      throw new Error(`유효하지 않은 ${name} ID입니다: ${id}`);
    }
  }
};