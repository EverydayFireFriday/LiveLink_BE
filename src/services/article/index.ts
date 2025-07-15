// Import/Require 혼재 문제 해결 - 모두 ES6 import로 통일
import { ArticleService, getArticleService } from "./articleService";
import { ArticleLikeService, getArticleLikeService } from "./articleLikeService";
import { ArticleCommentService, getArticleCommentService } from "./articleCommentService";
import { ArticleBookmarkService, getArticleBookmarkService } from "./articleBookmarkService";

export {
  ArticleService,
  getArticleService,
  ArticleLikeService,
  getArticleLikeService,
  ArticleCommentService,
  getArticleCommentService,
  ArticleBookmarkService,
  getArticleBookmarkService,
};

