import {
  getArticleModel,
  getTagModel,
  getCategoryModel,
  getArticleTagModel,
  getArticleLikeModel,
  getArticleBookmarkModel,
  IArticle,
} from '../../models/article';
import {
  createArticleSchema,
  updateArticleSchema,
  articleIdSchema,
  incrementViewSchema,
} from '../../utils/validation/article';
import { ObjectId } from 'mongodb';
import { cacheManager } from '../../utils/cache/cacheManager';
import {
  CacheKeyBuilder,
  CacheTTL,
  CacheInvalidationPatterns,
  CacheHelper,
} from '../../utils';
import {
  Cacheable,
  CacheEvict,
  WriteThrough,
} from '../../utils/cache/cacheDecorators';

// 인터페이스 정의
interface ArticleWithTags extends IArticle {
  tags?: unknown[];
}

interface ArticleStats {
  likesCount: number;
  bookmarksCount: number;
}

interface UserStatus {
  isLiked: boolean;
  isBookmarked: boolean;
}

interface EnrichedArticle extends ArticleWithTags {
  stats?: ArticleStats;
  userStatus?: UserStatus;
  popularityScore?: number;
  bookmarkedAt?: Date;
}

interface PaginatedResult<T> {
  articles: T[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreateArticleData {
  title: string;
  content_url: string;
  author_id: string;
  category_name?: string;
  tag_names?: string[];
  is_published?: boolean;
  published_at?: Date | null;
}

interface UpdateArticleData {
  title?: string;
  content_url?: string;
  category_name?: string | null;
  tag_names?: string[];
  is_published?: boolean;
  published_at?: Date | null;
}

interface GetArticleOptions {
  withTags?: boolean;
  withStats?: boolean;
  userId?: string;
}

interface GetPublishedOptions {
  page?: number;
  limit?: number;
  category_id?: string;
  tag_id?: string;
  search?: string;
  userId?: string;
}

interface GetByAuthorOptions {
  page?: number;
  limit?: number;
  includeUnpublished?: boolean;
  userId?: string;
}

interface GetPopularOptions {
  page?: number;
  limit?: number;
  days?: number;
  userId?: string;
}

interface GetWithStatsOptions extends GetPublishedOptions {
  withStats?: boolean;
}

interface SearchOptions {
  query?: string;
  category_id?: string;
  tag_names?: string[];
  author_id?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'popularity';
  userId?: string;
}

export class ArticleService {
  private articleModel = getArticleModel();
  private tagModel = getTagModel();
  private categoryModel = getCategoryModel();
  private articleTagModel = getArticleTagModel();
  private articleLikeModel = getArticleLikeModel();
  private articleBookmarkModel = getArticleBookmarkModel();

  // 게시글 생성 (태그 자동 생성 최적화)
  @CacheEvict({
    keyPatterns: () => [
      CacheInvalidationPatterns.ARTICLE_ALL(),
      CacheInvalidationPatterns.ARTICLE_LIST(),
    ],
  })
  async createArticle(data: CreateArticleData): Promise<IArticle> {
    // 유효성 검사
    const validatedData = createArticleSchema.parse(data);

    const { getDB } = await import('../../utils/database/db');
    const db = getDB();
    const session = db.client.startSession();

    try {
      let article: IArticle | null = null;

      await session.withTransaction(async () => {
        let categoryObjectId: ObjectId | null = null;
        if (validatedData.category_name) {
          // 카테고리 찾거나 생성 (선택사항)
          const category = await this.categoryModel.findOrCreate(
            validatedData.category_name,
          );
          categoryObjectId = category._id;
        }

        let tagObjectIds: ObjectId[] = [];
        if (validatedData.tag_names && validatedData.tag_names.length > 0) {
          // 태그들을 찾거나 생성 (배치 최적화)
          const tags = await this.tagModel.findOrCreateMany(
            validatedData.tag_names,
          );
          tagObjectIds = tags.map((tag) => tag._id);
        }

        // 게시글 생성
        article = await this.articleModel.create({
          title: validatedData.title,
          content_url: validatedData.content_url,
          author_id: new ObjectId(validatedData.author_id),
          category_id: categoryObjectId,
          is_published: validatedData.is_published || false,
          published_at: validatedData.published_at || null,
        });

        // 태그 연결 (배치 처리)
        if (tagObjectIds.length > 0 && article) {
          await this.articleTagModel.createMany(
            article._id.toString(),
            tagObjectIds.map((id) => id.toString()),
          );
        }
      });

      if (!article) {
        throw new Error('게시글 생성에 실패했습니다.');
      }

      return article;
    } finally {
      await session.endSession();
    }
  }

  // 게시글 조회 (ID로)
  @Cacheable({
    keyGenerator: (id: string, options: GetArticleOptions = {}) =>
      CacheKeyBuilder.articleDetail(id, { userId: options.userId }),
    ttl: CacheTTL.ARTICLE_DETAIL,
    skipIf: (_id: string, options: GetArticleOptions = {}) =>
      options.withStats === true || options.withTags === true,
  })
  async getArticleById(
    id: string,
    options: GetArticleOptions = {},
  ): Promise<EnrichedArticle> {
    articleIdSchema.parse({ id });

    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new Error('게시글을 찾을 수 없습니다.');
    }

    const result: EnrichedArticle = { ...article };

    // 병렬로 추가 정보 조회
    const promises: Promise<Record<string, unknown>>[] = [];

    if (options.withTags) {
      promises.push(
        this.articleTagModel.findTagsByArticle(id).then((tags) => ({ tags })),
      );
    }

    if (options.withStats) {
      promises.push(
        Promise.all([
          this.articleLikeModel.countByArticle(id),
          this.articleBookmarkModel.countByArticle(id),
        ]).then(([likesCount, bookmarksCount]) => ({
          stats: { likesCount, bookmarksCount },
        })),
      );
    }

    // 사용자별 좋아요/북마크 상태 확인
    if (options.userId) {
      promises.push(
        Promise.all([
          this.articleLikeModel.exists(id, options.userId),
          this.articleBookmarkModel.exists(id, options.userId),
        ]).then(([isLiked, isBookmarked]) => ({
          userStatus: { isLiked, isBookmarked },
        })),
      );
    }

    // 모든 추가 정보를 병렬로 조회
    if (promises.length > 0) {
      const additionalData = await Promise.all(promises);
      additionalData.forEach((data) => {
        Object.assign(result, data);
      });
    }

    return result;
  }

  // 발행된 게시글 목록 조회 (N+1 해결)
  async getPublishedArticles(
    options: GetPublishedOptions = {},
  ): Promise<PaginatedResult<EnrichedArticle>> {
    const {
      page = 1,
      limit = 20,
      category_id,
      tag_id,
      search,
      userId,
    } = options;

    // 새로운 캐시 키 빌더 사용
    const cacheKey = CacheKeyBuilder.articleList({
      page,
      limit,
      category_id,
      tag_id,
      search,
      userId,
    });

    const cachedData =
      await cacheManager.get<PaginatedResult<EnrichedArticle>>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    let articles: IArticle[];
    let total: number;

    if (tag_id) {
      // 태그별 게시글 조회
      const result = await this.articleTagModel.findArticlesByTag(tag_id, {
        page,
        limit,
        publishedOnly: true,
      });
      articles = result.articles.map((article) => ({
        ...article,
        category_id: article.category_id ?? null,
        published_at: article.published_at ?? null,
        likes_count: 0,
        bookmark_count: 0,
      }));
      total = result.total;
    } else if (search) {
      // 검색
      const result = await this.articleModel.search(search, {
        page,
        limit,
        publishedOnly: true,
      });
      articles = result.articles;
      total = result.total;
    } else {
      // 일반 목록 조회
      const result = await this.articleModel.findPublished({
        page,
        limit,
        category_id,
      });
      articles = result.articles;
      total = result.total;
    }

    // N+1 해결: 모든 게시글 ID를 한 번에 조회하여 관련 정보 가져오기
    const articleIds = articles.map((article) => article._id.toString());

    const promises: Promise<Record<string, unknown>>[] = [
      this.articleTagModel.findTagsByArticleIds(articleIds),
    ];

    // 사용자가 로그인한 경우 좋아요/북마크 상태도 조회
    if (userId) {
      promises.push(
        this.articleLikeModel.checkLikeStatusForArticles(userId, articleIds),
        this.articleBookmarkModel.checkBookmarkStatusForArticles(
          userId,
          articleIds,
        ),
      );
    }

    const [tagsMap, likeStatusMap, bookmarkStatusMap] =
      await Promise.all(promises);

    // 각 게시글에 태그 정보와 사용자 상태 매핑
    const articlesWithData: EnrichedArticle[] = articles.map((article) => {
      const articleId = article._id.toString();
      const result: EnrichedArticle = {
        ...article,
        tags: (tagsMap as Record<string, unknown[]>)[articleId] || [],
      };

      // 사용자 상태 정보 추가
      if (userId && likeStatusMap && bookmarkStatusMap) {
        result.userStatus = {
          isLiked:
            (likeStatusMap as Record<string, boolean>)[articleId] || false,
          isBookmarked:
            (bookmarkStatusMap as Record<string, boolean>)[articleId] || false,
        };
      }

      return result;
    });

    const result: PaginatedResult<EnrichedArticle> = {
      articles: articlesWithData,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    // 설정된 TTL 사용
    await cacheManager.set(cacheKey, result, CacheTTL.ARTICLE_LIST);

    return result;
  }

  // 게시글 업데이트 (태그 자동 생성 최적화)
  @WriteThrough({
    keyGenerator: (result: IArticle) =>
      CacheKeyBuilder.articleDetail(result._id.toString(), {}),
    ttl: CacheTTL.ARTICLE_DETAIL,
    invalidatePatterns: () => [
      CacheInvalidationPatterns.ARTICLE_LIST(),
      CacheInvalidationPatterns.ARTICLE_POPULAR(),
    ],
  })
  async updateArticle(id: string, data: UpdateArticleData): Promise<IArticle> {
    articleIdSchema.parse({ id });
    const validatedData = updateArticleSchema.parse(data);

    // 게시글 존재 확인
    const existingArticle = await this.articleModel.findById(id);
    if (!existingArticle) {
      throw new Error('게시글을 찾을 수 없습니다.');
    }

    const { getDB } = await import('../../utils/database/db');
    const db = getDB();
    const session = db.client.startSession();

    try {
      let updatedArticle: IArticle | null = null;

      await session.withTransaction(async () => {
        const updateData: Record<string, unknown> = { ...validatedData };

        // 카테고리 이름으로 ID 조회
        if (validatedData.category_name !== undefined) {
          if (validatedData.category_name === null) {
            updateData.category_id = null; // 카테고리 제거
          } else {
            // 카테고리 찾거나 생성
            const category = await this.categoryModel.findOrCreate(
              validatedData.category_name,
            );
            updateData.category_id = category._id;
          }
          delete updateData.category_name;
        }

        // 태그 이름으로 ID 조회 및 업데이트
        if (validatedData.tag_names !== undefined) {
          if (validatedData.tag_names.length > 0) {
            // 태그들을 찾거나 생성 (배치 최적화)
            const tags = await this.tagModel.findOrCreateMany(
              validatedData.tag_names,
            );
            await this.articleTagModel.updateArticleTags(
              id,
              tags.map((tag) => tag._id.toString()),
            );
          } else {
            await this.articleTagModel.deleteByArticle(id); // 모든 태그 제거
          }
          delete updateData.tag_names;
        }

        updatedArticle = await this.articleModel.updateById(id, updateData);
        if (!updatedArticle) {
          throw new Error('게시글 업데이트에 실패했습니다.');
        }
      });

      if (!updatedArticle) {
        throw new Error('게시글 업데이트에 실패했습니다.');
      }

      return updatedArticle;
    } finally {
      await session.endSession();
    }
  }

  // 게시글 삭제
  @CacheEvict({
    keyPatterns: (id: string) => [
      CacheInvalidationPatterns.ARTICLE_BY_ID(id),
      CacheInvalidationPatterns.ARTICLE_LIST(),
    ],
  })
  async deleteArticle(id: string): Promise<void> {
    articleIdSchema.parse({ id });

    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new Error('게시글을 찾을 수 없습니다.');
    }

    const { getDB } = await import('../../utils/database/db');
    const db = getDB();
    const session = db.client.startSession();

    try {
      await session.withTransaction(async () => {
        // 관련 데이터 삭제 (순차 처리로 변경 - 트랜잭션 내에서)
        await this.articleTagModel.deleteByArticle(id);
        await this.articleLikeModel.deleteByArticle(id);
        await this.articleBookmarkModel.deleteByArticle(id);

        // 게시글 삭제
        await this.articleModel.deleteById(id);
      });
    } finally {
      await session.endSession();
    }
  }

  // 조회수 증가
  async incrementViews(id: string): Promise<void> {
    incrementViewSchema.parse({ article_id: id });
    await this.articleModel.incrementViews(id);

    // 캐시 무효화: 게시글 상세 캐시 (조회수 반영)
    await CacheHelper.deletePatterns([
      CacheInvalidationPatterns.ARTICLE_BY_ID(id),
    ]);
  }

  // 작성자별 게시글 조회 (N+1 해결)
  async getArticlesByAuthor(
    authorId: string,
    options: GetByAuthorOptions = {},
  ): Promise<PaginatedResult<EnrichedArticle>> {
    const { page = 1, limit = 20, userId } = options;

    const result = await this.articleModel.findByAuthor(authorId, options);

    // N+1 해결: 모든 게시글 ID를 한 번에 조회하여 태그 정보 가져오기
    const articleIds = result.articles.map((article) => article._id.toString());

    const promises: Promise<Record<string, unknown>>[] = [
      this.articleTagModel.findTagsByArticleIds(articleIds),
    ];

    if (userId) {
      promises.push(
        this.articleLikeModel.checkLikeStatusForArticles(userId, articleIds),
        this.articleBookmarkModel.checkBookmarkStatusForArticles(
          userId,
          articleIds,
        ),
      );
    }

    const [tagsMap, likeStatusMap, bookmarkStatusMap] =
      await Promise.all(promises);

    // 각 게시글에 태그 정보 매핑
    const articlesWithTags: EnrichedArticle[] = result.articles.map(
      (article) => {
        const articleId = article._id.toString();
        const result: EnrichedArticle = {
          ...article,
          tags: (tagsMap as Record<string, unknown[]>)[articleId] || [],
        };

        if (userId && likeStatusMap && bookmarkStatusMap) {
          result.userStatus = {
            isLiked:
              (likeStatusMap as Record<string, boolean>)[articleId] || false,
            isBookmarked:
              (bookmarkStatusMap as Record<string, boolean>)[articleId] ||
              false,
          };
        }

        return result;
      },
    );

    return {
      articles: articlesWithTags,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  // 사용자가 좋아요한 게시글 목록 (N+1 해결)
  async getLikedArticlesByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PaginatedResult<EnrichedArticle>> {
    const { page = 1, limit = 20 } = options;

    // 좋아요한 게시글 ID 목록 조회
    const { articleIds, total } =
      await this.articleLikeModel.findArticleIdsByUser(userId, { page, limit });

    if (articleIds.length === 0) {
      return { articles: [], total: 0, page, totalPages: 0 };
    }

    // N+1 해결: 여러 게시글을 한 번에 조회
    const [articles, tagsMap] = await Promise.all([
      this.articleModel.findByIds(articleIds),
      this.articleTagModel.findTagsByArticleIds(articleIds),
    ]);

    // 각 게시글에 태그 정보 매핑
    const articlesWithTags: EnrichedArticle[] = articles.map((article) => ({
      ...article,
      tags:
        (tagsMap as Record<string, unknown[]>)[article._id.toString()] || [],
    }));

    return {
      articles: articlesWithTags,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 사용자가 북마크한 게시글 목록 (N+1 해결)
  async getBookmarkedArticlesByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PaginatedResult<EnrichedArticle>> {
    const { page = 1, limit = 20 } = options;

    // 북마크한 게시글 정보 조회 (게시글 정보 포함)
    const { bookmarks, total } =
      await this.articleBookmarkModel.findBookmarkedArticlesByUser(userId, {
        page,
        limit,
      });

    // 유효한 게시글들만 필터링하고 ID 추출
    const validBookmarks = bookmarks.filter(
      (bookmark): bookmark is typeof bookmark & { article: IArticle } =>
        bookmark.article !== undefined,
    );
    const articleIds = validBookmarks.map((bookmark) =>
      bookmark.article._id.toString(),
    );

    if (articleIds.length === 0) {
      return { articles: [], total: 0, page, totalPages: 0 };
    }

    // N+1 해결: 모든 게시글의 태그 정보를 한 번에 조회
    const tagsMap = await this.articleTagModel.findTagsByArticleIds(articleIds);

    // 각 게시글에 태그 정보와 북마크 시간 매핑
    const articlesWithTags: EnrichedArticle[] = validBookmarks.map(
      (bookmark) => ({
        ...bookmark.article,
        tags:
          (tagsMap as Record<string, unknown[]>)[
            bookmark.article._id.toString()
          ] || [],
        bookmarkedAt: bookmark.created_at,
      }),
    );

    return {
      articles: articlesWithTags,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 인기 게시글 조회 (N+1 해결)
  @Cacheable({
    keyGenerator: (options: GetPopularOptions = {}) =>
      CacheKeyBuilder.articlesPopular(options),
    ttl: CacheTTL.ARTICLE_POPULAR,
  })
  async getPopularArticles(
    options: GetPopularOptions = {},
  ): Promise<PaginatedResult<EnrichedArticle>> {
    const { page = 1, limit = 20, days = 7, userId } = options;

    // 최근 북마크가 많은 게시글들 조회
    const result =
      await this.articleBookmarkModel.findPopularBookmarkedArticles({
        page,
        limit,
        days,
      });

    // 유효한 게시글들만 필터링하고 ID 추출
    const validItems = result.articles.filter(
      (item): item is typeof item & { article: IArticle } =>
        item.article !== undefined,
    );
    const articleIds = validItems.map((item) => item.article._id.toString());

    if (articleIds.length === 0) {
      return { articles: [], total: 0, page, totalPages: 0 };
    }

    // N+1 해결: 모든 게시글의 태그 정보를 한 번에 조회
    const promises: Promise<Record<string, unknown>>[] = [
      this.articleTagModel.findTagsByArticleIds(articleIds),
    ];

    if (userId) {
      promises.push(
        this.articleLikeModel.checkLikeStatusForArticles(userId, articleIds),
        this.articleBookmarkModel.checkBookmarkStatusForArticles(
          userId,
          articleIds,
        ),
      );
    }

    const [tagsMap, likeStatusMap, bookmarkStatusMap] =
      await Promise.all(promises);

    // 각 게시글에 태그 정보와 인기도 점수 매핑
    const articlesWithTags: EnrichedArticle[] = validItems.map((item) => {
      const articleId = item.article._id.toString();
      const result: EnrichedArticle = {
        ...item.article,
        tags: (tagsMap as Record<string, unknown[]>)[articleId] || [],
        popularityScore: item.bookmarkCount,
      };

      if (userId && likeStatusMap && bookmarkStatusMap) {
        result.userStatus = {
          isLiked:
            (likeStatusMap as Record<string, boolean>)[articleId] || false,
          isBookmarked:
            (bookmarkStatusMap as Record<string, boolean>)[articleId] || false,
        };
      }

      return result;
    });

    return {
      articles: articlesWithTags,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  // 통계 정보 포함된 게시글 목록 조회 (새로운 메서드)
  async getPublishedArticlesWithStats(
    options: GetWithStatsOptions = {},
  ): Promise<PaginatedResult<EnrichedArticle>> {
    const { withStats = false, userId, ...restOptions } = options;

    // 기본 게시글 목록 조회
    const result = await this.getPublishedArticles({ ...restOptions, userId });

    if (!withStats || result.articles.length === 0) {
      return result;
    }

    // 통계 정보 추가
    const articleIds = result.articles.map((article) => article._id.toString());
    const [likesCountMap, bookmarksCountMap] = await Promise.all([
      this.articleLikeModel.countByArticleIds(articleIds),
      this.articleBookmarkModel.countByArticleIds(articleIds),
    ]);

    const articlesWithStats: EnrichedArticle[] = result.articles.map(
      (article) => ({
        ...article,
        stats: {
          likesCount: likesCountMap[article._id.toString()] || 0,
          bookmarksCount: bookmarksCountMap[article._id.toString()] || 0,
        },
      }),
    );

    return {
      ...result,
      articles: articlesWithStats,
    };
  }

  // 배치로 게시글과 태그 정보 조회 (헬퍼 메서드)
  private async getArticlesWithTagsBatch(
    articleIds: string[],
  ): Promise<EnrichedArticle[]> {
    if (articleIds.length === 0) return [];

    // 게시글과 태그 정보를 병렬로 조회
    const [articles, tagsMap] = await Promise.all([
      this.articleModel.findByIds(articleIds),
      this.articleTagModel.findTagsByArticleIds(articleIds),
    ]);

    // 각 게시글에 태그 정보 매핑
    return articles.map((article: IArticle) => ({
      ...article,
      tags:
        (tagsMap as Record<string, unknown[]>)[article._id.toString()] || [],
    }));
  }

  // 다중 게시글 통계 정보 조회 (헬퍼 메서드)
  private async getArticlesStatsBatch(
    articleIds: string[],
  ): Promise<Record<string, ArticleStats>> {
    if (articleIds.length === 0) return {};

    const [likesMap, bookmarksMap] = await Promise.all([
      this.articleLikeModel.countByArticleIds(articleIds),
      this.articleBookmarkModel.countByArticleIds(articleIds),
    ]);

    const statsMap: Record<string, ArticleStats> = {};

    articleIds.forEach((id) => {
      statsMap[id] = {
        likesCount: likesMap[id] || 0,
        bookmarksCount: bookmarksMap[id] || 0,
      };
    });

    return statsMap;
  }

  // 게시글 검색 (고급 검색)
  async searchArticles(
    options: SearchOptions = {},
  ): Promise<PaginatedResult<EnrichedArticle>> {
    const { query, category_id, page = 1, limit = 20, userId } = options;

    // 기본 필터 구성
    let articles: IArticle[];
    let total: number;

    if (query) {
      // 텍스트 검색
      const result = await this.articleModel.search(query, {
        page,
        limit,
        publishedOnly: true,
      });
      articles = result.articles;
      total = result.total;
    } else {
      // 일반 목록 조회
      const result = await this.articleModel.findPublished({
        page,
        limit,
        category_id,
      });
      articles = result.articles;
      total = result.total;
    }

    // 추가 필터링 및 데이터 보강
    const articleIds = articles.map((article) => article._id.toString());

    const promises: Promise<Record<string, unknown>>[] = [
      this.articleTagModel.findTagsByArticleIds(articleIds),
    ];

    if (userId) {
      promises.push(
        this.articleLikeModel.checkLikeStatusForArticles(userId, articleIds),
        this.articleBookmarkModel.checkBookmarkStatusForArticles(
          userId,
          articleIds,
        ),
      );
    }

    const [tagsMap, likeStatusMap, bookmarkStatusMap] =
      await Promise.all(promises);

    // 결과 조합
    const enrichedArticles: EnrichedArticle[] = articles.map((article) => {
      const articleId = article._id.toString();
      const result: EnrichedArticle = {
        ...article,
        tags: (tagsMap as Record<string, unknown[]>)[articleId] || [],
      };

      if (userId && likeStatusMap && bookmarkStatusMap) {
        result.userStatus = {
          isLiked:
            (likeStatusMap as Record<string, boolean>)[articleId] || false,
          isBookmarked:
            (bookmarkStatusMap as Record<string, boolean>)[articleId] || false,
        };
      }

      return result;
    });

    return {
      articles: enrichedArticles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

// 싱글톤 인스턴스
let articleService: ArticleService;

export const getArticleService = (): ArticleService => {
  if (!articleService) {
    articleService = new ArticleService();
  }
  return articleService;
};
