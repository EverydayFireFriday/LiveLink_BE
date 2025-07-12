// models/article/comment.ts
import { ObjectId, Collection, Db } from "mongodb";

export interface IComment {
  _id: ObjectId;
  article_id: ObjectId;
  author_id: ObjectId;
  content: string;
  parent_id: ObjectId | null;
  created_at: Date;
  updated_at: Date;
  likes_count: number;
}

export class CommentModel {
  private db: Db;
  private collection: Collection<IComment>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<IComment>("comments");
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      console.log("Comment 인덱스 생성 시작...");

      // 조회 최적화 인덱스
      await this.collection.createIndex({ article_id: 1, created_at: -1 });
      await this.collection.createIndex({ parent_id: 1, created_at: 1 });
      await this.collection.createIndex({ author_id: 1, created_at: -1 });

      console.log("✅ Comment 인덱스 생성 완료");
    } catch (error) {
      console.error("❌ Comment 인덱스 생성 중 오류:", error);
    }
  }

  // 댓글 생성
  async create(
    commentData: Omit<
      IComment,
      "_id" | "created_at" | "updated_at" | "likes_count"
    >
  ): Promise<IComment> {
    if (
      !ObjectId.isValid(commentData.article_id) ||
      !ObjectId.isValid(commentData.author_id)
    ) {
      throw new Error("유효하지 않은 ID입니다.");
    }

    // parent_id가 제공된 경우 유효성 검사
    if (commentData.parent_id && !ObjectId.isValid(commentData.parent_id)) {
      throw new Error("유효하지 않은 부모 댓글 ID입니다.");
    }

    const now = new Date();
    const comment: IComment = {
      _id: new ObjectId(),
      article_id: new ObjectId(commentData.article_id),
      author_id: new ObjectId(commentData.author_id),
      content: commentData.content,
      parent_id: commentData.parent_id
        ? new ObjectId(commentData.parent_id)
        : null,
      created_at: now,
      updated_at: now,
      likes_count: 0,
    };

    const result = await this.collection.insertOne(comment);
    if (!result.insertedId) {
      throw new Error("댓글 생성에 실패했습니다.");
    }

    return comment;
  }

  // 댓글 조회 (ID로)
  async findById(id: string): Promise<IComment | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  // 게시글의 댓글 목록 조회 (계층형)
  async findByArticle(
    articleId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ comments: IComment[]; total: number }> {
    if (!ObjectId.isValid(articleId)) {
      return { comments: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // 최상위 댓글만 조회 (parent_id가 null인 것들)
    const [comments, total] = await Promise.all([
      this.collection
        .find({
          article_id: new ObjectId(articleId),
          parent_id: null,
        })
        .sort({ created_at: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({
        article_id: new ObjectId(articleId),
        parent_id: null,
      }),
    ]);

    return { comments, total };
  }

  // 대댓글 조회
  async findReplies(
    parentId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ comments: IComment[]; total: number }> {
    if (!ObjectId.isValid(parentId)) {
      return { comments: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.collection
        .find({ parent_id: new ObjectId(parentId) })
        .sort({ created_at: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({ parent_id: new ObjectId(parentId) }),
    ]);

    return { comments, total };
  }

  // 게시글의 모든 댓글 조회 (대댓글 포함)
  async findAllByArticle(articleId: string): Promise<IComment[]> {
    if (!ObjectId.isValid(articleId)) {
      return [];
    }

    return await this.collection
      .find({ article_id: new ObjectId(articleId) })
      .sort({ created_at: 1 })
      .toArray();
  }

  // 댓글 수정
  async updateById(id: string, content: string): Promise<IComment | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          content,
          updated_at: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    return result || null;
  }

  // 댓글 삭제
  async deleteById(id: string): Promise<IComment | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    // 먼저 대댓글들도 삭제
    await this.collection.deleteMany({ parent_id: new ObjectId(id) });

    // 그 다음 본 댓글 삭제
    const result = await this.collection.findOneAndDelete({
      _id: new ObjectId(id),
    });
    return result || null;
  }

  // 좋아요 수 업데이트
  async updateLikesCount(id: string, increment: number): Promise<void> {
    if (!ObjectId.isValid(id)) {
      return;
    }

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { likes_count: increment },
        $set: { updated_at: new Date() },
      }
    );
  }

  // 작성자별 댓글 조회
  async findByAuthor(
    authorId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ comments: IComment[]; total: number }> {
    if (!ObjectId.isValid(authorId)) {
      return { comments: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.collection
        .find({ author_id: new ObjectId(authorId) })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({ author_id: new ObjectId(authorId) }),
    ]);

    return { comments, total };
  }

  // 게시글의 댓글 수 조회
  async countByArticle(articleId: string): Promise<number> {
    if (!ObjectId.isValid(articleId)) {
      return 0;
    }

    return await this.collection.countDocuments({
      article_id: new ObjectId(articleId),
    });
  }

  // 게시글 삭제시 관련 댓글 삭제
  async deleteByArticle(articleId: string): Promise<number> {
    if (!ObjectId.isValid(articleId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      article_id: new ObjectId(articleId),
    });

    return result.deletedCount || 0;
  }

  // 사용자 삭제시 관련 댓글 삭제
  async deleteByUser(userId: string): Promise<number> {
    if (!ObjectId.isValid(userId)) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      author_id: new ObjectId(userId),
    });

    return result.deletedCount || 0;
  }

  // 댓글과 대댓글을 계층형으로 정리
  async findCommentsWithReplies(
    articleId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    comments: (IComment & { replies?: IComment[] })[];
    total: number;
  }> {
    if (!ObjectId.isValid(articleId)) {
      return { comments: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;

    // 최상위 댓글 조회
    const { comments: parentComments, total } = await this.findByArticle(
      articleId,
      { page, limit }
    );

    if (parentComments.length === 0) {
      return { comments: [], total };
    }

    // 각 최상위 댓글의 대댓글들 조회
    const commentsWithReplies = await Promise.all(
      parentComments.map(async (comment) => {
        const { comments: replies } = await this.findReplies(
          comment._id.toString()
        );
        return { ...comment, replies };
      })
    );

    return { comments: commentsWithReplies, total };
  }
}

// 전역 Comment 인스턴스
let commentModel: CommentModel;

export const initializeCommentModel = (db: Db): CommentModel => {
  commentModel = new CommentModel(db);
  return commentModel;
};

export const getCommentModel = (): CommentModel => {
  if (!commentModel) {
    throw new Error("Comment 모델이 초기화되지 않았습니다.");
  }
  return commentModel;
};

export const Comment = {
  init: initializeCommentModel,
  get: getCommentModel,
};
