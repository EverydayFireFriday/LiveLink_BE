import express from 'express';
import { getArticleBookmarkService } from '../../services/article';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';

export class ArticleBookmarkController {
  private articleBookmarkService = getArticleBookmarkService();

  // 🛡️ 세션 검증 헬퍼 메서드
  private validateSession(
    req: express.Request,
    res: express.Response,
  ): boolean {
    if (!req.session?.user?.userId) {
      res.status(401).json({
        message: '로그인이 필요합니다.',
      });
      return false;
    }
    return true;
  }

  bookmarkArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증 먼저 수행
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      const { user_id } = req.body;

      const bookmark = await this.articleBookmarkService.bookmarkArticle({
        article_id: articleId,
        user_id,
      });

      res.status(201).json({
        message: '북마크가 추가되었습니다.',
        bookmark,
      });
    } catch (error: any) {
      logger.error('게시글 북마크 에러:', error);

      if (error.message.includes('이미 북마크한')) {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes('찾을 수 없습니다')) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes('유효성 검사')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '북마크 추가에 실패했습니다.' });
      }
    }
  };

  unbookmarkArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증 먼저 수행
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      // ✅ 수정: 완전히 안전한 세션에서 user_id 가져오기
      const userId = req.session?.user?.userId; // 완전 안전

      if (!userId) {
        res.status(401).json({ message: '유효하지 않은 세션입니다.' });
        return;
      }

      const result = await this.articleBookmarkService.unbookmarkArticle({
        article_id: articleId,
        user_id: userId, // ✅ 수정: 세션에서 가져온 userId 사용
      });

      res.status(200).json({
        message: '북마크가 삭제되었습니다.',
        success: result.success,
      });
    } catch (error: any) {
      logger.error('게시글 북마크 삭제 에러:', error);

      if (error.message.includes('찾을 수 없습니다')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '북마크 삭제에 실패했습니다.' });
      }
    }
  };

  toggleBookmark = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleBookmarkService.toggleBookmark(
        articleId,
        user_id.toString(),
      );

      res.status(200).json({
        message: '북마크 상태가 변경되었습니다.',
        isBookmarked: result.isBookmarked,
      });
    } catch (error) {
      logger.error('북마크 토글 에러:', error);
      res.status(500).json({ message: '북마크 토글에 실패했습니다.' });
    }
  };

  getBookmarkStatus = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      const { user_id } = req.query;

      const result = await this.articleBookmarkService.checkBookmarkStatus(
        articleId,
        user_id as string,
      );

      res.status(200).json({
        message: '북마크 상태 조회 성공',
        isBookmarked: result.isBookmarked,
      });
    } catch (error) {
      logger.error('북마크 상태 조회 에러:', error);
      res.status(500).json({ message: '북마크 상태 조회에 실패했습니다.' });
    }
  };

  getBookmarkCount = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const bookmarkCount =
        await this.articleBookmarkService.getBookmarkCount(articleId);

      res.status(200).json({
        message: '북마크 수 조회 성공',
        bookmarkCount,
      });
    } catch (error) {
      logger.error('북마크 수 조회 에러:', error);
      res.status(500).json({ message: '북마크 수 조회에 실패했습니다.' });
    }
  };

  getUserBookmarks = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { userId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleBookmarkService.getUserBookmarks(
        userId,
        { page, limit },
      );

      res.status(200).json({
        message: '사용자 북마크 목록 조회 성공',
        bookmarks: result.bookmarks,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('사용자 북마크 조회 에러:', error);
      res.status(500).json({ message: '사용자 북마크 조회에 실패했습니다.' });
    }
  };

  getUserBookmarkStats = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { userId } = req.params;
      const stats =
        await this.articleBookmarkService.getUserBookmarkStats(userId);

      res.status(200).json({
        message: '사용자 북마크 통계 조회 성공',
        stats,
      });
    } catch (error) {
      logger.error('사용자 북마크 통계 조회 에러:', error);
      res
        .status(500)
        .json({ message: '사용자 북마크 통계 조회에 실패했습니다.' });
    }
  };

  getPopularBookmarkedArticles = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);
      const days = safeParseInt(req.query.days, 30);

      const result =
        await this.articleBookmarkService.getPopularBookmarkedArticles({
          page,
          limit,
          days,
        });

      res.status(200).json({
        message: '인기 북마크 게시글 조회 성공',
        articles: result.articles,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('인기 북마크 게시글 조회 에러:', error);
      res
        .status(500)
        .json({ message: '인기 북마크 게시글 조회에 실패했습니다.' });
    }
  };

  getBatchBookmarkStatus = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { article_ids, user_id } = req.body;

      if (!Array.isArray(article_ids) || !user_id) {
        res.status(400).json({ message: '올바르지 않은 요청 데이터입니다.' });
        return;
      }

      const result =
        await this.articleBookmarkService.checkMultipleBookmarkStatus(
          article_ids,
          user_id,
        );

      // Map을 Object로 변환
      const bookmarkStatus: Record<string, boolean> = {};
      result.forEach((value, key) => {
        bookmarkStatus[key] = value;
      });

      res.status(200).json({
        message: '일괄 북마크 상태 조회 성공',
        bookmarkStatus,
      });
    } catch (error) {
      logger.error('일괄 북마크 상태 조회 에러:', error);
      res
        .status(500)
        .json({ message: '일괄 북마크 상태 조회에 실패했습니다.' });
    }
  };
}
