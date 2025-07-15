// types/article/bookmarkTypes.ts
export interface ArticleBookmark {
  id: string;        // number → string
  article_id: string; // number → string
  user_id: string;   // number → string
  created_at: Date;
}

export interface ArticleBookmarkWithRelations extends ArticleBookmark {
  article: {
    id: string;        // number → string
    title: string;
    created_at: Date;
    author: {
      id: string;      // number → string
      username: string;
    };
    category: {
      id: string;      // number → string
      name: string;
    } | null;
  };
}

export interface CreateArticleBookmarkInput {
  article_id: string; // number → string
  user_id: string;   // number → string
}
