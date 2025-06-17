import { ObjectId } from "mongodb";

/**
 * 콘서트 데이터 유효성 검증 결과 인터페이스
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  field?: string;
}

/**
 * 콘서트 데이터 유효성 검증 함수
 * @param concertData 검증할 콘서트 데이터
 * @returns 유효성 검증 결과
 */
export const validateConcertData = (concertData: any): ValidationResult => {
  // 필수 필드 검증
  if (!concertData.uid) {
    return {
      isValid: false,
      message: "uid 필드가 필수입니다.",
      field: "uid",
    };
  }

  if (!concertData.title) {
    return {
      isValid: false,
      message: "title 필드가 필수입니다.",
      field: "title",
    };
  }

  if (!concertData.location) {
    return {
      isValid: false,
      message: "location 필드가 필수입니다.",
      field: "location",
    };
  }

  if (!concertData.datetime) {
    return {
      isValid: false,
      message: "datetime 필드가 필수입니다.",
      field: "datetime",
    };
  }

  // 타입 검증
  if (
    typeof concertData.uid !== "string" ||
    concertData.uid.trim().length === 0
  ) {
    return {
      isValid: false,
      message: "uid는 비어있지 않은 문자열이어야 합니다.",
      field: "uid",
    };
  }

  if (
    typeof concertData.title !== "string" ||
    concertData.title.trim().length === 0
  ) {
    return {
      isValid: false,
      message: "title은 비어있지 않은 문자열이어야 합니다.",
      field: "title",
    };
  }

  // 배열 필드 검증
  if (concertData.artist !== undefined && !Array.isArray(concertData.artist)) {
    return {
      isValid: false,
      message: "artist는 배열이어야 합니다.",
      field: "artist",
    };
  }

  if (!Array.isArray(concertData.location)) {
    return {
      isValid: false,
      message: "location은 배열이어야 합니다.",
      field: "location",
    };
  }

  if (concertData.location.length === 0) {
    return {
      isValid: false,
      message: "location 배열은 비어있을 수 없습니다.",
      field: "location",
    };
  }

  if (!Array.isArray(concertData.datetime)) {
    return {
      isValid: false,
      message: "datetime은 배열이어야 합니다.",
      field: "datetime",
    };
  }

  if (concertData.datetime.length === 0) {
    return {
      isValid: false,
      message: "datetime 배열은 비어있을 수 없습니다.",
      field: "datetime",
    };
  }

  // location 필드 내용 검증
  for (let i = 0; i < concertData.location.length; i++) {
    const loc = concertData.location[i];
    if (!loc || typeof loc !== "object") {
      return {
        isValid: false,
        message: `location[${i}]는 객체여야 합니다.`,
        field: "location",
      };
    }

    if (
      !loc.location ||
      typeof loc.location !== "string" ||
      loc.location.trim().length === 0
    ) {
      return {
        isValid: false,
        message: `location[${i}].location은 비어있지 않은 문자열이어야 합니다.`,
        field: "location",
      };
    }
  }

  // datetime 형식 검증
  for (let i = 0; i < concertData.datetime.length; i++) {
    const dt = concertData.datetime[i];
    if (!dt || typeof dt !== "string") {
      return {
        isValid: false,
        message: `datetime[${i}]는 문자열이어야 합니다.`,
        field: "datetime",
      };
    }

    if (!Date.parse(dt)) {
      return {
        isValid: false,
        message: `datetime[${i}]는 유효한 날짜 형식이어야 합니다.`,
        field: "datetime",
      };
    }
  }

  // artist 배열 내용 검증 (선택적 필드)
  if (concertData.artist && Array.isArray(concertData.artist)) {
    for (let i = 0; i < concertData.artist.length; i++) {
      const artist = concertData.artist[i];
      if (typeof artist !== "string" || artist.trim().length === 0) {
        return {
          isValid: false,
          message: `artist[${i}]는 비어있지 않은 문자열이어야 합니다.`,
          field: "artist",
        };
      }
    }
  }

  // price 배열 검증 (선택적 필드)
  if (concertData.price !== undefined) {
    if (!Array.isArray(concertData.price)) {
      return {
        isValid: false,
        message: "price는 배열이어야 합니다.",
        field: "price",
      };
    }

    for (let i = 0; i < concertData.price.length; i++) {
      const price = concertData.price[i];
      if (!price || typeof price !== "object") {
        return {
          isValid: false,
          message: `price[${i}]는 객체여야 합니다.`,
          field: "price",
        };
      }

      if (
        price.tier &&
        (typeof price.tier !== "string" || price.tier.trim().length === 0)
      ) {
        return {
          isValid: false,
          message: `price[${i}].tier는 비어있지 않은 문자열이어야 합니다.`,
          field: "price",
        };
      }

      if (
        price.amount !== undefined &&
        (typeof price.amount !== "number" || price.amount < 0)
      ) {
        return {
          isValid: false,
          message: `price[${i}].amount는 0 이상의 숫자여야 합니다.`,
          field: "price",
        };
      }
    }
  }

  // category 배열 검증 (선택적 필드)
  if (concertData.category !== undefined) {
    if (!Array.isArray(concertData.category)) {
      return {
        isValid: false,
        message: "category는 배열이어야 합니다.",
        field: "category",
      };
    }

    const validCategories = [
      "pop",
      "rock",
      "jazz",
      "classical",
      "hiphop",
      "electronic",
      "indie",
      "folk",
      "r&b",
      "country",
      "musical",
      "opera",
      "other",
    ];

    for (let i = 0; i < concertData.category.length; i++) {
      const category = concertData.category[i];
      if (
        typeof category !== "string" ||
        !validCategories.includes(category.toLowerCase())
      ) {
        return {
          isValid: false,
          message: `category[${i}]는 유효한 카테고리여야 합니다. 허용된 값: ${validCategories.join(", ")}`,
          field: "category",
        };
      }
    }
  }

  // ticketOpenDate 검증 (선택적 필드)
  if (concertData.ticketOpenDate !== undefined) {
    if (
      typeof concertData.ticketOpenDate !== "string" ||
      !Date.parse(concertData.ticketOpenDate)
    ) {
      return {
        isValid: false,
        message: "ticketOpenDate는 유효한 날짜 형식의 문자열이어야 합니다.",
        field: "ticketOpenDate",
      };
    }
  }

  // info 배열 검증 (선택적 필드)
  if (concertData.info !== undefined) {
    if (!Array.isArray(concertData.info)) {
      return {
        isValid: false,
        message: "info는 배열이어야 합니다.",
        field: "info",
      };
    }

    for (let i = 0; i < concertData.info.length; i++) {
      const infoItem = concertData.info[i];
      if (typeof infoItem !== "string" || infoItem.trim().length === 0) {
        return {
          isValid: false,
          message: `info[${i}]는 비어있지 않은 문자열이어야 합니다.`,
          field: "info",
        };
      }
    }
  }

  // tags 배열 검증 (선택적 필드)
  if (concertData.tags !== undefined) {
    if (!Array.isArray(concertData.tags)) {
      return {
        isValid: false,
        message: "tags는 배열이어야 합니다.",
        field: "tags",
      };
    }

    for (let i = 0; i < concertData.tags.length; i++) {
      const tag = concertData.tags[i];
      if (typeof tag !== "string" || tag.trim().length === 0) {
        return {
          isValid: false,
          message: `tags[${i}]는 비어있지 않은 문자열이어야 합니다.`,
          field: "tags",
        };
      }
    }
  }

  // description 검증 (선택적 필드)
  if (
    concertData.description !== undefined &&
    typeof concertData.description !== "string"
  ) {
    return {
      isValid: false,
      message: "description은 문자열이어야 합니다.",
      field: "description",
    };
  }

  // posterImage 검증 (선택적 필드)
  if (concertData.posterImage !== undefined) {
    if (typeof concertData.posterImage !== "string") {
      return {
        isValid: false,
        message: "posterImage는 문자열이어야 합니다.",
        field: "posterImage",
      };
    }

    if (
      concertData.posterImage.trim().length > 0 &&
      !isValidImageUrl(concertData.posterImage)
    ) {
      return {
        isValid: false,
        message: "posterImage는 유효한 이미지 URL이어야 합니다.",
        field: "posterImage",
      };
    }
  }

  return {
    isValid: true,
    message: "유효성 검증 통과",
  };
};

/**
 * UID에서 ObjectId 생성 함수
 * @param uid 사용자 지정 ID (timestamp 포함)
 * @returns MongoDB ObjectId
 */
export const generateObjectIdFromUid = (uid: string): ObjectId => {
  try {
    // UID에서 13자리 timestamp 추출 (milliseconds)
    const timestampMatch = uid.match(/(\d{13})/);

    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]);
      // milliseconds를 seconds로 변환
      const timestampInSeconds = Math.floor(timestamp / 1000);
      return new ObjectId(timestampInSeconds);
    } else {
      // timestamp를 찾을 수 없으면 새로운 ObjectId 생성
      console.warn(
        `UID에서 timestamp를 찾을 수 없음: ${uid}, 새로운 ObjectId 생성`
      );
      return new ObjectId();
    }
  } catch (error) {
    console.warn(
      `UID를 ObjectId로 변환 실패: ${uid}, 새로운 ObjectId 생성`,
      error
    );
    return new ObjectId();
  }
};

/**
 * 이미지 URL 유효성 검증 함수
 * @param url 검증할 이미지 URL
 * @returns 유효한 이미지 URL인지 여부
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") {
    return false;
  }

  // URL이 비어있으면 유효하지 않음
  if (url.trim().length === 0) {
    return false;
  }

  // S3 URL 패턴
  const s3UrlPattern =
    /^https:\/\/[\w.-]+\.s3\.[\w.-]+\.amazonaws\.com\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

  // 일반적인 이미지 URL 패턴
  const generalUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

  return s3UrlPattern.test(url) || generalUrlPattern.test(url);
};

/**
 * 콘서트 상태 유효성 검증 함수
 * @param status 검증할 상태
 * @returns 유효한 상태인지 여부
 */
export const isValidConcertStatus = (status: string): boolean => {
  const validStatuses = ["upcoming", "ongoing", "completed", "cancelled"];
  return validStatuses.includes(status);
};

/**
 * 음악 카테고리 유효성 검증 함수
 * @param category 검증할 카테고리
 * @returns 유효한 카테고리인지 여부
 */
export const isValidMusicCategory = (category: string): boolean => {
  const validCategories = [
    "pop",
    "rock",
    "jazz",
    "classical",
    "hiphop",
    "electronic",
    "indie",
    "folk",
    "r&b",
    "country",
    "musical",
    "opera",
    "other",
  ];
  return validCategories.includes(category.toLowerCase());
};

/**
 * 페이지네이션 파라미터 유효성 검증 및 정규화 함수
 * @param page 페이지 번호
 * @param limit 페이지당 항목 수
 * @returns 정규화된 페이지네이션 파라미터
 */
export const validateAndNormalizePagination = (
  page: any,
  limit: any
): { page: number; limit: number; skip: number } => {
  // 기본값 설정
  let normalizedPage = 1;
  let normalizedLimit = 20;

  // page 검증 및 정규화
  if (page !== undefined) {
    const pageNum = parseInt(page as string);
    if (!isNaN(pageNum) && pageNum > 0) {
      normalizedPage = pageNum;
    }
  }

  // limit 검증 및 정규화
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
      normalizedLimit = limitNum;
    }
  }

  const skip = (normalizedPage - 1) * normalizedLimit;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip,
  };
};

/**
 * 날짜 문자열 유효성 검증 함수
 * @param dateString 검증할 날짜 문자열
 * @returns 유효한 날짜 문자열인지 여부
 */
export const isValidDateString = (dateString: string): boolean => {
  if (!dateString || typeof dateString !== "string") {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() !== "Invalid Date";
};

/**
 * 정렬 파라미터 유효성 검증 함수
 * @param sortBy 정렬 기준
 * @returns 유효한 정렬 기준인지 여부
 */
export const isValidSortBy = (sortBy: string): boolean => {
  const validSortOptions = ["date", "likes", "created", "title", "artist"];
  return validSortOptions.includes(sortBy);
};

/**
 * 배치 크기 유효성 검증 및 정규화 함수
 * @param batchSize 배치 크기
 * @param defaultSize 기본 크기
 * @param maxSize 최대 크기
 * @returns 정규화된 배치 크기
 */
export const validateAndNormalizeBatchSize = (
  batchSize: any,
  defaultSize: number = 100,
  maxSize: number = 1000
): number => {
  if (batchSize === undefined) {
    return defaultSize;
  }

  const size = parseInt(batchSize as string);
  if (isNaN(size) || size < 1) {
    return defaultSize;
  }

  return Math.min(size, maxSize);
};

/**
 * 콘서트 데이터 정규화 함수
 * @param rawData 원본 콘서트 데이터
 * @returns 정규화된 콘서트 데이터
 */
export const normalizeConcertData = (rawData: any): any => {
  const normalized: any = {
    uid: rawData.uid?.trim(),
    title: rawData.title?.trim(),
    artist: Array.isArray(rawData.artist)
      ? rawData.artist.filter((a: string) => a && a.trim().length > 0)
      : rawData.artist
        ? [rawData.artist.trim()]
        : [],
    location: Array.isArray(rawData.location)
      ? rawData.location
      : [rawData.location],
    datetime: Array.isArray(rawData.datetime)
      ? rawData.datetime
      : [rawData.datetime],
    price: Array.isArray(rawData.price)
      ? rawData.price
      : rawData.price
        ? [rawData.price]
        : [],
    description: rawData.description?.trim() || "",
    category: Array.isArray(rawData.category)
      ? rawData.category.filter((c: string) => c && isValidMusicCategory(c))
      : rawData.category && isValidMusicCategory(rawData.category)
        ? [rawData.category]
        : [],
    ticketLink: Array.isArray(rawData.ticketLink)
      ? rawData.ticketLink
      : rawData.ticketLink
        ? [rawData.ticketLink]
        : [],
    ticketOpenDate: rawData.ticketOpenDate
      ? new Date(rawData.ticketOpenDate)
      : undefined,
    posterImage: rawData.posterImage?.trim() || "",
    info: Array.isArray(rawData.info)
      ? rawData.info.filter((i: string) => i && i.trim().length > 0)
      : [],
    tags: Array.isArray(rawData.tags)
      ? rawData.tags.filter((t: string) => t && t.trim().length > 0)
      : [],
    status: isValidConcertStatus(rawData.status) ? rawData.status : "upcoming",
    likes: [],
    likesCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return normalized;
};

/**
 * 검색어 정규화 함수
 * @param query 원본 검색어
 * @returns 정규화된 검색어
 */
export const normalizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== "string") {
    return "";
  }

  return query.trim().toLowerCase();
};

/**
 * 유효성 검증 에러 메시지 포맷팅 함수
 * @param result 유효성 검증 결과
 * @returns 포맷된 에러 메시지
 */
export const formatValidationError = (result: ValidationResult): string => {
  if (result.isValid) {
    return "";
  }

  return result.field
    ? `[${result.field}] ${result.message}`
    : result.message || "유효성 검증 실패";
};
