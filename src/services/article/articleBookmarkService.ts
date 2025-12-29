import {
  getArticleModel,
  getArticleBookmarkModel,
  IArticleBookmark,
} from '../../models/article';
import {
  createBookmarkSchema,
  deleteBookmarkSchema,
  getUserBookmarksSchema,
} from '../../utils/validation/article';

// 타입 정의
interface CreateBookmarkData {
  article_id: string;
  user_id: string;
}

interface DeleteBookmarkData {
  article_id: string;
  user_id: string;
}

interface BookmarkWithArticle {
  _id: string;
  article: {
    _id: string;
    title: string;
    content_url: string;
    author_id: string;
    category?: {
      name: string;
    };
    created_at: Date;
    updated_at: Date;
  };
  created_at: Date;
  bookmarkedAt?: Date;
}

interface UserBookmarksResult {
  bookmarks: BookmarkWithArticle[];
  total: number;
  page: number;
  totalPages: number;
}

interface PopularBookmarkedResult {
  articles: BookmarkWithArticle[];
  total: number;
  page: number;
  totalPages: number;
}

interface BookmarkStats {
  totalBookmarks: number;
  recentBookmarks: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface BookmarkDashboard {
  totalBookmarks: number;
  thisWeekBookmarks: number;
  thisMonthBookmarks: number;
  topCategories: CategoryCount[];
  recentActivity: BookmarkWithArticle[];
}

export class ArticleBookmarkService {
  private articleModel = getArticleModel();
  private articleBookmarkModel = getArticleBookmarkModel();

  // 북마크 추가
  async bookmarkArticle(data: CreateBookmarkData): Promise<IArticleBookmark> {
    const validatedData = createBookmarkSchema.parse(data);

    // 게시글 존재 확인
    const article = await this.articleModel.findById(validatedData.article_id);
    if (!article) {
      throw new Error('게시글을 찾을 수 없습니다.');
    }

    // 북마크 추가
    const bookmark = await this.articleBookmarkModel.create(
      validatedData.article_id,
      validatedData.user_id,
    );

    return bookmark;
  }

  // 북마크 삭제
  async unbookmarkArticle(
    data: DeleteBookmarkData,
  ): Promise<{ success: boolean }> {
    const validatedData = deleteBookmarkSchema.parse(data);

    // 북마크 삭제
    const deletedBookmark = await this.articleBookmarkModel.delete(
      validatedData.article_id,
      validatedData.user_id,
    );

    if (!deletedBookmark) {
      throw new Error('북마크를 찾을 수 없습니다.');
    }

    return { success: true };
  }

  // 북마크 상태 확인
  async checkBookmarkStatus(
    articleId: string,
    userId: string,
  ): Promise<{ isBookmarked: boolean }> {
    const isBookmarked = await this.articleBookmarkModel.exists(
      articleId,
      userId,
    );
    return { isBookmarked };
  }

  // 여러 게시글의 북마크 상태 일괄 조회 (N+1 해결)
  async checkMultipleBookmarkStatus(
    articleIds: string[],
    userId: string,
  ): Promise<Map<string, boolean>> {
    const result =
      await this.articleBookmarkModel.checkBookmarkStatusForArticles(
        userId,
        articleIds,
      );

    // Record<string, boolean>을 Map<string, boolean>으로 변환
    if (result instanceof Map) {
      return result;
    } else {
      const mapResult = new Map<string, boolean>();
      Object.entries(result).forEach(([key, value]) => {
        mapResult.set(key, value);
      });
      return mapResult;
    }
  }

  // 북마크 토글 (있으면 삭제, 없으면 추가)
  async toggleBookmark(
    articleId: string,
    userId: string,
  ): Promise<{ isBookmarked: boolean }> {
    const isCurrentlyBookmarked = await this.articleBookmarkModel.exists(
      articleId,
      userId,
    );

    if (isCurrentlyBookmarked) {
      // 북마크 삭제
      await this.unbookmarkArticle({
        article_id: articleId,
        user_id: userId,
      });
      return { isBookmarked: false };
    } else {
      // 북마크 추가
      await this.bookmarkArticle({
        article_id: articleId,
        user_id: userId,
      });
      return { isBookmarked: true };
    }
  }

  // 사용자의 북마크 목록 조회 (N+1 해결)
  async getUserBookmarks(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<UserBookmarksResult> {
    const validatedOptions = getUserBookmarksSchema.parse({
      user_id: userId,
      ...options,
    });

    // 북마크한 게시글 정보를 게시글과 함께 조회 (이미 조인된 상태)
    const result = await this.articleBookmarkModel.findBookmarkedArticlesByUser(
      userId,
      {
        page: validatedOptions.page,
        limit: validatedOptions.limit,
      },
    );

    return {
      bookmarks: result.bookmarks.map((bookmark) => ({
        _id: bookmark._id.toString(),
        article: {
          _id: bookmark.article?._id.toString() || '',
          title: bookmark.article?.title || '',
          content_url: bookmark.article?.content_url || '',
          author_id: bookmark.article?.author_id.toString() || '',
          category: bookmark.article?.category_id
            ? { name: bookmark.article.category_id.toString() }
            : undefined,
          created_at: bookmark.article?.created_at || new Date(),
          updated_at: bookmark.article?.updated_at || new Date(),
        },
        created_at: bookmark.created_at,
      })),
      total: result.total,
      page: validatedOptions.page,
      totalPages: Math.ceil(result.total / validatedOptions.limit),
    };
  }

  // 게시글을 북마크한 사용자 목록
  async getArticleBookmarkers(
    articleId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    userIds: string[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;

    const result = await this.articleBookmarkModel.findUserIdsByArticle(
      articleId,
      { page, limit },
    );

    return {
      userIds: result.userIds,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  // 게시글의 북마크 수 조회
  async getBookmarkCount(articleId: string): Promise<number> {
    return await this.articleBookmarkModel.countByArticle(articleId);
  }

  // 여러 게시글의 북마크 수 배치 조회 (N+1 해결)
  async getBookmarkCounts(
    articleIds: string[],
  ): Promise<Record<string, number>> {
    return await this.articleBookmarkModel.countByArticleIds(articleIds);
  }

  // 사용자의 북마크 통계
  async getUserBookmarkStats(userId: string): Promise<BookmarkStats> {
    return await this.articleBookmarkModel.getUserBookmarkStats(userId);
  }

  // 인기 북마크 게시글 조회 (N+1 해결)
  async getPopularBookmarkedArticles(
    options: {
      page?: number;
      limit?: number;
      days?: number;
    } = {},
  ): Promise<PopularBookmarkedResult> {
    const { page = 1, limit = 20, days = 30 } = options;

    // 이미 게시글 정보가 포함된 상태로 조회되므로 추가 쿼리 불필요
    const result =
      await this.articleBookmarkModel.findPopularBookmarkedArticles({
        page,
        limit,
        days,
      });

    return {
      articles: result.articles.map((item) => ({
        _id: item._id.toString(),
        article: {
          _id: item.article?._id.toString() || '',
          title: item.article?.title || '',
          content_url: item.article?.content_url || '',
          author_id: item.article?.author_id.toString() || '',
          category: item.article?.category_id
            ? { name: item.article.category_id.toString() }
            : undefined,
          created_at: item.article?.created_at || new Date(),
          updated_at: item.article?.updated_at || new Date(),
        },
        created_at: item.latestBookmark,
      })),
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  // 배치로 여러 사용자의 북마크 수 조회
  async getBatchUserBookmarkCounts(
    userIds: string[],
  ): Promise<Record<string, number>> {
    return await this.articleBookmarkModel.countByUserIds(userIds);
  }

  // 특정 사용자들이 특정 게시글을 북마크했는지 배치 확인
  async checkBatchBookmarkStatus(
    userIds: string[],
    articleId: string,
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    // 각 사용자별로 북마크 상태 확인
    const checks = await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        isBookmarked: await this.articleBookmarkModel.exists(articleId, userId),
      })),
    );

    checks.forEach(({ userId, isBookmarked }) => {
      result[userId] = isBookmarked;
    });

    return result;
  }

  // 사용자가 최근 북마크한 게시글들 (시간순)
  async getRecentBookmarks(
    userId: string,
    options: {
      limit?: number;
      days?: number;
    } = {},
  ): Promise<BookmarkWithArticle[]> {
    const { limit = 10, days = 7 } = options;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // 최근 북마크들을 시간순으로 조회 (게시글 정보 포함)
    const result =
      await this.articleBookmarkModel.findBookmarkedArticlesByUserWithFolders(
        userId,
        {
          page: 1,
          limit,
        },
      );

    return result.bookmarks
      .map((bookmark) => ({
        _id: bookmark.article._id.toString(),
        article: {
          _id: bookmark.article._id.toString(),
          title: bookmark.article.title,
          content_url: bookmark.article.content_url,
          author_id: bookmark.article.author_id.toString(),
          category: bookmark.article.category_id
            ? { name: bookmark.article.category_id.toString() }
            : undefined,
          created_at: bookmark.article.created_at,
          updated_at: bookmark.article.updated_at,
        },
        created_at: bookmark.created_at,
        bookmarkedAt: bookmark.created_at,
      }))
      .filter(
        (bookmark: BookmarkWithArticle) =>
          new Date(bookmark.bookmarkedAt || bookmark.created_at) >=
          dateThreshold,
      );
  }

  // 북마크 통계 대시보드용 데이터
  async getBookmarkStatsDashboard(userId: string): Promise<BookmarkDashboard> {
    // 병렬로 여러 통계 데이터 조회
    const [totalStats, recentBookmarks, thisWeekData, thisMonthData] =
      await Promise.all([
        this.getUserBookmarkStats(userId),
        this.getRecentBookmarks(userId, { limit: 5, days: 30 }),
        this.getRecentBookmarks(userId, { limit: 100, days: 7 }),
        this.getRecentBookmarks(userId, { limit: 100, days: 30 }),
      ]);

    // 카테고리별 통계 계산 (최근 북마크들을 기반으로)
    const categoryCount: Record<string, number> = {};
    recentBookmarks.forEach((bookmark: BookmarkWithArticle) => {
      if (bookmark.article?.category) {
        const category = bookmark.article.category.name || 'Uncategorized';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });

    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalBookmarks: totalStats.totalBookmarks,
      thisWeekBookmarks: thisWeekData.length,
      thisMonthBookmarks: thisMonthData.length,
      topCategories,
      recentActivity: recentBookmarks.slice(0, 5),
    };
  }
}

// 싱글톤 인스턴스
let articleBookmarkService: ArticleBookmarkService;

export const getArticleBookmarkService = (): ArticleBookmarkService => {
  if (!articleBookmarkService) {
    articleBookmarkService = new ArticleBookmarkService();
  }
  return articleBookmarkService;
};
