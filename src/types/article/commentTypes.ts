// types/article/commentTypes.ts
export interface Comment {
  id: string;        // number → string
  article_id: string; // number → string
  author_id: string; // number → string
  content: string;
  parent_id: string |parent_id: string | null; // number → string
  created_at: Date;
  updated_at: Date;
  likes_count: number; // 실제 카운트는 number 유지
}

export interface CommentWithRelations extends Comment {
  author: {
    id: string;      // number → string
    username: string;
    email: string;
  };
  replies?: CommentWithRelations[];
}

export interface CreateCommentInput {
  article_id: string; // number → string
  author_id: string; // number → string
  content: string;
  parent_id?: string; // number → string
}

export interface UpdateCommentInput {
  content: string;
}
