// types/article/bookmarkTypes.ts
export interface ArticleBookmark {
  id: number;
  article_id: number;
  user_id: number;
  created_at: Date;
}

export interface ArticleBookmarkWithRelations extends ArticleBookmark {
  article: {
    id: number;
    title: string;
    author: {
      id: number;
      username: string;
    };
    category: {
      id: number;
      name: string;
    } | null;
    created_at: Date;
  };
}

export interface CreateArticleBookmarkInput {
  article_id: number;
  user_id: number;
}
