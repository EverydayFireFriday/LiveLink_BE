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

export class ArticleService {
  private articleModel = getArticleModel();
  private tagModel = getTagModel();
  private categoryModel = getCategoryModel();
  private articleTagModel = getArticleTagModel();
  private articleLikeModel = getArticleLikeModel();
  private articleBookmarkModel = getArticleBookmarkModel();

  // 게시글 생성 (태그 자동 생성 최적화)
  async createArticle(data: any): Promise<IArticle> {
    // 유효성 검사
    const validatedData = createArticleSchema.parse(data);

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
    const article = await this.articleModel.create({
      title: validatedData.title,
      content_url: validatedData.content_url,
      author_id: new ObjectId(validatedData.author_id),
      category_id: categoryObjectId,
      is_published: validatedData.is_published || false,
      published_at: validatedData.published_at || null,
    });

    // 태그 연결 (배치 처리)
    if (tagObjectIds.length > 0) {
      await this.articleTagModel.createMany(
        article._id.toString(),
        tagObjectIds.map((id) => id.toString()),
      );
    }

    await cacheManager.delByPattern('articles:*');
    return article;
  }

  // 게시글 조회 (ID로)
  async getArticleById(
    id: string,
    options: { withTags?: boolean; withStats?: boolean; userId?: string } = {},
  ): Promise<any> {
    articleIdSchema.parse({ id });

    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new Error('게시글을 찾을 수 없습니다.');
    }

    let result: any = { ...article };

    // 병렬로 추가 정보 조회
    const promises: Promise<any>[] = [];

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
    options: {
      page?: number;
      limit?: number;
      category_id?: string;
      tag_id?: string;
      search?: string;
      userId?: string; // 사용자별 좋아요/북마크 상태 확인용
    } = {},
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      category_id,
      tag_id,
      search,
      userId,
    } = options;

    const cacheKey = `articles:page=${page}:limit=${limit}:category=${
      category_id || ''
    }:tag=${tag_id || ''}:search=${search || ''}:userId=${userId || ''}`;
    const cachedData = await cacheManager.get<any>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    let articles: any[];
    let total: number;

    if (tag_id) {
      // 태그별 게시글 조회
      const result = await this.articleTagModel.findArticlesByTag(tag_id, {
        page,
        limit,
        publishedOnly: true,
      });
      articles = result.articles;
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

    const promises: Promise<any>[] = [
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
    const articlesWithData = articles.map((article) => {
      const articleId = article._id.toString();
      const result: any = {
        ...article,
        tags: tagsMap[articleId] || [],
      };

      // 사용자 상태 정보 추가
      if (userId && likeStatusMap && bookmarkStatusMap) {
        result.userStatus = {
          isLiked: likeStatusMap[articleId] || false,
          isBookmarked: bookmarkStatusMap[articleId] || false,
        };
      }

      return result;
    });

    const result = {
      articles: articlesWithData,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    await cacheManager.set(cacheKey, result, 300); // 5분 캐시

    return result;
  }

  // 게시글 업데이트 (태그 자동 생성 최적화)
  async updateArticle(id: string, data: any): Promise<IArticle> {
    articleIdSchema.parse({ id });
    const validatedData = updateArticleSchema.parse(data);

    // 게시글 존재 확인
    const existingArticle = await this.articleModel.findById(id);
    if (!existingArticle) {
      throw new Error('게시글을 찾을 수 없습니다.');
    }

    const updateData: any = { ...validatedData };

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

    const updatedArticle = await this.articleModel.updateById(id, updateData);
    if (!updatedArticle) {
      throw new Error('게시글 업데이트에 실패했습니다.');
    }

    await cacheManager.delByPattern('articles:*');
    return updatedArticle;
  }

  // 게시글 삭제
  async deleteArticle(id: string): Promise<void> {
    articleIdSchema.parse({ id });

    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new Error('게시글을 찾을 수 없습니다.');
    }

    // 관련 데이터 삭제 (병렬 처리)
    await Promise.all([
      this.articleTagModel.deleteByArticle(id),
      this.articleLikeModel.deleteByArticle(id),
      this.articleBookmarkModel.deleteByArticle(id),
    ]);

    // 게시글 삭제
    await this.articleModel.deleteById(id);
    await cacheManager.delByPattern('articles:*');
  }

  // 조회수 증가
  async incrementViews(id: string): Promise<void> {
    incrementViewSchema.parse({ article_id: id });
    await this.articleModel.incrementViews(id);
  }

  // 작성자별 게시글 조회 (N+1 해결)
  async getArticlesByAuthor(
    authorId: string,
    options: {
      page?: number;
      limit?: number;
      includeUnpublished?: boolean;
      userId?: string;
    } = {},
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, userId } = options;

    const result = await this.articleModel.findByAuthor(authorId, options);

    // N+1 해결: 모든 게시글 ID를 한 번에 조회하여 태그 정보 가져오기
    const articleIds = result.articles.map((article) => article._id.toString());

    const promises: Promise<any>[] = [
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
    const articlesWithTags = result.articles.map((article) => {
      const articleId = article._id.toString();
      const result: any = {
        ...article,
        tags: tagsMap[articleId] || [],
      };

      if (userId && likeStatusMap && bookmarkStatusMap) {
        result.userStatus = {
          isLiked: likeStatusMap[articleId] || false,
          isBookmarked: bookmarkStatusMap[articleId] || false,
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

  // 사용자가 좋아요한 게시글 목록 (N+1 해결)
  async getLikedArticlesByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
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
    const articlesWithTags = articles.map((article) => ({
      ...article,
      tags: tagsMap[article._id.toString()] || [],
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
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;

    // 북마크한 게시글 정보 조회 (게시글 정보 포함)
    const { bookmarks, total } =
      await this.articleBookmarkModel.findBookmarkedArticlesByUser(userId, {
        page,
        limit,
      });

    // 유효한 게시글들만 필터링하고 ID 추출
    const validBookmarks = bookmarks.filter((bookmark) => bookmark.article);
    const articleIds = validBookmarks.map((bookmark) =>
      bookmark.article._id.toString(),
    );

    if (articleIds.length === 0) {
      return { articles: [], total: 0, page, totalPages: 0 };
    }

    // N+1 해결: 모든 게시글의 태그 정보를 한 번에 조회
    const tagsMap = await this.articleTagModel.findTagsByArticleIds(articleIds);

    // 각 게시글에 태그 정보와 북마크 시간 매핑
    const articlesWithTags = validBookmarks.map((bookmark) => ({
      ...bookmark.article,
      tags: tagsMap[bookmark.article._id.toString()] || [],
      bookmarkedAt: bookmark.created_at,
    }));

    return {
      articles: articlesWithTags,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 인기 게시글 조회 (N+1 해결)
  async getPopularArticles(
    options: {
      page?: number;
      limit?: number;
      days?: number;
      userId?: string;
    } = {},
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, days = 7, userId } = options;

    // 최근 북마크가 많은 게시글들 조회
    const result =
      await this.articleBookmarkModel.findPopularBookmarkedArticles({
        page,
        limit,
        days,
      });

    // 유효한 게시글들만 필터링하고 ID 추출
    const validItems = result.articles.filter((item) => item.article);
    const articleIds = validItems.map((item) => item.article._id.toString());

    if (articleIds.length === 0) {
      return { articles: [], total: 0, page, totalPages: 0 };
    }

    // N+1 해결: 모든 게시글의 태그 정보를 한 번에 조회
    const promises: Promise<any>[] = [
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
    const articlesWithTags = validItems.map((item) => {
      const articleId = item.article._id.toString();
      const result: any = {
        ...item.article,
        tags: tagsMap[articleId] || [],
        popularityScore: item.bookmarkCount,
      };

      if (userId && likeStatusMap && bookmarkStatusMap) {
        result.userStatus = {
          isLiked: likeStatusMap[articleId] || false,
          isBookmarked: bookmarkStatusMap[articleId] || false,
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
    options: {
      page?: number;
      limit?: number;
      category_id?: string;
      tag_id?: string;
      search?: string;
      withStats?: boolean;
      userId?: string;
    } = {},
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
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

    const articlesWithStats = result.articles.map((article) => ({
      ...article,
      stats: {
        likesCount: likesCountMap[article._id.toString()] || 0,
        bookmarksCount: bookmarksCountMap[article._id.toString()] || 0,
      },
    }));

    return {
      ...result,
      articles: articlesWithStats,
    };
  }

  // 배치로 게시글과 태그 정보 조회 (헬퍼 메서드)
  private async getArticlesWithTagsBatch(articleIds: string[]): Promise<any[]> {
    if (articleIds.length === 0) return [];

    // 게시글과 태그 정보를 병렬로 조회
    const [articles, tagsMap] = await Promise.all([
      this.articleModel.findByIds(articleIds),
      this.articleTagModel.findTagsByArticleIds(articleIds),
    ]);

    // 각 게시글에 태그 정보 매핑
    return articles.map((article: any) => ({
      ...article,
      tags: tagsMap[article._id.toString()] || [],
    }));
  }

  // 다중 게시글 통계 정보 조회 (헬퍼 메서드)
  private async getArticlesStatsBatch(
    articleIds: string[],
  ): Promise<Record<string, { likesCount: number; bookmarksCount: number }>> {
    if (articleIds.length === 0) return {};

    const [likesMap, bookmarksMap] = await Promise.all([
      this.articleLikeModel.countByArticleIds(articleIds),
      this.articleBookmarkModel.countByArticleIds(articleIds),
    ]);

    const statsMap: Record<
      string,
      { likesCount: number; bookmarksCount: number }
    > = {};

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
    options: {
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
    } = {},
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      query,
      category_id,
      tag_names,
      author_id,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      userId,
    } = options;

    // 기본 필터 구성
    let articles: any[];
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

    const promises: Promise<any>[] = [
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
    const enrichedArticles = articles.map((article) => {
      const articleId = article._id.toString();
      const result: any = {
        ...article,
        tags: tagsMap[articleId] || [],
      };

      if (userId && likeStatusMap && bookmarkStatusMap) {
        result.userStatus = {
          isLiked: likeStatusMap[articleId] || false,
          isBookmarked: bookmarkStatusMap[articleId] || false,
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
