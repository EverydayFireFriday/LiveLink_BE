import { ObjectId } from "mongodb";
import logger from "../../logger";

/**
 * 콘서트 데이터 유효성 검증 결과 인터페이스
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  field?: string;
}

/**
 * 콘서트 생성 데이터 유효성 검증 함수
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

  // location 필드 내용 검증 - string 배열로 변경
  for (let i = 0; i < concertData.location.length; i++) {
    const loc = concertData.location[i];
    if (typeof loc !== "string" || loc.trim().length === 0) {
      return {
        isValid: false,
        message: `location[${i}]는 비어있지 않은 문자열이어야 합니다.`,
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
      "rock/metal/indie", //락,메탈, 인디
      "jazz/soul", //재즈, 소울
      "rap/hiphop/edm", //랩, 힙합, 이디엠
      "idol", //아이돌
      "folk/trot", //포크, 트로트
      "RnB/ballad", //r&b, 발라드
      "tour", //내한
      "festival", //페스티벌
      "fan", //팬클럽, 팬미팅
      "other", //그외 장르(디너쇼, 토크, 강연...)
    ];

    for (let i = 0; i < concertData.category.length; i++) {
      const category = concertData.category[i];
      if (
        typeof category !== "string" ||
        !validCategories.includes(category)
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

  // infoImages 배열 검증 (info에서 infoImages로 변경됨)
  if (concertData.infoImages !== undefined) {
    if (!Array.isArray(concertData.infoImages)) {
      return {
        isValid: false,
        message: "infoImages는 배열이어야 합니다.",
        field: "infoImages",
      };
    }

    for (let i = 0; i < concertData.infoImages.length; i++) {
      const infoImage = concertData.infoImages[i];
      if (typeof infoImage !== "string" || infoImage.trim().length === 0) {
        return {
          isValid: false,
          message: `infoImages[${i}]는 비어있지 않은 문자열이어야 합니다.`,
          field: "infoImages",
        };
      }

      // 이미지 URL 유효성 검증
      if (!isValidImageUrl(infoImage)) {
        return {
          isValid: false,
          message: `infoImages[${i}]는 유효한 이미지 URL이어야 합니다.`,
          field: "infoImages",
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
 * 콘서트 업데이트 데이터 유효성 검증 함수 (새로 추가)
 * @param updateData 수정할 콘서트 데이터
 * @returns 유효성 검증 결과
 */
export const validateConcertUpdateData = (
  updateData: any
): ValidationResult => {
  // 빈 객체는 허용하지 않음
  if (!updateData || typeof updateData !== "object") {
    return {
      isValid: false,
      message: "업데이트 데이터가 올바르지 않습니다.",
    };
  }

  // 업데이트 가능한 필드들이 최소 하나는 있어야 함
  const updateableFields = [
    "title",
    "description",
    "status",
    "price",
    "ticketOpenDate",
    "posterImage",
    "infoImages", // info -> infoImages로 변경
    "tags",
    "datetime",
    "artist",
    "location",
    "category",
    "ticketLink",
  ];

  const hasUpdateableField = updateableFields.some((field) =>
    updateData.hasOwnProperty(field)
  );

  if (!hasUpdateableField) {
    return {
      isValid: false,
      message: "수정할 수 있는 필드가 최소 하나는 필요합니다.",
    };
  }

  // 수정 불가능한 필드들 체크 (경고만 출력, 검증은 통과)
  const readOnlyFields = ["uid", "likes", "likesCount", "_id", "createdAt"];
  const hasReadOnlyFields = readOnlyFields.some((field) =>
    updateData.hasOwnProperty(field)
  );

  if (hasReadOnlyFields) {
    const foundFields = readOnlyFields.filter((field) =>
      updateData.hasOwnProperty(field)
    );
    logger.warn(
      `수정 불가능한 필드가 포함되어 있습니다 (무시됨): ${foundFields.join(", ")}`
    );
  }

  // 각 필드별 개별 검증 (제공된 필드에 대해서만)

  // title 검증
  if (updateData.title !== undefined) {
    if (
      typeof updateData.title !== "string" ||
      updateData.title.trim().length === 0
    ) {
      return {
        isValid: false,
        message: "title은 비어있지 않은 문자열이어야 합니다.",
        field: "title",
      };
    }
  }

  // description 검증
  if (
    updateData.description !== undefined &&
    typeof updateData.description !== "string"
  ) {
    return {
      isValid: false,
      message: "description은 문자열이어야 합니다.",
      field: "description",
    };
  }

  // status 검증
  if (updateData.status !== undefined) {
    if (!isValidConcertStatus(updateData.status)) {
      return {
        isValid: false,
        message:
          "status는 upcoming, ongoing, completed, cancelled 중 하나여야 합니다.",
        field: "status",
      };
    }
  }

  // artist 배열 검증
  if (updateData.artist !== undefined) {
    if (!Array.isArray(updateData.artist)) {
      return {
        isValid: false,
        message: "artist는 배열이어야 합니다.",
        field: "artist",
      };
    }

    for (let i = 0; i < updateData.artist.length; i++) {
      const artist = updateData.artist[i];
      if (typeof artist !== "string" || artist.trim().length === 0) {
        return {
          isValid: false,
          message: `artist[${i}]는 비어있지 않은 문자열이어야 합니다.`,
          field: "artist",
        };
      }
    }
  }

  // location 배열 검증 - string 배열로 변경
  if (updateData.location !== undefined) {
    if (!Array.isArray(updateData.location)) {
      return {
        isValid: false,
        message: "location은 배열이어야 합니다.",
        field: "location",
      };
    }

    if (updateData.location.length === 0) {
      return {
        isValid: false,
        message: "location 배열은 비어있을 수 없습니다.",
        field: "location",
      };
    }

    for (let i = 0; i < updateData.location.length; i++) {
      const loc = updateData.location[i];
      if (typeof loc !== "string" || loc.trim().length === 0) {
        return {
          isValid: false,
          message: `location[${i}]는 비어있지 않은 문자열이어야 합니다.`,
          field: "location",
        };
      }
    }
  }

  // datetime 배열 검증
  if (updateData.datetime !== undefined) {
    if (!Array.isArray(updateData.datetime)) {
      return {
        isValid: false,
        message: "datetime은 배열이어야 합니다.",
        field: "datetime",
      };
    }

    if (updateData.datetime.length === 0) {
      return {
        isValid: false,
        message: "datetime 배열은 비어있을 수 없습니다.",
        field: "datetime",
      };
    }

    for (let i = 0; i < updateData.datetime.length; i++) {
      const dt = updateData.datetime[i];
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
  }

  // price 배열 검증
  if (updateData.price !== undefined) {
    if (!Array.isArray(updateData.price)) {
      return {
        isValid: false,
        message: "price는 배열이어야 합니다.",
        field: "price",
      };
    }

    for (let i = 0; i < updateData.price.length; i++) {
      const price = updateData.price[i];
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

  // category 배열 검증
  if (updateData.category !== undefined) {
    if (!Array.isArray(updateData.category)) {
      return {
        isValid: false,
        message: "category는 배열이어야 합니다.",
        field: "category",
      };
    }

    const validCategories = [
      "rock/metal/indie", //락,메탈, 인디
      "jazz/soul", //재즈, 소울
      "rap/hiphop/edm", //랩, 힙합, 이디엠
      "idol", //아이돌
      "folk/trot", //포크, 트로트
      "RnB/ballad", //r&b, 발라드
      "korea", //내한
      "festival", //페스티벌
      "fan", //팬클럽, 팬미팅
      "other", //그외 장르(디너쇼, 토크, 강연...)
    ];

    for (let i = 0; i < updateData.category.length; i++) {
      const category = updateData.category[i];
      if (
        typeof category !== "string" ||
        !validCategories.includes(category)
      ) {
        return {
          isValid: false,
          message: `category[${i}]는 유효한 카테고리여야 합니다. 허용된 값: ${validCategories.join(", ")}`,
          field: "category",
        };
      }
    }
  }

  // ticketLink 배열 검증
  if (updateData.ticketLink !== undefined) {
    if (!Array.isArray(updateData.ticketLink)) {
      return {
        isValid: false,
        message: "ticketLink는 배열이어야 합니다.",
        field: "ticketLink",
      };
    }

    for (let i = 0; i < updateData.ticketLink.length; i++) {
      const link = updateData.ticketLink[i];
      if (!link || typeof link !== "object") {
        return {
          isValid: false,
          message: `ticketLink[${i}]는 객체여야 합니다.`,
          field: "ticketLink",
        };
      }

      if (
        link.platform &&
        (typeof link.platform !== "string" || link.platform.trim().length === 0)
      ) {
        return {
          isValid: false,
          message: `ticketLink[${i}].platform은 비어있지 않은 문자열이어야 합니다.`,
          field: "ticketLink",
        };
      }

      if (
        link.url &&
        (typeof link.url !== "string" || link.url.trim().length === 0)
      ) {
        return {
          isValid: false,
          message: `ticketLink[${i}].url은 비어있지 않은 문자열이어야 합니다.`,
          field: "ticketLink",
        };
      }
    }
  }

  // ticketOpenDate 검증
  if (updateData.ticketOpenDate !== undefined) {
    if (
      typeof updateData.ticketOpenDate !== "string" ||
      !Date.parse(updateData.ticketOpenDate)
    ) {
      return {
        isValid: false,
        message: "ticketOpenDate는 유효한 날짜 형식의 문자열이어야 합니다.",
        field: "ticketOpenDate",
      };
    }
  }

  // posterImage 검증
  if (updateData.posterImage !== undefined) {
    if (typeof updateData.posterImage !== "string") {
      return {
        isValid: false,
        message: "posterImage는 문자열이어야 합니다.",
        field: "posterImage",
      };
    }

    if (
      updateData.posterImage.trim().length > 0 &&
      !isValidImageUrl(updateData.posterImage)
    ) {
      return {
        isValid: false,
        message: "posterImage는 유효한 이미지 URL이어야 합니다.",
        field: "posterImage",
      };
    }
  }

  // infoImages 배열 검증 (info에서 infoImages로 변경됨)
  if (updateData.infoImages !== undefined) {
    if (!Array.isArray(updateData.infoImages)) {
      return {
        isValid: false,
        message: "infoImages는 배열이어야 합니다.",
        field: "infoImages",
      };
    }

    for (let i = 0; i < updateData.infoImages.length; i++) {
      const infoImage = updateData.infoImages[i];
      if (typeof infoImage !== "string" || infoImage.trim().length === 0) {
        return {
          isValid: false,
          message: `infoImages[${i}]는 비어있지 않은 문자열이어야 합니다.`,
          field: "infoImages",
        };
      }

      // 이미지 URL 유효성 검증
      if (!isValidImageUrl(infoImage)) {
        return {
          isValid: false,
          message: `infoImages[${i}]는 유효한 이미지 URL이어야 합니다.`,
          field: "infoImages",
        };
      }
    }
  }

  // tags 배열 검증
  if (updateData.tags !== undefined) {
    if (!Array.isArray(updateData.tags)) {
      return {
        isValid: false,
        message: "tags는 배열이어야 합니다.",
        field: "tags",
      };
    }

    for (let i = 0; i < updateData.tags.length; i++) {
      const tag = updateData.tags[i];
      if (typeof tag !== "string" || tag.trim().length === 0) {
        return {
          isValid: false,
          message: `tags[${i}]는 비어있지 않은 문자열이어야 합니다.`,
          field: "tags",
        };
      }
    }
  }

  return {
    isValid: true,
    message: "업데이트 데이터 유효성 검증 통과",
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
      logger.warn(
        `UID에서 timestamp를 찾을 수 없음: ${uid}, 새로운 ObjectId 생성`
      );
      return new ObjectId();
    }
  } catch (error) {
    logger.warn(
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
    "rock/metal/indie", //락,메탈, 인디
    "jazz/soul", //재즈, 소울
    "rap/hiphop/edm", //랩, 힙합, 이디엠
    "idol", //아이돌
    "folk/trot", //포크, 트로트
    "RnB/ballad", //r&b, 발라드
    "korea", //내한
    "festival", //페스티벌
    "fan", //팬클럽, 팬미팅
    "other", //그외 장르(디너쇼, 토크, 강연...)
  ];
  return validCategories.includes(category);
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
      ? rawData.location.filter((l: string) => l && l.trim().length > 0) // string 배열로 변경
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
    infoImages: Array.isArray(rawData.infoImages) // info -> infoImages로 변경
      ? rawData.infoImages.filter((i: string) => i && i.trim().length > 0)
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

  return query.trim();
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
