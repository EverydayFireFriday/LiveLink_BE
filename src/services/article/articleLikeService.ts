import { ObjectId } from 'mongodb';
import { getArticleModel, IArticle } from '../../models/article';
import { UserModel } from '../../models/auth/user';
import { getClient } from '../../utils/database/db';

export class ArticleLikeService {
  private articleModel = getArticleModel();
  private userModel = new UserModel();

  // 게시글 좋아요 토글 (있으면 취소, 없으면 추가)
  async toggleLike(
    articleId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; newLikesCount: number }> {
    const client = getClient();
    const session = client.startSession();

    try {
      if (!articleId || !userId) {
        throw new Error('Article ID and User ID are required.');
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found.');
      }

      const article = await this.articleModel.findById(articleId);
      if (!article) {
        throw new Error('Article not found.');
      }

      const articleObjectId = new ObjectId(articleId);
      const isCurrentlyLiked =
        user.likedArticles?.some((id) => id.equals(articleObjectId)) || false;

      let newLikesCount = article.likes_count;

      if (isCurrentlyLiked) {
        // --- 좋아요 취소 ---
        await session.withTransaction(async () => {
          const userUpdateResult =
            await this.userModel.userCollection.updateOne(
              { _id: new ObjectId(userId) },
              { $pull: { likedArticles: articleObjectId } },
              { session },
            );

          if (userUpdateResult.modifiedCount > 0) {
            await this.articleModel.updateLikesCount(articleId, -1, session);
            newLikesCount = Math.max(0, newLikesCount - 1);
          }
        });

        return { isLiked: false, newLikesCount };
      } else {
        // --- 좋아요 추가 ---
        await session.withTransaction(async () => {
          const userUpdateResult =
            await this.userModel.userCollection.updateOne(
              { _id: new ObjectId(userId) },
              { $addToSet: { likedArticles: articleObjectId } },
              { session },
            );

          if (userUpdateResult.modifiedCount > 0) {
            await this.articleModel.updateLikesCount(articleId, 1, session);
            newLikesCount += 1;
          }
        });

        return { isLiked: true, newLikesCount };
      }
    } finally {
      await session.endSession();
    }
  }

  // 좋아요 상태 확인
  async checkLikeStatus(
    articleId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    const [user, article] = await Promise.all([
      this.userModel.findById(userId),
      this.articleModel.findById(articleId),
    ]);

    if (!article) {
      throw new Error('Article not found.');
    }

    const isLiked =
      user?.likedArticles?.some((id) => id.equals(new ObjectId(articleId))) ||
      false;

    return { isLiked, likesCount: article.likes_count };
  }

  // 사용자가 좋아요한 게시글 목록
  async getUserLikedArticles(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    articles: IArticle[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;

    const user = await this.userModel.findById(userId);
    if (!user || !user.likedArticles || user.likedArticles.length === 0) {
      return { articles: [], total: 0, page, totalPages: 0 };
    }

    const likedArticleIds = user.likedArticles.map((id) => id.toString());
    const total = likedArticleIds.length;
    const totalPages = Math.ceil(total / limit);

    // 좋아요 누른 순서대로 정렬하기 위해, 최신순으로 ID를 자름
    const paginatedIds = [...likedArticleIds]
      .reverse()
      .slice((page - 1) * limit, page * limit);

    if (paginatedIds.length === 0) {
      return { articles: [], total, page, totalPages };
    }

    const articles = await this.articleModel.findByIds(paginatedIds);

    return {
      articles,
      total,
      page,
      totalPages,
    };
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
