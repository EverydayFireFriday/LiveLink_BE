import {
  getArticleModel,
  getCommentModel,
  getCommentLikeModel,
  IComment,
} from "../../models/article";
import {
  createCommentSchema,
  updateCommentSchema,
  commentIdSchema,
  getCommentsSchema,
} from "../../utils/validation/article";
import { ObjectId } from "mongodb";

export class ArticleCommentService {
  private articleModel = getArticleModel();
  private commentModel = getCommentModel();
  private commentLikeModel = getCommentLikeModel();

  // 댓글 생성
  async createComment(data: any): Promise<IComment> {
    const validatedData = createCommentSchema.parse(data);

    // 게시글 존재 확인
    const article = await this.articleModel.findById(validatedData.article_id);
    if (!article) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    // 부모 댓글 존재 확인 (대댓글인 경우)
    if (validatedData.parent_id) {
      const parentComment = await this.commentModel.findById(
        validatedData.parent_id
      );
      if (!parentComment) {
        throw new Error("부모 댓글을 찾을 수 없습니다.");
      }

      // 부모 댓글이 같은 게시글의 댓글인지 확인
      if (parentComment.article_id.toString() !== validatedData.article_id) {
        throw new Error("부모 댓글이 다른 게시글의 댓글입니다.");
      }
    }

    // 댓글 생성
    const comment = await this.commentModel.create({
      article_id: new ObjectId(validatedData.article_id),
      author_id: new ObjectId(validatedData.author_id),
      content: validatedData.content,
      parent_id: validatedData.parent_id
        ? new ObjectId(validatedData.parent_id)
        : null,
    });

    return comment;
  }

  // 댓글 조회 (ID로)
  async getCommentById(id: string): Promise<IComment> {
    commentIdSchema.parse({ id });

    const comment = await this.commentModel.findById(id);
    if (!comment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    return comment;
  }

  // 게시글의 댓글 목록 조회 (계층형, N+1 해결)
  async getCommentsByArticle(
    articleId: string,
    options: {
      page?: number;
      limit?: number;
      withLikeStatus?: boolean;
      userId?: string;
    } = {}
  ): Promise<{
    comments: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { withLikeStatus = false, userId, ...paginationOptions } = options;
    const validatedOptions = getCommentsSchema.parse({
      article_id: articleId,
      ...paginationOptions,
    });

    // 게시글 존재 확인
    const article = await this.articleModel.findById(articleId);
    if (!article) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    // 계층형 댓글 조회 (이미 최적화된 상태로 가정)
    const result = await this.commentModel.findCommentsWithReplies(articleId, {
      page: validatedOptions.page,
      limit: validatedOptions.limit,
    });

    let commentsWithStatus = result.comments;

    // 좋아요 상태 정보 추가 (사용자가 로그인한 경우)
    if (withLikeStatus && userId) {
      commentsWithStatus = await this.addLikeStatusToComments(
        result.comments,
        userId
      );
    }

    return {
      comments: commentsWithStatus,
      total: result.total,
      page: validatedOptions.page,
      totalPages: Math.ceil(result.total / validatedOptions.limit),
    };
  }

  // 댓글들에 좋아요 상태 정보 추가 (N+1 해결)
  private async addLikeStatusToComments(
    comments: IComment[],
    userId: string
  ): Promise<any[]> {
    if (comments.length === 0) return [];

    // 모든 댓글 ID 수집 (대댓글 포함)
    const allCommentIds: string[] = [];
    const collectCommentIds = (commentList: any[]) => {
      commentList.forEach((comment) => {
        allCommentIds.push(comment._id.toString());
        if (comment.replies && comment.replies.length > 0) {
          collectCommentIds(comment.replies);
        }
      });
    };
    collectCommentIds(comments);

    // 배치로 좋아요 상태와 좋아요 수 조회
    const [likeStatusMap, likeCountMap] = await Promise.all([
      this.commentLikeModel.findLikeStatusBatch
        ? this.commentLikeModel.findLikeStatusBatch(allCommentIds, userId)
        : this.getBatchCommentLikeStatus(allCommentIds, userId),
      this.getBatchCommentLikeCounts(allCommentIds),
    ]);

    // 댓글에 좋아요 정보 매핑
    const addLikeInfoToComment = (comment: any): any => {
      const commentId = comment._id.toString();
      let isLiked: boolean;

      // likeStatusMap의 타입에 따라 처리
      if (likeStatusMap instanceof Map) {
        isLiked = likeStatusMap.get(commentId) || false;
      } else {
        isLiked = likeStatusMap[commentId] || false;
      }

      return {
        ...comment,
        isLiked,
        likesCount: likeCountMap[commentId] || 0,
        replies: comment.replies
          ? comment.replies.map(addLikeInfoToComment)
          : [],
      };
    };

    return comments.map(addLikeInfoToComment);
  }

  // 배치로 댓글 좋아요 상태 조회 (헬퍼 메서드)
  private async getBatchCommentLikeStatus(
    commentIds: string[],
    userId: string
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    // 병렬로 각 댓글의 좋아요 상태 확인
    const checks = await Promise.all(
      commentIds.map(async (commentId) => ({
        commentId,
        isLiked: await this.commentLikeModel.exists(commentId, userId),
      }))
    );

    checks.forEach(({ commentId, isLiked }) => {
      result[commentId] = isLiked;
    });

    return result;
  }

  // 배치로 댓글 좋아요 수 조회 (헬퍼 메서드)
  private async getBatchCommentLikeCounts(
    commentIds: string[]
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    // 병렬로 각 댓글의 좋아요 수 조회
    const counts = await Promise.all(
      commentIds.map(async (commentId) => ({
        commentId,
        count: await this.commentLikeModel.countByComment(commentId),
      }))
    );

    counts.forEach(({ commentId, count }) => {
      result[commentId] = count;
    });

    return result;
  }

  // 댓글의 대댓글 목록 조회
  async getRepliesByComment(
    commentId: string,
    options: {
      page?: number;
      limit?: number;
      withLikeStatus?: boolean;
      userId?: string;
    } = {}
  ): Promise<{
    comments: IComment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, withLikeStatus = false, userId } = options;

    // 부모 댓글 존재 확인
    const parentComment = await this.commentModel.findById(commentId);
    if (!parentComment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    const result = await this.commentModel.findReplies(commentId, {
      page,
      limit,
    });

    let commentsWithStatus = result.comments;

    // 좋아요 상태 정보 추가
    if (withLikeStatus && userId) {
      commentsWithStatus = await this.addLikeStatusToComments(
        result.comments,
        userId
      );
    }

    return {
      comments: commentsWithStatus,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  // 댓글 수정
  async updateComment(
    id: string,
    data: any,
    authorId: string
  ): Promise<IComment> {
    commentIdSchema.parse({ id });
    const validatedData = updateCommentSchema.parse(data);

    // 댓글 존재 확인
    const comment = await this.commentModel.findById(id);
    if (!comment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    // 작성자 확인
    if (comment.author_id.toString() !== authorId) {
      throw new Error("댓글을 수정할 권한이 없습니다.");
    }

    const updatedComment = await this.commentModel.updateById(
      id,
      validatedData.content
    );
    if (!updatedComment) {
      throw new Error("댓글 수정에 실패했습니다.");
    }

    return updatedComment;
  }

  // 댓글 삭제
  async deleteComment(id: string, authorId: string): Promise<void> {
    commentIdSchema.parse({ id });

    // 댓글 존재 확인
    const comment = await this.commentModel.findById(id);
    if (!comment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    // 작성자 확인
    if (comment.author_id.toString() !== authorId) {
      throw new Error("댓글을 삭제할 권한이 없습니다.");
    }

    // 관련 좋아요 삭제
    await this.commentLikeModel.deleteByComment(id);

    // 댓글 삭제 (대댓글도 함께 삭제됨)
    await this.commentModel.deleteById(id);
  }

  // 작성자별 댓글 조회
  async getCommentsByAuthor(
    authorId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    comments: IComment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;

    const result = await this.commentModel.findByAuthor(authorId, {
      page,
      limit,
    });

    return {
      comments: result.comments,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  // 게시글의 댓글 수 조회
  async getCommentCount(articleId: string): Promise<number> {
    return await this.commentModel.countByArticle(articleId);
  }

  // 여러 게시글의 댓글 수 배치 조회 (N+1 해결)
  async getBatchCommentCounts(
    articleIds: string[]
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    // 병렬로 각 게시글의 댓글 수 조회
    const counts = await Promise.all(
      articleIds.map(async (articleId) => ({
        articleId,
        count: await this.commentModel.countByArticle(articleId),
      }))
    );

    counts.forEach(({ articleId, count }) => {
      result[articleId] = count;
    });

    return result;
  }

  // 댓글 좋아요 추가
  async likeComment(
    commentId: string,
    userId: string
  ): Promise<{ newLikesCount: number }> {
    // 댓글 존재 확인
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    // 좋아요 추가
    await this.commentLikeModel.create(commentId, userId);

    // 댓글의 좋아요 수 업데이트
    await this.commentModel.updateLikesCount(commentId, 1);

    // 새로운 좋아요 수 조회
    const newLikesCount = await this.commentLikeModel.countByComment(commentId);

    return { newLikesCount };
  }

  // 댓글 좋아요 취소
  async unlikeComment(
    commentId: string,
    userId: string
  ): Promise<{ newLikesCount: number }> {
    // 좋아요 삭제
    const deletedLike = await this.commentLikeModel.delete(commentId, userId);
    if (!deletedLike) {
      throw new Error("댓글 좋아요를 찾을 수 없습니다.");
    }

    // 댓글의 좋아요 수 업데이트
    await this.commentModel.updateLikesCount(commentId, -1);

    // 새로운 좋아요 수 조회
    const newLikesCount = await this.commentLikeModel.countByComment(commentId);

    return { newLikesCount };
  }

  // 댓글 좋아요 상태 확인
  async checkCommentLikeStatus(
    commentId: string,
    userId: string
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    const [isLiked, likesCount] = await Promise.all([
      this.commentLikeModel.exists(commentId, userId),
      this.commentLikeModel.countByComment(commentId),
    ]);

    return { isLiked, likesCount };
  }

  // 댓글 좋아요 토글
  async toggleCommentLike(
    commentId: string,
    userId: string
  ): Promise<{ isLiked: boolean; newLikesCount: number }> {
    const isCurrentlyLiked = await this.commentLikeModel.exists(
      commentId,
      userId
    );

    if (isCurrentlyLiked) {
      // 좋아요 취소
      const result = await this.unlikeComment(commentId, userId);
      return { isLiked: false, newLikesCount: result.newLikesCount };
    } else {
      // 좋아요 추가
      const result = await this.likeComment(commentId, userId);
      return { isLiked: true, newLikesCount: result.newLikesCount };
    }
  }

  // 여러 댓글의 좋아요 상태 일괄 조회 (N+1 해결)
  async checkMultipleCommentLikeStatus(
    commentIds: string[],
    userId: string
  ): Promise<Map<string, { isLiked: boolean; likesCount: number }>> {
    if (commentIds.length === 0) {
      return new Map();
    }

    const [likeStatusMap, likesCounts] = await Promise.all([
      this.getBatchCommentLikeStatus(commentIds, userId),
      this.getBatchCommentLikeCounts(commentIds),
    ]);

    const result = new Map<string, { isLiked: boolean; likesCount: number }>();

    commentIds.forEach((commentId) => {
      result.set(commentId, {
        isLiked: likeStatusMap[commentId] || false,
        likesCount: likesCounts[commentId] || 0,
      });
    });

    return result;
  }

  // 사용자의 댓글 활동 통계
  async getUserCommentStats(userId: string): Promise<{
    totalComments: number;
    totalLikesReceived: number;
    thisWeekComments: number;
    thisMonthComments: number;
    avgLikesPerComment: number;
  }> {
    // 사용자의 모든 댓글 조회
    const allComments = await this.getCommentsByAuthor(userId, {
      limit: 1000,
      page: 1,
    });

    const totalComments = allComments.total;

    // 최근 활동 계산
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const thisWeekComments = allComments.comments.filter(
      (comment) => new Date(comment.created_at) >= oneWeekAgo
    ).length;

    const thisMonthComments = allComments.comments.filter(
      (comment) => new Date(comment.created_at) >= oneMonthAgo
    ).length;

    // 받은 좋아요 수 계산
    const commentIds = allComments.comments.map((c) => c._id.toString());
    const likeCounts = await this.getBatchCommentLikeCounts(commentIds);
    const totalLikesReceived = Object.values(likeCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    const avgLikesPerComment =
      totalComments > 0 ? totalLikesReceived / totalComments : 0;

    return {
      totalComments,
      totalLikesReceived,
      thisWeekComments,
      thisMonthComments,
      avgLikesPerComment: Math.round(avgLikesPerComment * 100) / 100,
    };
  }

  // 게시글별 댓글 활동 요약
  async getCommentActivitySummary(articleIds: string[]): Promise<
    Record<
      string,
      {
        commentCount: number;
        uniqueCommenters: number;
        lastCommentAt: Date | null;
      }
    >
  > {
    const result: Record<string, any> = {};

    // 병렬로 각 게시글의 댓글 통계 조회
    await Promise.all(
      articleIds.map(async (articleId) => {
        const [commentCount, commentsData] = await Promise.all([
          this.getCommentCount(articleId),
          this.getCommentsByArticle(articleId, { limit: 100, page: 1 }),
        ]);

        const uniqueCommenters = new Set(
          commentsData.comments.map((c) => c.author_id.toString())
        ).size;

        const lastCommentAt =
          commentsData.comments.length > 0
            ? new Date(
                Math.max(
                  ...commentsData.comments.map((c) =>
                    new Date(c.created_at).getTime()
                  )
                )
              )
            : null;

        result[articleId] = {
          commentCount,
          uniqueCommenters,
          lastCommentAt,
        };
      })
    );

    return result;
  }

  // 인기 댓글 조회 (좋아요 수 기준)
  async getPopularComments(
    options: {
      articleId?: string;
      page?: number;
      limit?: number;
      days?: number;
    } = {}
  ): Promise<{
    comments: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { articleId, page = 1, limit = 20, days = 7 } = options;

    // 이 기능을 완전히 구현하려면 CommentModel에 추가 메서드가 필요
    // 임시로 기본 댓글 조회 후 좋아요 수로 정렬
    let commentsResult;

    if (articleId) {
      commentsResult = await this.getCommentsByArticle(articleId, {
        page,
        limit,
      });
    } else {
      // 전체 댓글에서 인기 댓글 조회는 Model 레벨 구현 필요
      return { comments: [], total: 0, page, totalPages: 0 };
    }

    // 좋아요 수 기준으로 정렬 (클라이언트에서 처리하거나 DB 쿼리로 개선 필요)
    const commentsWithLikes = await Promise.all(
      commentsResult.comments.map(async (comment: any) => {
        const likesCount = await this.commentLikeModel.countByComment(
          comment._id.toString()
        );
        return { ...comment, likesCount };
      })
    );

    const sortedComments = commentsWithLikes.sort(
      (a, b) => b.likesCount - a.likesCount
    );

    return {
      comments: sortedComments,
      total: commentsResult.total,
      page,
      totalPages: commentsResult.totalPages,
    };
  }
}

// 싱글톤 인스턴스
let articleCommentService: ArticleCommentService;

export const getArticleCommentService = (): ArticleCommentService => {
  if (!articleCommentService) {
    articleCommentService = new ArticleCommentService();
  }
  return articleCommentService;
};
