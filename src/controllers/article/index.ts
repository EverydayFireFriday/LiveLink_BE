// controllers/article/index.ts
export { ArticleController } from './articleController';
export { ArticleLikeController } from './articleLikeController';
export { ArticleCommentController } from './articleCommentController';
export { ArticleBookmarkController } from './articleBookmarkController';

import { ArticleController } from './articleController';
import { ArticleLikeController } from './articleLikeController';
import { ArticleCommentController } from './articleCommentController';
import { ArticleBookmarkController } from './articleBookmarkController';

// 모든 컨트롤러를 한 번에 가져오는 헬퍼 함수
export const getAllArticleControllers = () => {
  return {
    articleController: new ArticleController(),
    articleLikeController: new ArticleLikeController(),
    articleCommentController: new ArticleCommentController(),
    articleBookmarkController: new ArticleBookmarkController(),
  };
};
