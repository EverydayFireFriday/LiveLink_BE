/**
 * Cache Configuration
 * 캐시 TTL 설정 및 캐시 전략 정의
 */

export const CacheTTL = {
  // 단기 캐시 (자주 변경되는 데이터)
  SHORT: 60, // 1분
  MEDIUM: 300, // 5분
  LONG: 3600, // 1시간

  // 사용자 관련
  USER_PROFILE: 3600, // 1시간 - 프로필은 자주 변경되지 않음
  USER_SESSION: 1800, // 30분 - 세션 데이터

  // 게시글 관련
  ARTICLE_LIST: 300, // 5분 - 게시글 목록은 자주 갱신
  ARTICLE_DETAIL: 600, // 10분 - 게시글 상세는 조금 더 길게
  ARTICLE_POPULAR: 600, // 10분 - 인기 게시글

  // 콘서트 관련
  CONCERT_LIST: 1800, // 30분 - 콘서트 목록은 자주 변경되지 않음
  CONCERT_DETAIL: 3600, // 1시간 - 콘서트 상세 정보
  CONCERT_POPULAR: 1800, // 30분 - 인기 콘서트

  // 카테고리 및 태그 (거의 변경되지 않음)
  CATEGORIES: 86400, // 24시간
  TAGS: 86400, // 24시간
  TAG_POPULAR: 3600, // 1시간 - 인기 태그는 더 짧게

  // 통계 데이터
  STATS_LIKES: 300, // 5분 - 좋아요 수 등 집계 데이터
  STATS_BOOKMARKS: 300, // 5분 - 북마크 수 등 집계 데이터
  STATS_VIEWS: 180, // 3분 - 조회수 (더 자주 갱신)

  // 검색 결과
  SEARCH_RESULTS: 600, // 10분

  // 알림
  NOTIFICATIONS: 60, // 1분 - 실시간성이 중요
} as const;

/**
 * Cache Key Prefixes
 * 캐시 키 접두사 정의 (일관된 네이밍)
 */
export const CachePrefix = {
  USER: 'user',
  ARTICLE: 'articles',
  CONCERT: 'concerts',
  CATEGORY: 'categories',
  TAG: 'tags',
  STATS: 'stats',
  SEARCH: 'search',
  NOTIFICATION: 'notifications',
} as const;

/**
 * Cache Invalidation Patterns
 * 캐시 무효화 패턴 정의
 */
export const CacheInvalidationPatterns = {
  // 사용자 관련
  USER_ALL: (userId: string) => `${CachePrefix.USER}:${userId}*`,
  USER_PROFILE: (userId: string) => `${CachePrefix.USER}:${userId}`,

  // 게시글 관련
  ARTICLE_ALL: () => `${CachePrefix.ARTICLE}:*`,
  ARTICLE_BY_ID: (articleId: string) => `${CachePrefix.ARTICLE}:${articleId}*`,
  ARTICLE_BY_AUTHOR: (authorId: string) =>
    `${CachePrefix.ARTICLE}:*author=${authorId}*`,
  ARTICLE_LIST: () => `${CachePrefix.ARTICLE}:list:*`,

  // 콘서트 관련
  CONCERT_ALL: () => `${CachePrefix.CONCERT}:*`,
  CONCERT_BY_ID: (concertId: string) =>
    `${CachePrefix.CONCERT}:${concertId}*`,
  CONCERT_LIST: () => `${CachePrefix.CONCERT}:list:*`,

  // 통계 관련
  STATS_ALL: () => `${CachePrefix.STATS}:*`,
  STATS_ARTICLE: (articleId: string) =>
    `${CachePrefix.STATS}:article:${articleId}*`,
  STATS_CONCERT: (concertId: string) =>
    `${CachePrefix.STATS}:concert:${concertId}*`,
} as const;

/**
 * Cache Strategy
 * 캐싱 전략 정의
 */
export enum CacheStrategy {
  // Cache-Aside: 요청 시 캐시 확인 후 없으면 DB 조회 후 캐시 저장
  CACHE_ASIDE = 'cache-aside',

  // Write-Through: 쓰기 시 캐시와 DB 동시 업데이트
  WRITE_THROUGH = 'write-through',

  // Write-Behind: 쓰기 시 캐시만 업데이트, DB는 비동기로 업데이트
  WRITE_BEHIND = 'write-behind',

  // Refresh-Ahead: 만료 전에 미리 새로고침
  REFRESH_AHEAD = 'refresh-ahead',
}

/**
 * 캐시 워밍 대상 데이터 정의
 */
export const CacheWarmingTargets = {
  // 서버 시작 시 미리 로드할 데이터
  STARTUP: [
    { type: 'categories', ttl: CacheTTL.CATEGORIES },
    { type: 'popularTags', ttl: CacheTTL.TAG_POPULAR },
    { type: 'popularArticles', ttl: CacheTTL.ARTICLE_POPULAR },
    { type: 'upcomingConcerts', ttl: CacheTTL.CONCERT_LIST },
  ],

  // 주기적으로 갱신할 데이터
  PERIODIC: [
    {
      type: 'popularArticles',
      interval: CacheTTL.ARTICLE_POPULAR * 1000,
      ttl: CacheTTL.ARTICLE_POPULAR,
    },
    {
      type: 'popularConcerts',
      interval: CacheTTL.CONCERT_POPULAR * 1000,
      ttl: CacheTTL.CONCERT_POPULAR,
    },
  ],
} as const;

/**
 * 데이터 타입별 캐시 설정
 */
export const CacheSettings = {
  user: {
    ttl: CacheTTL.USER_PROFILE,
    strategy: CacheStrategy.CACHE_ASIDE,
  },
  article: {
    ttl: CacheTTL.ARTICLE_LIST,
    strategy: CacheStrategy.CACHE_ASIDE,
  },
  concert: {
    ttl: CacheTTL.CONCERT_LIST,
    strategy: CacheStrategy.CACHE_ASIDE,
  },
  category: {
    ttl: CacheTTL.CATEGORIES,
    strategy: CacheStrategy.CACHE_ASIDE,
  },
  tag: {
    ttl: CacheTTL.TAGS,
    strategy: CacheStrategy.CACHE_ASIDE,
  },
  stats: {
    ttl: CacheTTL.STATS_LIKES,
    strategy: CacheStrategy.CACHE_ASIDE,
  },
} as const;
