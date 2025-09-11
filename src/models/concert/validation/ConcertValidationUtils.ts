import { ObjectId } from 'mongodb';
import logger from '../../../utils/logger/logger';
import { validCategories } from '../base/ConcertEnums';

/**
 * 유효성 검증 결과 인터페이스
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  field?: string;
}

/**
 * UID에서 ObjectId 생성 함수
 */
export const generateObjectIdFromUid = (uid: string): ObjectId => {
  try {
    const timestampMatch = uid.match(/(\d{13})/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]);
      const timestampInSeconds = Math.floor(timestamp / 1000);
      return new ObjectId(timestampInSeconds);
    } else {
      logger.warn(`UID에서 timestamp를 찾을 수 없음: ${uid}, 새로운 ObjectId 생성`);
      return new ObjectId();
    }
  } catch (error) {
    logger.warn(`UID를 ObjectId로 변환 실패: ${uid}, 새로운 ObjectId 생성`, error);
    return new ObjectId();
  }
};

/**
 * 이미지 URL 유효성 검증 함수
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }
  const s3UrlPattern = /^https:\/\/[\w.-]+\.s3\.[\w.-]+\.amazonaws\.com\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
  const generalUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
  return s3UrlPattern.test(url) || generalUrlPattern.test(url);
};

/**
 * 콘서트 상태 유효성 검증 함수
 */
export const isValidConcertStatus = (status: string): boolean => {
  const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
  return validStatuses.includes(status);
};

/**
 * 음악 카테고리 유효성 검증 함수
 */
export const isValidMusicCategory = (category: string): boolean => {
  return validCategories.includes(category);
};

/**
 * 날짜 문자열 유효성 검증 함수
 */
export const isValidDateString = (dateString: string): boolean => {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() !== 'Invalid Date';
};

/**
 * 유효성 검증 에러 메시지 포맷팅 함수
 */
export const formatValidationError = (result: ValidationResult): string => {
  if (result.isValid) {
    return '';
  }
  return result.field ? `[${result.field}] ${result.message}` : result.message || '유효성 검증 실패';
};
