import { logger } from '../index';
import { cacheManager } from './cacheManager';
import { CacheKeyBuilder } from './cacheKeyBuilder';
import { CacheTTL, CacheWarmingTargets } from './cacheConfig';

/**
 * Cache Warming Service
 * 서버 시작 시 및 주기적으로 자주 조회되는 데이터를 미리 캐싱
 */

export class CacheWarmingService {
  private warmingIntervals: NodeJS.Timeout[] = [];

  /**
   * 서버 시작 시 초기 캐시 워밍 실행
   */
  async warmupOnStartup(): Promise<void> {
    logger.info('🔥 Starting cache warming on startup...');

    const warmingPromises = CacheWarmingTargets.STARTUP.map((target) =>
      this.warmupByType(target.type, target.ttl),
    );

    try {
      await Promise.allSettled(warmingPromises);
      logger.info('✅ Cache warming completed on startup');
    } catch (error) {
      logger.error('❌ Error during cache warming:', { error });
    }
  }

  /**
   * 주기적 캐시 워밍 시작
   */
  startPeriodicWarming(): void {
    logger.info('🔄 Starting periodic cache warming...');

    CacheWarmingTargets.PERIODIC.forEach((target) => {
      const interval = setInterval(() => {
        this.warmupByType(target.type, target.ttl).catch((error) => {
          logger.error(`Error warming ${target.type}:`, { error });
        });
      }, target.interval);

      this.warmingIntervals.push(interval);
    });

    logger.info(
      `✅ Periodic cache warming started for ${CacheWarmingTargets.PERIODIC.length} targets`,
    );
  }

  /**
   * 주기적 캐시 워밍 중지
   */
  stopPeriodicWarming(): void {
    this.warmingIntervals.forEach((interval) => clearInterval(interval));
    this.warmingIntervals = [];
    logger.info('⏸️ Periodic cache warming stopped');
  }

  /**
   * 타입별 캐시 워밍 실행
   */
  private async warmupByType(type: string, ttl: number): Promise<void> {
    try {
      switch (type) {
        case 'categories':
          await this.warmupCategories(ttl);
          break;
        case 'popularTags':
          await this.warmupPopularTags(ttl);
          break;
        case 'popularArticles':
          await this.warmupPopularArticles(ttl);
          break;
        case 'upcomingConcerts':
          await this.warmupUpcomingConcerts(ttl);
          break;
        case 'popularConcerts':
          await this.warmupPopularConcerts(ttl);
          break;
        default:
          logger.warn(`Unknown warming type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error warming ${type}:`, { error });
      throw error;
    }
  }

  /**
   * 카테고리 목록 캐싱
   */
  private async warmupCategories(ttl: number): Promise<void> {
    try {
      const { getCategoryModel } = await import('../../models/article');
      const categoryModel = getCategoryModel();
      const categories = await categoryModel.findAll();

      const cacheKey = CacheKeyBuilder.categories();
      await cacheManager.set(cacheKey, categories, ttl);

      logger.info(`✅ Warmed up categories cache (${categories.length} items)`);
    } catch (error) {
      logger.error('Error warming categories:', { error });
    }
  }

  /**
   * 인기 태그 캐싱
   */
  private async warmupPopularTags(ttl: number): Promise<void> {
    try {
      const { getTagModel } = await import('../../models/article');
      const tagModel = getTagModel();

      // 모든 태그 조회 (인기순 정렬 메서드가 없으므로 전체 조회)
      const allTags = await tagModel.findAll();

      const cacheKey = CacheKeyBuilder.tags();
      await cacheManager.set(cacheKey, allTags, ttl);

      logger.info(`✅ Warmed up tags cache (${allTags.length} items)`);
    } catch (error) {
      logger.error('Error warming tags:', { error });
    }
  }

  /**
   * 인기 게시글 캐싱
   */
  private async warmupPopularArticles(ttl: number): Promise<void> {
    try {
      const { getArticleService } = await import(
        '../../services/article/articleService'
      );
      const articleService = getArticleService();

      // 최근 7일간 인기 게시글 (1페이지, 20개)
      const popularArticles = await articleService.getPopularArticles({
        page: 1,
        limit: 20,
        days: 7,
      });

      const cacheKey = CacheKeyBuilder.articlesPopular({
        page: 1,
        limit: 20,
        days: 7,
      });
      await cacheManager.set(cacheKey, popularArticles, ttl);

      logger.info(
        `✅ Warmed up popular articles cache (${popularArticles.articles.length} items)`,
      );
    } catch (error) {
      logger.error('Error warming popular articles:', { error });
    }
  }

  /**
   * 다가오는 콘서트 캐싱
   */
  private async warmupUpcomingConcerts(ttl: number): Promise<void> {
    try {
      const { getConcertModel } = await import('../../models/concert/concert');
      const concertModel = getConcertModel();

      // 현재 날짜 이후의 콘서트 조회
      const now = new Date();
      const upcomingConcerts = await concertModel.findMany(
        {
          datetime: { $gte: now },
          status: 'upcoming',
        },
        { page: 1, limit: 20, sort: { datetime: 1 } },
      );

      const cacheKey = CacheKeyBuilder.concertsUpcoming({
        page: 1,
        limit: 20,
      });
      await cacheManager.set(cacheKey, upcomingConcerts, ttl);

      logger.info(
        `✅ Warmed up upcoming concerts cache (${upcomingConcerts.concerts?.length || 0} items)`,
      );
    } catch (error) {
      logger.error('Error warming upcoming concerts:', { error });
    }
  }

  /**
   * 인기 콘서트 캐싱
   */
  private async warmupPopularConcerts(ttl: number): Promise<void> {
    try {
      const { getConcertModel } = await import('../../models/concert/concert');
      const concertModel = getConcertModel();

      // 최근 콘서트 조회 (좋아요 수로 정렬)
      const popularConcerts = await concertModel.findMany(
        {
          status: { $in: ['upcoming', 'ongoing'] },
        },
        { page: 1, limit: 20, sort: { likesCount: -1, datetime: 1 } },
      );

      const cacheKey = CacheKeyBuilder.concertsPopular({
        page: 1,
        limit: 20,
      });
      await cacheManager.set(cacheKey, popularConcerts, ttl);

      logger.info(
        `✅ Warmed up popular concerts cache (${popularConcerts.concerts?.length || 0} items)`,
      );
    } catch (error) {
      logger.error('Error warming popular concerts:', { error });
    }
  }

  /**
   * 특정 사용자의 자주 접근하는 데이터 캐싱
   */
  async warmupUserData(userId: string): Promise<void> {
    try {
      logger.info(`🔥 Warming up cache for user: ${userId}`);

      const { UserService } = await import('../../services/auth/userService');
      const userService = new UserService();

      // 사용자 프로필
      const user = await userService.findById(userId, true); // skipCache = true
      if (user) {
        const cacheKey = CacheKeyBuilder.user(userId);
        await cacheManager.set(cacheKey, user, CacheTTL.USER_PROFILE);
      }

      // 사용자 통계
      const stats = await userService.getUserStats(userId);
      if (stats) {
        const cacheKey = CacheKeyBuilder.userStats(userId);
        await cacheManager.set(cacheKey, stats, CacheTTL.USER_PROFILE);
      }

      logger.info(`✅ Warmed up user data for: ${userId}`);
    } catch (error) {
      logger.error(`Error warming user data for ${userId}:`, { error });
    }
  }

  /**
   * 수동으로 특정 타입의 캐시 워밍 실행
   */
  async manualWarmup(type: string): Promise<void> {
    logger.info(`🔥 Manual cache warming for: ${type}`);

    const target = CacheWarmingTargets.STARTUP.find((t) => t.type === type);
    if (target) {
      await this.warmupByType(target.type, target.ttl);
    } else {
      logger.warn(`Unknown warming type: ${type}`);
    }
  }

  /**
   * 모든 캐시 워밍 수동 실행
   */
  async warmupAll(): Promise<void> {
    logger.info('🔥 Manual warmup of all caches...');
    await this.warmupOnStartup();
  }
}

// 싱글톤 인스턴스
export const cacheWarmingService = new CacheWarmingService();
