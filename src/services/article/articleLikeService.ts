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

  // 여러 게시글의 좋아요 상태 일괄 조회
  async checkMultipleLikeStatus(
    articleIds: string[],
    userId: string
  ): Promise<Map<string, { isLiked: boolean; likesCount: number }>> {
    const [likeStatusMap, likesCounts] = await Promise.all([
      this.articleLikeModel.findLikeStatusBatch(articleIds, userId),
      Promise.all(
        articleIds.map((id) => this.articleLikeModel.countByArticle(id))
      ),
    ]);

    const result = new Map<string, { isLiked: boolean; likesCount: number }>();

    articleIds.forEach((articleId, index) => {
      result.set(articleId, {
        isLiked: likeStatusMap.get(articleId) || false,
        likesCount: likesCounts[index] || 0,
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
}

// 싱글톤 인스턴스
let articleLikeService: ArticleLikeService;

export const getArticleLikeService = (): ArticleLikeService => {
  if (!articleLikeService) {
    articleLikeService = new ArticleLikeService();
  }
  return articleLikeService;
};
