// types/article/commentTypes.ts
export interface Comment {
  id: number;
  article_id: number;
  author_id: number;
  content: string;
  parent_id: number | null;
  created_at: Date;
  updated_at: Date;
  likes_count: number;
}

export interface CommentWithRelations extends Comment {
  author: {
    id: number;
    username: string;
  };
  replies?: CommentWithRelations[];
}

export interface CreateCommentInput {
  article_id: number;
  author_id: number;
  content: string;
  parent_id?: number;
}

export interface UpdateCommentInput {
  content: string;
}
