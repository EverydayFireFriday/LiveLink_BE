// types/article/likeTypes.ts
export interface ArticleLike {
  id: string;        // number → string
  article_id: string; // number → string
  user_id: string;   // number → string
  created_at: Date;
}

export interface CreateArticleLikeInput {
  article_id: string; // number → string
  user_id: string;   // number → string
}

export interface CommentLike {
  id: string;        // number → string
  comment_id: string; // number → string
  user_id: string;   // number → string
  created_at: Date;
}

export interface CreateCommentLikeInput {
  comment_id: string; // number → string
  user_id: string;   // number → string
}
