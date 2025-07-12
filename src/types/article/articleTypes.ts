// types/article/articleTypes.ts
export interface Article {
  id: number;
  title: string;
  content_url: string;
  author_id: number;
  category_id: number | null;
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  views: number;
  likes_count: number;
}

export interface ArticleWithRelations extends Article {
  author: {
    id: number;
    username: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
  } | null;
  tags: {
    id: number;
    name: string;
  }[];
}

export interface CreateArticleInput {
  title: string;
  content_url: string;
  author_id: number;
  category_id?: number;
  tag_ids?: number[];
  is_published?: boolean;
  published_at?: Date;
}

export interface UpdateArticleInput {
  title?: string;
  content_url?: string;
  category_id?: number;
  tag_ids?: number[];
  is_published?: boolean;
  published_at?: Date;
}
