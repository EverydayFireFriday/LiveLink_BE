// types/article/likeTypes.ts
export interface ArticleLike {
  id: number;
  article_id: number;
  user_id: number;
  created_at: Date;
}

export interface CreateArticleLikeInput {
  article_id: number;
  user_id: number;
}

export interface CommentLike {
  id: number;
  comment_id: number;
  user_id: number;
  created_at: Date;
}

export interface CreateCommentLikeInput {
  comment_id: number;
  user_id: number;
}
