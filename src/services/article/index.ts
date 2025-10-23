import { getArticleService } from './articleService';
import { getArticleLikeService } from './articleLikeService';
import { getArticleCommentService } from './articleCommentService';
import { getArticleBookmarkService } from './articleBookmarkService';

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
  return {
    articleService: getArticleService(),
    articleLikeService: getArticleLikeService(),
    articleCommentService: getArticleCommentService(),
    articleBookmarkService: getArticleBookmarkService(),
  };
};
