import {
  ValidationResult,
  isValidImageUrl,
  isValidMusicCategory,
  isValidConcertStatus,
} from './ConcertValidationUtils';
import { validCategories } from '../base/ConcertEnums';

/**
 * 콘서트 생성 데이터 유효성 검증 함수
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateConcertData = (concertData: any): ValidationResult => {
  if (!concertData.uid)
    return { isValid: false, message: 'uid 필드가 필수입니다.', field: 'uid' };
  if (!concertData.title)
    return {
      isValid: false,
      message: 'title 필드가 필수입니다.',
      field: 'title',
    };
  if (!concertData.location)
    return {
      isValid: false,
      message: 'location 필드가 필수입니다.',
      field: 'location',
    };
  // datetime은 선택적 필드 (날짜 미정인 경우 빈 배열 허용)

  if (
    typeof concertData.uid !== 'string' ||
    concertData.uid.trim().length === 0
  ) {
    return {
      isValid: false,
      message: 'uid는 비어있지 않은 문자열이어야 합니다.',
      field: 'uid',
    };
  }

  if (
    typeof concertData.title !== 'string' ||
    concertData.title.trim().length === 0
  ) {
    return {
      isValid: false,
      message: 'title은 비어있지 않은 문자열이어야 합니다.',
      field: 'title',
    };
  }

  if (concertData.artist !== undefined && !Array.isArray(concertData.artist)) {
    return {
      isValid: false,
      message: 'artist는 배열이어야 합니다.',
      field: 'artist',
    };
  }

  if (
    !Array.isArray(concertData.location) ||
    concertData.location.length === 0
  ) {
    return {
      isValid: false,
      message: 'location은 비어있지 않은 배열이어야 합니다.',
      field: 'location',
    };
  }

  // datetime은 선택적이지만, 제공되면 배열이어야 함 (빈 배열 허용)
  if (
    concertData.datetime !== undefined &&
    !Array.isArray(concertData.datetime)
  ) {
    return {
      isValid: false,
      message: 'datetime은 배열이어야 합니다.',
      field: 'datetime',
    };
  }

  for (let i = 0; i < concertData.location.length; i++) {
    const loc = concertData.location[i];
    if (typeof loc !== 'string' || loc.trim().length === 0) {
      return {
        isValid: false,
        message: `location[${i}]는 비어있지 않은 문자열이어야 합니다.`,
        field: 'location',
      };
    }
  }

  // datetime이 있고 비어있지 않은 경우에만 검증
  if (concertData.datetime && concertData.datetime.length > 0) {
    for (let i = 0; i < concertData.datetime.length; i++) {
      const dt = concertData.datetime[i];
      if (!dt || typeof dt !== 'string' || !Date.parse(dt)) {
        return {
          isValid: false,
          message: `datetime[${i}]는 유효한 날짜 형식이어야 합니다.`,
          field: 'datetime',
        };
      }
    }
  }

  if (concertData.artist && Array.isArray(concertData.artist)) {
    for (let i = 0; i < concertData.artist.length; i++) {
      const artist = concertData.artist[i];
      if (typeof artist !== 'string' || artist.trim().length === 0) {
        return {
          isValid: false,
          message: `artist[${i}]는 비어있지 않은 문자열이어야 합니다.`,
          field: 'artist',
        };
      }
    }
  }

  if (concertData.price !== undefined) {
    if (!Array.isArray(concertData.price)) {
      return {
        isValid: false,
        message: 'price는 배열이어야 합니다.',
        field: 'price',
      };
    }
    for (const p of concertData.price) {
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

  if (concertData.category !== undefined) {
    if (!Array.isArray(concertData.category)) {
      return {
        isValid: false,
        message: 'category는 배열이어야 합니다.',
        field: 'category',
      };
    }
    for (const c of concertData.category) {
      if (typeof c !== 'string' || !validCategories.includes(c)) {
        return {
          isValid: false,
          message: `'${c}'는 유효한 카테고리가 아닙니다.`,
          field: 'category',
        };
      }
    }
  }

  if (concertData.ticketOpenDate !== undefined) {
    if (!Array.isArray(concertData.ticketOpenDate)) {
      return {
        isValid: false,
        message: 'ticketOpenDate는 배열이어야 합니다.',
        field: 'ticketOpenDate',
      };
    }
    for (const item of concertData.ticketOpenDate) {
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

  if (concertData.infoImages !== undefined) {
    if (!Array.isArray(concertData.infoImages)) {
      return {
        isValid: false,
        message: 'infoImages는 배열이어야 합니다.',
        field: 'infoImages',
      };
    }
    for (const img of concertData.infoImages) {
      if (typeof img !== 'string' || !isValidImageUrl(img)) {
        return {
          isValid: false,
          message: `'${img}'는 유효한 이미지 URL이 아닙니다.`,
          field: 'infoImages',
        };
      }
    }
  }

  if (concertData.posterImage !== undefined) {
    if (
      typeof concertData.posterImage !== 'string' ||
      (concertData.posterImage.trim().length > 0 &&
        !isValidImageUrl(concertData.posterImage))
    ) {
      return {
        isValid: false,
        message: 'posterImage는 유효한 이미지 URL이어야 합니다.',
        field: 'posterImage',
      };
    }
  }

  return { isValid: true, message: '유효성 검증 통과' };
};

/**
 * 콘서트 데이터 정규화 함수
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalizeConcertData = (rawData: any): any => {
  return {
    uid: rawData.uid?.trim(),
    title: rawData.title?.trim(),
    artist: Array.isArray(rawData.artist)
      ? rawData.artist.filter((a: string) => a && a.trim().length > 0)
      : [],
    location: Array.isArray(rawData.location)
      ? rawData.location.filter((l: string) => l && l.trim().length > 0)
      : [],
    datetime: Array.isArray(rawData.datetime) ? rawData.datetime : [],
    price: Array.isArray(rawData.price) ? rawData.price : [],
    description: rawData.description?.trim() || '',
    category: Array.isArray(rawData.category)
      ? rawData.category.filter((c: string) => c && isValidMusicCategory(c))
      : [],
    ticketLink: Array.isArray(rawData.ticketLink) ? rawData.ticketLink : [],
    ticketOpenDate: Array.isArray(rawData.ticketOpenDate)
      ? rawData.ticketOpenDate.map((item: any) => ({
          openTitle: item.openTitle,
          openDate: new Date(item.openDate),
        }))
      : undefined,
    posterImage: rawData.posterImage?.trim() || '',
    infoImages: Array.isArray(rawData.infoImages)
      ? rawData.infoImages.filter((i: string) => i && i.trim().length > 0)
      : [],
    tags: Array.isArray(rawData.tags)
      ? rawData.tags.filter((t: string) => t && t.trim().length > 0)
      : [],
    status: isValidConcertStatus(rawData.status) ? rawData.status : 'upcoming',
    likes: [],
    likesCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
