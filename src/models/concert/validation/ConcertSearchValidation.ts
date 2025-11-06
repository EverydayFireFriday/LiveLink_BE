/**
 * 페이지네이션 파라미터 유효성 검증 및 정규화 함수
 */
export const validateAndNormalizePagination = (
  page: string | number | undefined,
  limit: string | number | undefined,
): { page: number; limit: number; skip: number } => {
  let normalizedPage = 1;
  let normalizedLimit = 20;

  if (page !== undefined) {
    const pageNum = typeof page === 'number' ? page : parseInt(page);
    if (!isNaN(pageNum) && pageNum > 0) {
      normalizedPage = pageNum;
    }
  }

  if (limit !== undefined) {
    const limitNum = typeof limit === 'number' ? limit : parseInt(limit);
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
  const validSortOptions = [
    'upcoming_soon',
    'likes',
    'created',
    'ticket_soon',
    'title',
    'artist',
  ];
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
export const validateAndNormalizeBatchSize = (
  batchSize: string | number | undefined,
  defaultSize: number = 100,
  maxSize: number = 1000,
): number => {
  if (batchSize === undefined) {
    return defaultSize;
  }
  const size = typeof batchSize === 'number' ? batchSize : parseInt(batchSize);
  if (isNaN(size) || size < 1) {
    return defaultSize;
  }
  return Math.min(size, maxSize);
};
