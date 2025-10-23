export { ArticleService, getArticleService } from './articleService';
export {
  ArticleLikeService,
  getArticleLikeService,
} from './articleLikeService';
export {
  ArticleCommentService,
  getArticleCommentService,
} from './articleCommentService';
export {
  ArticleBookmarkService,
  getArticleBookmarkService,
} from './articleBookmarkService';

// 모든 서비스를 한 번에 가져오는 헬퍼 함수
export const getAllArticleServices = () => {
  const { ArticleService, getArticleService } = require('./articleService');
  const {
    ArticleLikeService,
    getArticleLikeService,
  } = require('./articleLikeService');
  const {
    ArticleCommentService,
    getArticleCommentService,
  } = require('./articleCommentService');
  const {
    ArticleBookmarkService,
    getArticleBookmarkService,
  } = require('./articleBookmarkService');

  return {
    articleService: getArticleService(),
    articleLikeService: getArticleLikeService(),
    articleCommentService: getArticleCommentService(),
    articleBookmarkService: getArticleBookmarkService(),
  };
};
