// types/article/articleTypes.ts
export interface Article {
  id: string;
  title: string;
  content_url: string;
  author_id: string;
  category_id: string | null;
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  views: number;
  likes_count: number;
  bookmark_count: number;
}

export interface ArticleWithRelations extends Article {
  author: {
    id: string;
    username: string;
    email: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
  tags: {
    id: string;
    name: string;
  }[];
}

export interface CreateArticleInput {
  title: string;
  content_url: string;
  author_id: string;
  category_id?: string;
  tag_ids?: string[];
  is_published?: boolean;
  published_at?: Date;
}

export interface UpdateArticleInput {
  title?: string;
  content_url?: string;
  category_id?: string;
  tag_ids?: string[];
  is_published?: boolean;
  published_at?: Date;
}
