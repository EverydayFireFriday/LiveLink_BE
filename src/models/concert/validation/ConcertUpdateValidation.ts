import {
  ValidationResult,
  isValidConcertStatus,
  isValidImageUrl,
} from './ConcertValidationUtils';
import { validCategories } from '../base/ConcertEnums';
import logger from '../../../utils/logger/logger';

/**
 * 콘서트 업데이트 데이터 유효성 검증 함수
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
export const validateConcertUpdateData = (
  updateData: any,
): ValidationResult => {
  if (
    !updateData ||
    typeof updateData !== 'object' ||
    Object.keys(updateData).length === 0
  ) {
    return { isValid: false, message: '업데이트 데이터가 올바르지 않습니다.' };
  }

  const updateableFields = [
    'title',
    'description',
    'status',
    'price',
    'ticketOpenDate',
    'posterImage',
    'infoImages',
    'tags',
    'datetime',
    'artist',
    'location',
    'category',
    'ticketLink',
  ];
  const hasUpdateableField = updateableFields.some((field) =>
    Object.prototype.hasOwnProperty.call(updateData, field),
  );

  if (!hasUpdateableField) {
    return {
      isValid: false,
      message: '수정할 수 있는 필드가 최소 하나는 필요합니다.',
    };
  }

  const readOnlyFields = ['uid', 'likes', 'likesCount', '_id', 'createdAt'];
  const foundReadOnlyFields = readOnlyFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(updateData, field),
  );
  if (foundReadOnlyFields.length > 0) {
    logger.warn(
      `수정 불가능한 필드가 포함되어 있습니다 (무시됨): ${foundReadOnlyFields.join(', ')}`,
    );
  }

  if (
    updateData.title !== undefined &&
    (typeof updateData.title !== 'string' ||
      updateData.title.trim().length === 0)
  ) {
    return {
      isValid: false,
      message: 'title은 비어있지 않은 문자열이어야 합니다.',
      field: 'title',
    };
  }

  if (
    updateData.description !== undefined &&
    typeof updateData.description !== 'string'
  ) {
    return {
      isValid: false,
      message: 'description은 문자열이어야 합니다.',
      field: 'description',
    };
  }

  if (
    updateData.status !== undefined &&
    !isValidConcertStatus(updateData.status)
  ) {
    return {
      isValid: false,
      message:
        'status는 upcoming, ongoing, completed, cancelled 중 하나여야 합니다.',
      field: 'status',
    };
  }

  if (updateData.artist !== undefined) {
    if (!Array.isArray(updateData.artist))
      return {
        isValid: false,
        message: 'artist는 배열이어야 합니다.',
        field: 'artist',
      };
    for (const artist of updateData.artist) {
      if (typeof artist !== 'string' || artist.trim().length === 0) {
        return {
          isValid: false,
          message: `artist는 비어있지 않은 문자열이어야 합니다.`,
          field: 'artist',
        };
      }
    }
  }

  if (updateData.location !== undefined) {
    if (
      !Array.isArray(updateData.location) ||
      updateData.location.length === 0
    ) {
      return {
        isValid: false,
        message: 'location은 비어있지 않은 배열이어야 합니다.',
        field: 'location',
      };
    }
    for (const loc of updateData.location) {
      if (typeof loc !== 'string' || loc.trim().length === 0) {
        return {
          isValid: false,
          message: `location은 비어있지 않은 문자열이어야 합니다.`,
          field: 'location',
        };
      }
    }
  }

  if (updateData.datetime !== undefined) {
    if (
      !Array.isArray(updateData.datetime) ||
      updateData.datetime.length === 0
    ) {
      return {
        isValid: false,
        message: 'datetime은 비어있지 않은 배열이어야 합니다.',
        field: 'datetime',
      };
    }
    for (const dt of updateData.datetime) {
      if (!dt || typeof dt !== 'string' || !Date.parse(dt)) {
        return {
          isValid: false,
          message: `datetime은 유효한 날짜 형식이어야 합니다.`,
          field: 'datetime',
        };
      }
    }
  }

  if (updateData.price !== undefined) {
    if (!Array.isArray(updateData.price))
      return {
        isValid: false,
        message: 'price는 배열이어야 합니다.',
        field: 'price',
      };
    for (const p of updateData.price) {
      if (
        p.tier &&
        (typeof p.tier !== 'string' || p.tier.trim().length === 0)
      ) {
        return {
          isValid: false,
          message: `price.tier는 비어있지 않은 문자열이어야 합니다.`,
          field: 'price',
        };
      }
      if (
        p.amount !== undefined &&
        (typeof p.amount !== 'number' || p.amount < 0)
      ) {
        return {
          isValid: false,
          message: `price.amount는 0 이상의 숫자여야 합니다.`,
          field: 'price',
        };
      }
    }
  }

  if (updateData.category !== undefined) {
    if (!Array.isArray(updateData.category))
      return {
        isValid: false,
        message: 'category는 배열이어야 합니다.',
        field: 'category',
      };
    for (const c of updateData.category) {
      if (typeof c !== 'string' || !validCategories.includes(c)) {
        return {
          isValid: false,
          message: `'${c}'는 유효한 카테고리가 아닙니다.`,
          field: 'category',
        };
      }
    }
  }

  if (updateData.ticketLink !== undefined) {
    if (!Array.isArray(updateData.ticketLink))
      return {
        isValid: false,
        message: 'ticketLink는 배열이어야 합니다.',
        field: 'ticketLink',
      };
    for (const link of updateData.ticketLink) {
      if (!link || typeof link !== 'object')
        return {
          isValid: false,
          message: `ticketLink는 객체여야 합니다.`,
          field: 'ticketLink',
        };
      if (
        link.platform &&
        (typeof link.platform !== 'string' || link.platform.trim().length === 0)
      ) {
        return {
          isValid: false,
          message: `ticketLink.platform은 비어있지 않은 문자열이어야 합니다.`,
          field: 'ticketLink',
        };
      }
      if (
        link.url &&
        (typeof link.url !== 'string' || link.url.trim().length === 0)
      ) {
        return {
          isValid: false,
          message: `ticketLink.url은 비어있지 않은 문자열이어야 합니다.`,
          field: 'ticketLink',
        };
      }
    }
  }

  if (updateData.ticketOpenDate !== undefined) {
    if (!Array.isArray(updateData.ticketOpenDate)) {
      return {
        isValid: false,
        message: 'ticketOpenDate는 배열이어야 합니다.',
        field: 'ticketOpenDate',
      };
    }
    // 빈 배열이 아닐 때만 각 항목 검증
    if (updateData.ticketOpenDate.length > 0) {
      for (const item of updateData.ticketOpenDate) {
        if (!item.openTitle || typeof item.openTitle !== 'string') {
          return {
            isValid: false,
            message:
              'ticketOpenDate의 각 항목은 openTitle(문자열)을 포함해야 합니다.',
            field: 'ticketOpenDate',
          };
        }
        if (
          !item.openDate ||
          typeof item.openDate !== 'string' ||
          !Date.parse(item.openDate)
        ) {
          return {
            isValid: false,
            message:
              'ticketOpenDate의 각 항목은 유효한 날짜 형식의 openDate를 포함해야 합니다.',
            field: 'ticketOpenDate',
          };
        }
      }
    }
  }

  if (updateData.posterImage !== undefined) {
    if (
      typeof updateData.posterImage !== 'string' ||
      (updateData.posterImage.trim().length > 0 &&
        !isValidImageUrl(updateData.posterImage))
    ) {
      return {
        isValid: false,
        message: 'posterImage는 유효한 이미지 URL이어야 합니다.',
        field: 'posterImage',
      };
    }
  }

  if (updateData.infoImages !== undefined) {
    if (!Array.isArray(updateData.infoImages))
      return {
        isValid: false,
        message: 'infoImages는 배열이어야 합니다.',
        field: 'infoImages',
      };
    for (const img of updateData.infoImages) {
      if (typeof img !== 'string' || !isValidImageUrl(img)) {
        return {
          isValid: false,
          message: `'${img}'는 유효한 이미지 URL이 아닙니다.`,
          field: 'infoImages',
        };
      }
    }
  }

  if (updateData.tags !== undefined) {
    if (!Array.isArray(updateData.tags))
      return {
        isValid: false,
        message: 'tags는 배열이어야 합니다.',
        field: 'tags',
      };
    for (const tag of updateData.tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        return {
          isValid: false,
          message: `tags는 비어있지 않은 문자열이어야 합니다.`,
          field: 'tags',
        };
      }
    }
  }

  return { isValid: true, message: '업데이트 데이터 유효성 검증 통과' };
};
