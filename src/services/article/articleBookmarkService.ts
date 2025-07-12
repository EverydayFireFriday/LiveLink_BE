// services/article/articleBookmarkService.ts
import {
  getArticleModel,
  getArticleBookmarkModel,
  IArticleBookmark,
} from "../../models/article";
import {
  createBookmarkSchema,
  deleteBookmarkSchema,
  getUserBookmarksSchema,
} from "../../utils/validation/article";

export class ArticleBookmarkService {
  private articleModel = getArticleModel();
  private articleBookmarkModel = getArticleBookmarkModel();

  // 북마크 추가
  async bookmarkArticle(data: any): Promise<IArticleBookmark> {
    const validatedData = createBookmarkSchema.parse(data);

    // 게시글 존재 확인
    const article = await this.articleModel.findById(
      validatedData.article_id.toString()
    );
    if (!article) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    // 북마크 추가
    const bookmark = await this.articleBookmarkModel.create(
      validatedData.article_id.toString(),
      validatedData.user_id.toString()
    );

    return bookmark;
  }

  // 북마크 삭제
  async unbookmarkArticle(data: any): Promise<{ success: boolean }> {
    const validatedData = deleteBookmarkSchema.parse(data);

    // 북마크 삭제
    const deletedBookmark = await this.articleBookmarkModel.delete(
      validatedData.article_id.toString(),
      validatedData.user_id.toString()
    );

    if (!deletedBookmark) {
      throw new Error("북마크를 찾을 수 없습니다.");
    }

    return { success: true };
  }

  // 북마크 상태 확인
  async checkBookmarkStatus(
    articleId: string,
    userId: string
  ): Promise<{ isBookmarked: boolean }> {
    const isBookmarked = await this.articleBookmarkModel.exists(
      articleId,
      userId
    );
    return { isBookmarked };
  }

  // 여러 게시글의 북마크 상태 일괄 조회
  async checkMultipleBookmarkStatus(
    articleIds: string[],
    userId: string
  ): Promise<Map<string, boolean>> {
    return await this.articleBookmarkModel.findBookmarkStatusBatch(
      articleIds,
      userId
    );
  }

  // 북마크 토글 (있으면 삭제, 없으면 추가)
  async toggleBookmark(
    articleId: string,
    userId: string
  ): Promise<{ isBookmarked: boolean }> {
    const isCurrentlyBookmarked = await this.articleBookmarkModel.exists(
      articleId,
      userId
    );

    if (isCurrentlyBookmarked) {
      // 북마크 삭제
      await this.unbookmarkArticle({
        article_id: parseInt(articleId),
        user_id: parseInt(userId),
      });
      return { isBookmarked: false };
    } else {
      // 북마크 추가
      await this.bookmarkArticle({
        article_id: parseInt(articleId),
        user_id: parseInt(userId),
      });
      return { isBookmarked: true };
    }
  }

  // 사용자의 북마크 목록 조회
  async getUserBookmarks(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    bookmarks: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const validatedOptions = getUserBookmarksSchema.parse({
      user_id: parseInt(userId),
      ...options,
    });

    const result = await this.articleBookmarkModel.findBookmarkedArticlesByUser(
      userId,
      {
        page: validatedOptions.page,
        limit: validatedOptions.limit,
      }
    );

    return {
      bookmarks: result.bookmarks,
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
    } = {}
  ): Promise<{
    userIds: string[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;

    const result = await this.articleBookmarkModel.findUserIdsByArticle(
      articleId,
      { page, limit }
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

  // 사용자의 북마크 통계
  async getUserBookmarkStats(userId: string): Promise<{
    totalBookmarks: number;
    recentBookmarks: number;
  }> {
    return await this.articleBookmarkModel.getUserBookmarkStats(userId);
  }

  // 인기 북마크 게시글 조회
  async getPopularBookmarkedArticles(
    options: {
      page?: number;
      limit?: number;
      days?: number;
    } = {}
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, days = 30 } = options;

    const result =
      await this.articleBookmarkModel.findPopularBookmarkedArticles({
        page,
        limit,
        days,
      });

    return {
      articles: result.articles,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
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
