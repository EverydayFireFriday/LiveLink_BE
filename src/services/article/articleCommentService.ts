// services/article/articleCommentService.ts
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
    const article = await this.articleModel.findById(
      validatedData.article_id.toString()
    );
    if (!article) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    // 부모 댓글 존재 확인 (대댓글인 경우)
    if (validatedData.parent_id) {
      const parentComment = await this.commentModel.findById(
        validatedData.parent_id.toString()
      );
      if (!parentComment) {
        throw new Error("부모 댓글을 찾을 수 없습니다.");
      }

      // 부모 댓글이 같은 게시글의 댓글인지 확인
      if (
        parentComment.article_id.toString() !==
        validatedData.article_id.toString()
      ) {
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
    commentIdSchema.parse({ id: parseInt(id) });

    const comment = await this.commentModel.findById(id);
    if (!comment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    return comment;
  }

  // 게시글의 댓글 목록 조회 (계층형)
  async getCommentsByArticle(
    articleId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    comments: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const validatedOptions = getCommentsSchema.parse({
      article_id: parseInt(articleId),
      ...options,
    });

    // 게시글 존재 확인
    const article = await this.articleModel.findById(articleId);
    if (!article) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    // 계층형 댓글 조회
    const result = await this.commentModel.findCommentsWithReplies(articleId, {
      page: validatedOptions.page,
      limit: validatedOptions.limit,
    });

    return {
      comments: result.comments,
      total: result.total,
      page: validatedOptions.page,
      totalPages: Math.ceil(result.total / validatedOptions.limit),
    };
  }

  // 댓글의 대댓글 목록 조회
  async getRepliesByComment(
    commentId: string,
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

    // 부모 댓글 존재 확인
    const parentComment = await this.commentModel.findById(commentId);
    if (!parentComment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    const result = await this.commentModel.findReplies(commentId, {
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

  // 댓글 수정
  async updateComment(
    id: string,
    data: any,
    authorId: string
  ): Promise<IComment> {
    commentIdSchema.parse({ id: parseInt(id) });
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
    commentIdSchema.parse({ id: parseInt(id) });

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

  // 여러 댓글의 좋아요 상태 일괄 조회
  async checkMultipleCommentLikeStatus(
    commentIds: string[],
    userId: string
  ): Promise<Map<string, { isLiked: boolean; likesCount: number }>> {
    const [likeStatusMap, likesCounts] = await Promise.all([
      this.commentLikeModel.findLikeStatusBatch(commentIds, userId),
      Promise.all(
        commentIds.map((id) => this.commentLikeModel.countByComment(id))
      ),
    ]);

    const result = new Map<string, { isLiked: boolean; likesCount: number }>();

    commentIds.forEach((commentId, index) => {
      result.set(commentId, {
        isLiked: likeStatusMap.get(commentId) || false,
        likesCount: likesCounts[index] || 0,
      });
    });

    return result;
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
