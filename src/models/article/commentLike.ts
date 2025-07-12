// models/article/commentLike.ts
import { ObjectId, Collection, Db } from "mongodb";

export interface ICommentLike {
  _id: ObjectId;
  comment_id: ObjectId;
  user_id: ObjectId;
  created_at: Date;
}

export class CommentLikeModel {
  private db: Db;
  private collection: Collection<ICommentLike>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<ICommentLike>("comment_likes");
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      console.log("CommentLike 인덱스 생성 시작...");
      
      // 중복 좋아요 방지를 위한 복합 유니크 인덱스
      await this.collection.createIndex(
        { comment_id: 1, user_id: 1 }, 
        { unique: true }
      );
      
      // 조회 최적화 인덱스
      await this.collection.createIndex({ comment_id: 1, created_at: -1 });
      await this.collection.createIndex({ user_id: 1, created_at: -1 });
      
      console.log("✅ CommentLike 인덱스 생성 완료");
    } catch (error) {
      console.error("❌ CommentLike 인덱스 생성 중 오류:", error);
    }
  }

  // 댓글 좋아요 추가
  async create(commentId: string, userId: string): Promise<ICommentLike> {
    if (!ObjectId.isValid(commentId) || !ObjectId.isValid(userId)) {
      throw new Error("유효하지 않은 ID입니다.");
    }

    const commentObjectId = new ObjectId(commentId);
    const userObjectId = new ObjectId(userId);

    // 이미 좋아요했는지 확인
    const existingLike = await this.collection.findOne({
      comment_id: commentObjectId,
      user_id: userObjectId,
    });

    if (existingLike) {
      throw new Error("이미 좋아요한 댓글입니다.");
    }

    const like: ICommentLike = {
      _id: new ObjectId(),
      comment_id: commentObjectId,
      user_id: userObjectId,
      created_at: new Date(),
    };

    const result = await this.collection.insertOne(like);
    if (!result.insertedId) {
      throw new Error("댓글 좋아요 추가에 실패했습니다.");
    }

    return like;
  }

  // 댓글 좋아요 삭제
  async delete(commentId: string, userId: string): Promise<ICommentLike | null> {
    if (!ObjectId.isValid(commentId) || !ObjectId.isValid(userId)) {
      return null;
    }

    const result = await this.collection.findOneAndDelete({
      comment_id: new ObjectId(commentId),
      user_id: new ObjectId(userId),
    });

    return result || null;
  }

  // 댓글 좋아요 상태 확인
  async exists(commentId: string, userId: string): Promise<boolean> {
    if (!ObjectId.isValid(commentId) || !ObjectId.isValid(userId)) {
      return false;
    }

    const like = await this.collection.findOne({
      comment_id: new ObjectId(commentId),
      user_id: new ObjectId(userId),
    });

    return !!like;
  }

  // 댓글의 좋아요 수 조회
  async countByComment(commentId: string): Promise<number> {
    if (!ObjectId.isValid(commentId)) {
      return 0;
    }

    return await this.collection.countDocuments({
      comment_id: new ObjectId(commentId),
    });
  }

  // 사용자가 좋아요한 댓글 ID 목록
  async findCommentIdsByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ commentIds: string[]; total: number }> {
    if (!ObjectId.isValid(userId)) {
      return { commentIds: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.collection
        .find({ user_id: new ObjectId(userId) })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({ user_id: new ObjectId(userId) }),
    ]);

    const commentIds = likes.map(like => like.comment_id.toString());
    return { commentIds, total };
  }

  // 댓글을 좋아요한 사용자 ID 목록
  async findUserIdsByComment(
    commentId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ userIds: string[]; total: number }> {
    if (!ObjectId.isValid(commentId)) {
      return { userIds: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.collection
        .find({ comment_id: new ObjectId(commentId) })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({ comment_id: new ObjectId(commentId) }),
    ]);

    const userIds = likes.map(like => like.user_id.toString());
    return { userIds, total };
  }

  // 여러 댓글의 좋아요 상태 일괄 조회
  async findLikeStatusBatch(
    commentIds: string[],
    userId: string
  ): Promise<Map<string, boolean>> {
    const likeStatusMap = new Map<string, boolean>();

    if (!ObjectId.isValid(userId) || commentIds.length === 0) {
      return likeStatusMap;
    }

    const validCommentIds = commentIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    if (validCommentIds.length === 0) {
      return likeStatusMap;
    }

    const likes = await this.collection
      .find({
        comment_id: { $in: validCommentIds },
        user_id: new ObjectId(userId),
      })
      .toArray();

    // 모든 commentId를 false로 초기화
    commentIds.forEach(id => {
      if (ObjectId.isValid(id)) {
        likeStatusMap.set(id, false);
      }
    });

    // 좋아요한 댓글들을 true로 설정
    likes.forEach(like => {
      likeStatusMap.set(like.comment_id.toString(), true);
    });

    return likeStatusMap;
  }

  // 댓글 삭제시 관련 좋아요 삭제
  async deleteByComment(commentId: string): Promise<number> {
    if (!ObjectId.isValid(commentId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      comment_id: new ObjectId(commentId),
    });

    return result.deletedCount || 0;
  }

  // 여러 댓글 삭제시 관련 좋아요 삭제
  async deleteByComments(commentIds: string[]): Promise<number> {
    const validCommentIds = commentIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    if (validCommentIds.length === 0) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      comment_id: { $in: validCommentIds },
    });

    return result.deletedCount || 0;
  }

  // 사용자 삭제시 관련 좋아요 삭제
  async deleteByUser(userId: string): Promise<number> {
    if (!ObjectId.isValid(userId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      user_id: new ObjectId(userId),
    });

    return result.deletedCount || 0;
  }

  // 게시글 삭제시 해당 게시글의 모든 댓글 좋아요 삭제
  async deleteByArticle(articleId: string): Promise<number> {
    if (!ObjectId.isValid(articleId)) {
      return 0;
    }

    // 먼저 해당 게시글의 모든 댓글 ID를 찾음
    const commentCollection = this.db.collection("comments");
    const comments = await commentCollection
      .find({ article_id: new ObjectId(articleId) }, { projection: { _id: 1 } })
      .toArray();

    if (comments.length === 0) {
      return 0;
    }

    const commentIds = comments.map(comment => comment._id);

    // 해당 댓글들의 모든 좋아요 삭제
    const result = await this.collection.deleteMany({
      comment_id: { $in: commentIds },
    });

    return result.deletedCount || 0;
  }
}

// 전역 CommentLike 인스턴스
let commentLikeModel: CommentLikeModel;

export const initializeCommentLikeModel = (db: Db): CommentLikeModel => {
  commentLikeModel = new CommentLikeModel(db);
  return commentLikeModel;
};

export const getCommentLikeModel = (): CommentLikeModel => {
  if (!commentLikeModel) {
    throw new Error("CommentLike 모델이 초기화되지 않았습니다.");
  }
  return commentLikeModel;
};

export const CommentLike = {
  init: initializeCommentLikeModel,
  get: getCommentLikeModel,
};