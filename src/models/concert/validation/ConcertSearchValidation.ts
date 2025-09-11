/**
 * 페이지네이션 파라미터 유효성 검증 및 정규화 함수
 */
export const validateAndNormalizePagination = (page: any, limit: any): { page: number; limit: number; skip: number } => {
  let normalizedPage = 1;
  let normalizedLimit = 20;

  if (page !== undefined) {
    const pageNum = parseInt(page as string);
    if (!isNaN(pageNum) && pageNum > 0) {
      normalizedPage = pageNum;
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
      normalizedLimit = limitNum;
    }
  }

  const skip = (normalizedPage - 1) * normalizedLimit;
  return { page: normalizedPage, limit: normalizedLimit, skip };
};

/**
 * 정렬 파라미터 유효성 검증 함수
 */
export const isValidSortBy = (sortBy: string): boolean => {
  const validSortOptions = ['date', 'likes', 'created', 'title', 'artist'];
  return validSortOptions.includes(sortBy);
};

/**
 * 검색어 정규화 함수
 */
export const normalizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== 'string') {
    return '';
  }
  return query.trim();
};

/**
 * 배치 크기 유효성 검증 및 정규화 함수
 */
export const validateAndNormalizeBatchSize = (batchSize: any, defaultSize: number = 100, maxSize: number = 1000): number => {
  if (batchSize === undefined) {
    return defaultSize;
  }
  const size = parseInt(batchSize as string);
  if (isNaN(size) || size < 1) {
    return defaultSize;
  }
  return Math.min(size, maxSize);
};
