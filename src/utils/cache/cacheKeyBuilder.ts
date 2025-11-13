import { CachePrefix } from './cacheConfig';

/**
 * Cache Key Builder
 * 일관된 캐시 키 생성을 위한 유틸리티
 */

interface KeyParams {
  [key: string]: string | number | boolean | undefined | null;
}

export class CacheKeyBuilder {
  /**
   * 캐시 키 생성 (파라미터를 정렬하여 일관된 키 생성)
   */
  private static buildKey(prefix: string, params?: KeyParams): string {
    if (!params) {
      return prefix;
    }

    // undefined, null 값 제외하고 키-값 쌍 정렬
    const sortedParams = Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join(':');

    return sortedParams ? `${prefix}:${sortedParams}` : prefix;
  }

  // ========== 사용자 관련 캐시 키 ==========

  static user(userId: string): string {
    return `${CachePrefix.USER}:${userId}`;
  }

  static userStats(userId: string): string {
    return `${CachePrefix.USER}:${userId}:stats`;
  }

  // ========== 게시글 관련 캐시 키 ==========

  static articleList(params?: {
    page?: number;
    limit?: number;
    category_id?: string;
    tag_id?: string;
    search?: string;
    userId?: string;
  }): string {
    return this.buildKey(`${CachePrefix.ARTICLE}:list`, params);
  }

  static articleDetail(articleId: string, params?: { userId?: string }): string {
    return this.buildKey(`${CachePrefix.ARTICLE}:${articleId}`, params);
  }

  static articlesByAuthor(
    authorId: string,
    params?: {
      page?: number;
      limit?: number;
      includeUnpublished?: boolean;
      userId?: string;
    },
  ): string {
    return this.buildKey(`${CachePrefix.ARTICLE}:author:${authorId}`, params);
  }

  static articlesPopular(params?: {
    page?: number;
    limit?: number;
    days?: number;
    userId?: string;
  }): string {
    return this.buildKey(`${CachePrefix.ARTICLE}:popular`, params);
  }

  static articlesLiked(
    userId: string,
    params?: { page?: number; limit?: number },
  ): string {
    return this.buildKey(`${CachePrefix.ARTICLE}:liked:${userId}`, params);
  }

  static articlesBookmarked(
    userId: string,
    params?: { page?: number; limit?: number },
  ): string {
    return this.buildKey(`${CachePrefix.ARTICLE}:bookmarked:${userId}`, params);
  }

  // ========== 콘서트 관련 캐시 키 ==========

  static concertList(params?: {
    page?: number;
    limit?: number;
    category?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
  }): string {
    return this.buildKey(`${CachePrefix.CONCERT}:list`, params);
  }

  static concertDetail(concertId: string, params?: { userId?: string }): string {
    return this.buildKey(`${CachePrefix.CONCERT}:${concertId}`, params);
  }

  static concertsUpcoming(params?: {
    page?: number;
    limit?: number;
    userId?: string;
  }): string {
    return this.buildKey(`${CachePrefix.CONCERT}:upcoming`, params);
  }

  static concertsPopular(params?: {
    page?: number;
    limit?: number;
    days?: number;
    userId?: string;
  }): string {
    return this.buildKey(`${CachePrefix.CONCERT}:popular`, params);
  }

  static concertsLiked(
    userId: string,
    params?: { page?: number; limit?: number },
  ): string {
    return this.buildKey(`${CachePrefix.CONCERT}:liked:${userId}`, params);
  }

  // ========== 카테고리 & 태그 관련 캐시 키 ==========

  static categories(): string {
    return `${CachePrefix.CATEGORY}:all`;
  }

  static categoryById(categoryId: string): string {
    return `${CachePrefix.CATEGORY}:${categoryId}`;
  }

  static categoryByName(categoryName: string): string {
    return `${CachePrefix.CATEGORY}:name:${categoryName}`;
  }

  static tags(): string {
    return `${CachePrefix.TAG}:all`;
  }

  static tagById(tagId: string): string {
    return `${CachePrefix.TAG}:${tagId}`;
  }

  static tagByName(tagName: string): string {
    return `${CachePrefix.TAG}:name:${tagName}`;
  }

  static tagsPopular(params?: { limit?: number }): string {
    return this.buildKey(`${CachePrefix.TAG}:popular`, params);
  }

  static tagsByArticle(articleId: string): string {
    return `${CachePrefix.TAG}:article:${articleId}`;
  }

  // ========== 통계 관련 캐시 키 ==========

  static statsArticleLikes(articleId: string): string {
    return `${CachePrefix.STATS}:article:${articleId}:likes`;
  }

  static statsArticleBookmarks(articleId: string): string {
    return `${CachePrefix.STATS}:article:${articleId}:bookmarks`;
  }

  static statsArticleViews(articleId: string): string {
    return `${CachePrefix.STATS}:article:${articleId}:views`;
  }

  static statsConcertLikes(concertId: string): string {
    return `${CachePrefix.STATS}:concert:${concertId}:likes`;
  }

  static statsConcertInterest(concertId: string): string {
    return `${CachePrefix.STATS}:concert:${concertId}:interest`;
  }

  // ========== 검색 관련 캐시 키 ==========

  static searchArticles(params: {
    query?: string;
    category_id?: string;
    tag_names?: string[];
    author_id?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }): string {
    // 배열은 정렬 후 문자열로 변환
    const modifiedParams = {
      ...params,
      tag_names: params.tag_names
        ? params.tag_names.sort().join(',')
        : undefined,
    };
    return this.buildKey(`${CachePrefix.SEARCH}:articles`, modifiedParams);
  }

  static searchConcerts(params: {
    query?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): string {
    return this.buildKey(`${CachePrefix.SEARCH}:concerts`, params);
  }

  // ========== 알림 관련 캐시 키 ==========

  static notifications(userId: string, params?: { unreadOnly?: boolean }): string {
    return this.buildKey(`${CachePrefix.NOTIFICATION}:${userId}`, params);
  }

  static notificationCount(userId: string): string {
    return `${CachePrefix.NOTIFICATION}:${userId}:count`;
  }
}