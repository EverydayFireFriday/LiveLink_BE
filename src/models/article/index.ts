export { IArticle, ArticleModel, initializeArticleModel, getArticleModel, Article } from './article';
export { ITag, TagModel, initializeTagModel, getTagModel, Tag } from './tag';
export { ICategory, CategoryModel, initializeCategoryModel, getCategoryModel, Category } from './category';
export { IArticleLike, ArticleLikeModel, initializeArticleLikeModel, getArticleLikeModel, ArticleLike } from './articleLike';
export { IComment, CommentModel, initializeCommentModel, getCommentModel, Comment } from './comment';
export { ICommentLike, CommentLikeModel, initializeCommentLikeModel, getCommentLikeModel, CommentLike } from './commentLike';
export { IArticleBookmark, ArticleBookmarkModel, initializeArticleBookmarkModel, getArticleBookmarkModel, ArticleBookmark } from './articleBookmark';
export { IArticleTag, ArticleTagModel, initializeArticleTagModel, getArticleTagModel, ArticleTag } from './articleTag';
import logger from "../../utils/logger";


import { Db } from 'mongodb';
import { initializeArticleModel } from './article';
import { initializeTagModel } from './tag';
import { initializeCategoryModel } from './category';
import { initializeArticleLikeModel } from './articleLike';
import { initializeCommentModel } from './comment';
import { initializeCommentLikeModel } from './commentLike';
import { initializeArticleBookmarkModel } from './articleBookmark';
import { initializeArticleTagModel } from './articleTag';

// 모든 Article 관련 모델을 한 번에 초기화하는 함수
export const initializeAllArticleModels = (db: Db) => {
  logger.info('🚀 Article 모델들 초기화 시작...');
  
  const models = {
    article: initializeArticleModel(db),
    tag: initializeTagModel(db),
    category: initializeCategoryModel(db),
    articleLike: initializeArticleLikeModel(db),
    comment: initializeCommentModel(db),
    commentLike: initializeCommentLikeModel(db),
    articleBookmark: initializeArticleBookmarkModel(db),
    articleTag: initializeArticleTagModel(db),
  };
  
  logger.info('✅ Article 모델들 초기화 완료!');
  return models;
};