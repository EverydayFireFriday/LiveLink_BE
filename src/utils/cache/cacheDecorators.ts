import { cacheManager } from './cacheManager';
import { logger } from '../index';

/**
 * Cache Decorators
 * 서비스 메서드에 적용할 수 있는 캐싱 데코레이터
 */

interface CacheableOptions {
  /**
   * 캐시 키 생성 함수
   * 메서드의 인자를 받아 캐시 키를 생성
   */
  keyGenerator: (...args: any[]) => string;

  /**
   * TTL (초 단위)
   */
  ttl: number;

  /**
   * 캐시 스킵 조건 (옵션)
   * true를 반환하면 캐시를 스킵하고 직접 DB 조회
   */
  skipIf?: (...args: any[]) => boolean;
}

/**
 * Cacheable 데코레이터
 * 메서드 실행 전 캐시를 확인하고, 없으면 실행 후 캐시에 저장
 *
 * @example
 * class ArticleService {
 *   @Cacheable({
 *     keyGenerator: (id: string) => CacheKeyBuilder.articleDetail(id),
 *     ttl: CacheTTL.ARTICLE_DETAIL,
 *   })
 *   async getArticleById(id: string) {
 *     return await this.articleModel.findById(id);
 *   }
 * }
 */
export function Cacheable(options: CacheableOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 캐시 스킵 조건 확인
      if (options.skipIf && options.skipIf(...args)) {
        return await originalMethod.apply(this, args);
      }

      // 캐시 키 생성
      const cacheKey = options.keyGenerator(...args);

      try {
        // 캐시에서 조회
        const cachedData = await cacheManager.get(cacheKey);
        if (cachedData !== null) {
          return cachedData;
        }

        // 캐시 미스 시 원본 메서드 실행
        const result = await originalMethod.apply(this, args);

        // 결과를 캐시에 저장 (undefined나 null이 아닌 경우만)
        if (result !== undefined && result !== null) {
          await cacheManager.set(cacheKey, result, options.ttl);
        }

        return result;
      } catch (error) {
        logger.error(
          `Cache error in ${propertyKey}, falling back to original method:`,
          { error },
        );
        // 캐시 오류 시 원본 메서드 실행
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

interface CacheEvictOptions {
  /**
   * 무효화할 캐시 키 패턴 생성 함수
   */
  keyPatterns: (...args: any[]) => string[];

  /**
   * 메서드 실행 전에 캐시 무효화 (기본값: false, 실행 후 무효화)
   */
  beforeInvocation?: boolean;
}

/**
 * CacheEvict 데코레이터
 * 메서드 실행 후 특정 캐시를 무효화
 *
 * @example
 * class ArticleService {
 *   @CacheEvict({
 *     keyPatterns: () => [
 *       CacheInvalidationPatterns.ARTICLE_ALL(),
 *       CacheInvalidationPatterns.ARTICLE_LIST(),
 *     ],
 *   })
 *   async createArticle(data: CreateArticleData) {
 *     return await this.articleModel.create(data);
 *   }
 * }
 */
export function CacheEvict(options: CacheEvictOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const evictCache = async () => {
        const patterns = options.keyPatterns(...args);
        await Promise.all(
          patterns.map((pattern) => cacheManager.delByPattern(pattern)),
        );
      };

      try {
        // beforeInvocation이 true면 메서드 실행 전 캐시 무효화
        if (options.beforeInvocation) {
          await evictCache();
        }

        const result = await originalMethod.apply(this, args);

        // beforeInvocation이 false면 메서드 실행 후 캐시 무효화
        if (!options.beforeInvocation) {
          await evictCache();
        }

        return result;
      } catch (error) {
        // 에러 발생 시에도 캐시 무효화 (데이터 일관성 보장)
        if (!options.beforeInvocation) {
          await evictCache();
        }
        throw error;
      }
    };

    return descriptor;
  };
}

interface CachePutOptions {
  /**
   * 캐시 키 생성 함수
   */
  keyGenerator: (...args: any[]) => string;

  /**
   * TTL (초 단위)
   */
  ttl: number;

  /**
   * 결과 변환 함수 (옵션)
   * 메서드 실행 결과를 변환하여 캐시에 저장
   */
  valueTransformer?: (result: any) => any;
}

/**
 * CachePut 데코레이터
 * 메서드 실행 후 결과를 무조건 캐시에 저장 (캐시 확인하지 않음)
 * 주로 업데이트 메서드에 사용
 *
 * @example
 * class ArticleService {
 *   @CachePut({
 *     keyGenerator: (id: string) => CacheKeyBuilder.articleDetail(id),
 *     ttl: CacheTTL.ARTICLE_DETAIL,
 *   })
 *   async updateArticle(id: string, data: UpdateArticleData) {
 *     return await this.articleModel.updateById(id, data);
 *   }
 * }
 */
export function CachePut(options: CachePutOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // 결과를 캐시에 저장
      if (result !== undefined && result !== null) {
        const cacheKey = options.keyGenerator(...args);
        const valueToCache = options.valueTransformer
          ? options.valueTransformer(result)
          : result;

        await cacheManager.set(cacheKey, valueToCache, options.ttl);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 여러 캐시 데코레이터를 조합하는 유틸리티
 *
 * @example
 * class ArticleService {
 *   // 조회 시 캐싱, 업데이트 시 캐시 무효화
 *   @Cacheable({ ... })
 *   async getArticle(id: string) { ... }
 *
 *   // 업데이트 후 캐시 저장 및 목록 캐시 무효화
 *   @CachePut({ ... })
 *   @CacheEvict({ ... })
 *   async updateArticle(id: string, data: any) { ... }
 * }
 */

/**
 * 캐시 헬퍼 함수들
 */
export class CacheHelper {
  /**
   * 여러 키를 동시에 조회
   */
  static async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => cacheManager.get<T>(key)));
  }

  /**
   * 여러 키-값 쌍을 동시에 저장
   */
  static async setMany<T>(
    items: Array<{ key: string; value: T; ttl: number }>,
  ): Promise<void> {
    await Promise.all(
      items.map((item) => cacheManager.set(item.key, item.value, item.ttl)),
    );
  }

  /**
   * 여러 패턴을 동시에 삭제
   */
  static async deletePatterns(patterns: string[]): Promise<void> {
    await Promise.all(patterns.map((pattern) => cacheManager.delByPattern(pattern)));
  }

  /**
   * 캐시 키 존재 여부 확인
   */
  static async exists(key: string): Promise<boolean> {
    const value = await cacheManager.get(key);
    return value !== null;
  }

  /**
   * TTL 연장 (기존 값 유지하며 만료 시간만 연장)
   */
  static async extend<T>(key: string, additionalTtl: number): Promise<void> {
    const value = await cacheManager.get<T>(key);
    if (value !== null) {
      await cacheManager.set(key, value, additionalTtl);
    }
  }
}
