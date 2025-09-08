import express from 'express';
import { getArticleLikeService } from '../../services/article';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';

export class ArticleLikeController {
  private articleLikeService = getArticleLikeService();

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

  likeArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleLikeService.likeArticle({
        article_id: articleId,
        user_id,
      });

      res.status(201).json({
        message: '좋아요가 추가되었습니다.',
        like: result.like,
        newLikesCount: result.newLikesCount,
      });
    } catch (error: any) {
      logger.error('게시글 좋아요 에러:', error);

      if (error.message.includes('이미 좋아요한')) {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes('찾을 수 없습니다')) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes('유효성 검사')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '좋아요 추가에 실패했습니다.' });
      }
    }
  };

  unlikeArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleLikeService.unlikeArticle({
        article_id: articleId,
        user_id,
      });

      res.status(200).json({
        message: '좋아요가 취소되었습니다.',
        success: result.success,
        newLikesCount: result.newLikesCount,
      });
    } catch (error: any) {
      logger.error('게시글 좋아요 취소 에러:', error);

      if (error.message.includes('찾을 수 없습니다')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '좋아요 취소에 실패했습니다.' });
      }
    }
  };

  toggleLike = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleLikeService.toggleLike(
        articleId,
        user_id.toString(),
      );

      res.status(200).json({
        message: '좋아요 상태가 변경되었습니다.',
        isLiked: result.isLiked,
        newLikesCount: result.newLikesCount,
      });
    } catch (error) {
      logger.error('좋아요 토글 에러:', error);
      res.status(500).json({ message: '좋아요 토글에 실패했습니다.' });
    }
  };

  getLikeStatus = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      const { user_id } = req.query;

      const result = await this.articleLikeService.checkLikeStatus(
        articleId,
        user_id as string,
      );

      res.status(200).json({
        message: '좋아요 상태 조회 성공',
        isLiked: result.isLiked,
        likesCount: result.likesCount,
      });
    } catch (error) {
      logger.error('좋아요 상태 조회 에러:', error);
      res.status(500).json({ message: '좋아요 상태 조회에 실패했습니다.' });
    }
  };

  getArticleLikers = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleLikeService.getArticleLikers(articleId, {
        page,
        limit,
      });

      res.status(200).json({
        message: '좋아요한 사용자 목록 조회 성공',
        userIds: result.userIds,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('좋아요한 사용자 목록 조회 에러:', error);
      res
        .status(500)
        .json({ message: '좋아요한 사용자 목록 조회에 실패했습니다.' });
    }
  };

  getUserLikedArticles = async (
    req: express.Request,
    res: express.Response,
  ) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { userId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleLikeService.getUserLikedArticles(
        userId,
        { page, limit },
      );

      res.status(200).json({
        message: '사용자가 좋아요한 게시글 목록 조회 성공',
        articleIds: result.articleIds,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('사용자 좋아요 게시글 조회 에러:', error);
      res
        .status(500)
        .json({ message: '사용자 좋아요 게시글 조회에 실패했습니다.' });
    }
  };

  getBatchLikeStatus = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { article_ids, user_id } = req.body;

      if (!Array.isArray(article_ids) || !user_id) {
        res.status(400).json({ message: '올바르지 않은 요청 데이터입니다.' });
        return;
      }

      const result = await this.articleLikeService.checkMultipleLikeStatus(
        article_ids,
        user_id,
      );

      // Map을 Object로 변환
      const likeStatus: Record<
        string,
        { isLiked: boolean; likesCount: number }
      > = {};
      result.forEach((value, key) => {
        likeStatus[key] = value;
      });

      res.status(200).json({
        message: '일괄 좋아요 상태 조회 성공',
        likeStatus,
      });
    } catch (error) {
      logger.error('일괄 좋아요 상태 조회 에러:', error);
      res
        .status(500)
        .json({ message: '일괄 좋아요 상태 조회에 실패했습니다.' });
    }
  };
}
