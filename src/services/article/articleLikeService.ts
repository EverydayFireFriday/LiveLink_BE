// services/article/articleLikeService.ts
import {
  getArticleModel,
  getArticleLikeModel,
  IArticleLike,
} from "../../models/article";
import {
  createArticleLikeSchema,
  deleteArticleLikeSchema,
} from "../../utils/validation/article";

export class ArticleLikeService {
  private articleModel = getArticleModel();
  private articleLikeModel = getArticleLikeModel();

  // 게시글 좋아요 추가
  async likeArticle(
    data: any
  ): Promise<{ like: IArticleLike; newLikesCount: number }> {
    const validatedData = createArticleLikeSchema.parse(data);

    // 게시글 존재 확인
    const article = await this.articleModel.findById(
      validatedData.article_id.toString()
    );
    if (!article) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    // 좋아요 추가
    const like = await this.articleLikeModel.create(
      validatedData.article_id.toString(),
      validatedData.user_id.toString()
    );

    // 게시글의 좋아요 수 업데이트
    await this.articleModel.updateLikesCount(
      validatedData.article_id.toString(),
      1
    );

    // 새로운 좋아요 수 조회
    const newLikesCount = await this.articleLikeModel.countByArticle(
      validatedData.article_id.toString()
    );

    return { like, newLikesCount };
  }

  // 게시글 좋아요 취소
  async unlikeArticle(
    data: any
  ): Promise<{ success: boolean; newLikesCount: number }> {
    const validatedData = deleteArticleLikeSchema.parse(data);

    // 좋아요 삭제
    const deletedLike = await this.articleLikeModel.delete(
      validatedData.article_id.toString(),
      validatedData.user_id.toString()
    );

    if (!deletedLike) {
      throw new Error("좋아요를 찾을 수 없습니다.");
    }

    // 게시글의 좋아요 수 업데이트
    await this.articleModel.updateLikesCount(
      validatedData.article_id.toString(),
      -1
    );

    // 새로운 좋아요 수 조회
    const newLikesCount = await this.articleLikeModel.countByArticle(
      validatedData.article_id.toString()
    );

    return { success: true, newLikesCount };
  }

  // 좋아요 상태 확인
  async checkLikeStatus(
    articleId: string,
    userId: string
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    const [isLiked, likesCount] = await Promise.all([
      this.articleLikeModel.exists(articleId, userId),
      this.articleLikeModel.countByArticle(articleId),
    ]);

    return { isLiked, likesCount };
  }

  // 여러 게시글의 좋아요 상태 일괄 조회 (N+1 해결)
  async checkMultipleLikeStatus(
    articleIds: string[],
    userId: string
  ): Promise<Map<string, { isLiked: boolean; likesCount: number }>> {
    if (articleIds.length === 0) {
      return new Map();
    }

    // 배치로 좋아요 상태와 좋아요 수를 동시에 조회
    const [likeStatusMap, likesCountMap] = await Promise.all([
      this.articleLikeModel.checkLikeStatusForArticles(userId, articleIds),
      this.articleLikeModel.countByArticleIds(articleIds),
    ]);

    const result = new Map<string, { isLiked: boolean; likesCount: number }>();

    articleIds.forEach((articleId) => {
      result.set(articleId, {
        isLiked: likeStatusMap[articleId] || false,
        likesCount: likesCountMap[articleId] || 0,
      });
    });

    return result;
  }

  // 게시글을 좋아요한 사용자 목록
  async getArticleLikers(
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

    const result = await this.articleLikeModel.findUserIdsByArticle(articleId, {
      page,
      limit,
    });

    return {
      userIds: result.userIds,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  // 사용자가 좋아요한 게시글 ID 목록
  async getUserLikedArticles(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    articleIds: string[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;

    const result = await this.articleLikeModel.findArticleIdsByUser(userId, {
      page,
      limit,
    });

    return {
      articleIds: result.articleIds,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  // 좋아요 토글 (있으면 취소, 없으면 추가)
  async toggleLike(
    articleId: string,
    userId: string
  ): Promise<{ isLiked: boolean; newLikesCount: number }> {
    const isCurrentlyLiked = await this.articleLikeModel.exists(
      articleId,
      userId
    );

    if (isCurrentlyLiked) {
      // 좋아요 취소
      const result = await this.unlikeArticle({
        article_id: parseInt(articleId),
        user_id: parseInt(userId),
      });
      return { isLiked: false, newLikesCount: result.newLikesCount };
    } else {
      // 좋아요 추가
      const result = await this.likeArticle({
        article_id: parseInt(articleId),
        user_id: parseInt(userId),
      });
      return { isLiked: true, newLikesCount: result.newLikesCount };
    }
  }

  // 여러 게시글의 좋아요 수 배치 조회 (N+1 해결)
  async getLikeCounts(articleIds: string[]): Promise<Record<string, number>> {
    return await this.articleLikeModel.countByArticleIds(articleIds);
  }

  // 배치로 여러 사용자의 좋아요 수 조회
  async getBatchUserLikeCounts(
    userIds: string[]
  ): Promise<Record<string, number>> {
    return await this.articleLikeModel.countByUserIds(userIds);
  }

  // 인기 게시글 조회 (최근 N일간 좋아요 기준, N+1 해결)
  async getMostLikedArticles(
    options: {
      page?: number;
      limit?: number;
      days?: number;
    } = {}
  ): Promise<{
    articles: Array<{ article_id: string; likeCount: number }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, days = 7 } = options;

    // 이미 집계된 데이터를 반환하므로 추가 쿼리 불필요
    const result = await this.articleLikeModel.findMostLikedArticles({
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

  // 특정 사용자들이 특정 게시글을 좋아요했는지 배치 확인
  async checkBatchLikeStatus(
    userIds: string[],
    articleId: string
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    // 각 사용자별로 좋아요 상태 확인 (더 효율적인 방법으로 개선 가능)
    const checks = await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        isLiked: await this.articleLikeModel.exists(articleId, userId),
      }))
    );

    checks.forEach(({ userId, isLiked }) => {
      result[userId] = isLiked;
    });

    return result;
  }

  // 사용자가 최근 좋아요한 게시글들 (시간순)
  async getRecentLikedArticles(
    userId: string,
    options: {
      limit?: number;
      days?: number;
    } = {}
  ): Promise<string[]> {
    const { limit = 10, days = 7 } = options;

    // 최근 좋아요한 게시글 ID들을 시간순으로 조회
    const result = await this.getUserLikedArticles(userId, { limit, page: 1 });

    return result.articleIds;
  }

  // 좋아요 통계 대시보드용 데이터
  async getLikeStatsDashboard(userId: string): Promise<{
    totalLikes: number;
    thisWeekLikes: number;
    thisMonthLikes: number;
    mostLikedCategories: Array<{ category: string; count: number }>;
    recentActivity: string[];
  }> {
    // 병렬로 여러 통계 데이터 조회
    const [totalLikesResult, recentLikedArticles, thisWeekData, thisMonthData] =
      await Promise.all([
        this.getUserLikedArticles(userId, { limit: 1000, page: 1 }),
        this.getRecentLikedArticles(userId, { limit: 5, days: 30 }),
        this.getRecentLikedArticles(userId, { limit: 100, days: 7 }),
        this.getRecentLikedArticles(userId, { limit: 100, days: 30 }),
      ]);

    return {
      totalLikes: totalLikesResult.total,
      thisWeekLikes: thisWeekData.length,
      thisMonthLikes: thisMonthData.length,
      mostLikedCategories: [], // 카테고리 정보가 필요한 경우 추가 구현
      recentActivity: recentLikedArticles,
    };
  }

  // 게시글별 좋아요 트렌드 분석 (최근 N일간 일별 좋아요 수)
  async getLikeTrends(
    articleId: string,
    days: number = 30
  ): Promise<Array<{ date: string; likes: number }>> {
    // 이 기능은 Model에서 일별 집계 쿼리가 필요함
    // MongoDB aggregation을 사용해서 구현해야 함

    // 임시로 빈 배열 반환, 실제로는 Model에 메서드 추가 필요
    return [];
  }

  // 사용자 간 좋아요 유사도 분석 (추천 시스템용)
  async getUserLikeSimilarity(
    userId1: string,
    userId2: string
  ): Promise<{ similarity: number; commonLikes: number }> {
    const [user1Likes, user2Likes] = await Promise.all([
      this.getUserLikedArticles(userId1, { limit: 1000, page: 1 }),
      this.getUserLikedArticles(userId2, { limit: 1000, page: 1 }),
    ]);

    const user1Set = new Set(user1Likes.articleIds);
    const user2Set = new Set(user2Likes.articleIds);

    const commonLikes = [...user1Set].filter((id) => user2Set.has(id)).length;
    const totalUnique = new Set([
      ...user1Likes.articleIds,
      ...user2Likes.articleIds,
    ]).size;

    const similarity = totalUnique > 0 ? commonLikes / totalUnique : 0;

    return { similarity, commonLikes };
  }
}

// 싱글톤 인스턴스
let articleLikeService: ArticleLikeService;

export const getArticleLikeService = (): ArticleLikeService => {
  if (!articleLikeService) {
    articleLikeService = new ArticleLikeService();
  }
  return articleLikeService;
};
