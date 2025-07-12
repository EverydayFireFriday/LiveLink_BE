// controllers/article/articleLikeController.ts
import express from "express";
import { getArticleLikeService } from "../../services/article";

export class ArticleLikeController {
  private articleLikeService = getArticleLikeService();

  /**
   * @swagger
   * /article/{articleId}/like:
   *   post:
   *     summary: 게시글 좋아요 추가
   *     description: 게시글에 좋아요를 추가합니다.
   *     tags: [Article Like]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema:
   *           type: string
   *         description: 게시글 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - user_id
   *             properties:
   *               user_id:
   *                 type: string # Changed to string
   *                 example: "60d5ecf0f2c3b7001c8e4d7a"
   *     responses:
   *       201:
   *         description: 좋아요 추가 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "좋아요가 추가되었습니다."
   *                 like:
   *                   $ref: '#/components/schemas/ArticleLike'
   *                 newLikesCount:
   *                   type: integer
   *                   example: 25
   *       400:
   *         description: 이미 좋아요한 게시글
   *       401:
   *         description: 로그인 필요
   *       404:
   *         description: 게시글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  likeArticle = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleLikeService.likeArticle({
        article_id: parseInt(articleId),
        user_id,
      });

      res.status(201).json({
        message: "좋아요가 추가되었습니다.",
        like: result.like,
        newLikesCount: result.newLikesCount,
      });
    } catch (error: any) {
      console.error("게시글 좋아요 에러:", error);

      if (error.message.includes("이미 좋아요한")) {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes("유효성 검사")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "좋아요 추가에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/{articleId}/like:
   *   delete:
   *     summary: 게시글 좋아요 취소
   *     description: 게시글의 좋아요를 취소합니다.
   *     tags: [Article Like]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema:
   *           type: string
   *         description: 게시글 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - user_id
   *             properties:
   *               user_id:
   *                 type: string # Changed to string
   *                 example: "60d5ecf0f2c3b7001c8e4d7a"
   *     responses:
   *       200:
   *         description: 좋아요 취소 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "좋아요가 취소되었습니다."
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 newLikesCount:
   *                   type: integer
   *                   example: 24
   *       401:
   *         description: 로그인 필요
   *       404:
   *         description: 좋아요를 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  unlikeArticle = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleLikeService.unlikeArticle({
        article_id: parseInt(articleId),
        user_id,
      });

      res.status(200).json({
        message: "좋아요가 취소되었습니다.",
        success: result.success,
        newLikesCount: result.newLikesCount,
      });
    } catch (error: any) {
      console.error("게시글 좋아요 취소 에러:", error);

      if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "좋아요 취소에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/{articleId}/like/toggle:
   *   post:
   *     summary: 게시글 좋아요 토글
   *     description: 좋아요 상태를 토글합니다. (있으면 취소, 없으면 추가)
   *     tags: [Article Like]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema:
   *           type: string
   *         description: 게시글 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - user_id
   *             properties:
   *               user_id:
   *                 type: string # Changed to string
   *                 example: "60d5ecf0f2c3b7001c8e4d7a"
   *     responses:
   *       200:
   *         description: 좋아요 토글 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "좋아요 상태가 변경되었습니다."
   *                 isLiked:
   *                   type: boolean
   *                   example: true
   *                 newLikesCount:
   *                   type: integer
   *                   example: 25
   *       401:
   *         description: 로그인 필요
   *       500:
   *         description: 서버 에러
   */
  toggleLike = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleLikeService.toggleLike(
        articleId,
        user_id.toString()
      );

      res.status(200).json({
        message: "좋아요 상태가 변경되었습니다.",
        isLiked: result.isLiked,
        newLikesCount: result.newLikesCount,
      });
    } catch (error) {
      console.error("좋아요 토글 에러:", error);
      res.status(500).json({ message: "좋아요 토글에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /article/{articleId}/like/status:
   *   get:
   *     summary: 게시글 좋아요 상태 확인
   *     description: 특정 사용자의 게시글 좋아요 상태를 확인합니다.
   *     tags: [Article Like]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema:
   *           type: string
   *         description: 게시글 ID
   *       - in: query
   *         name: user_id
   *         required: true
   *         schema:
   *           type: string
   *         description: 사용자 ID
   *     responses:
   *       200:
   *         description: 좋아요 상태 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "좋아요 상태 조회 성공"
   *                 isLiked:
   *                   type: boolean
   *                   example: true
   *                 likesCount:
   *                   type: integer
   *                   example: 25
   *       401:
   *         description: 로그인 필요
   *       500:
   *         description: 서버 에러
   */
  getLikeStatus = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const { user_id } = req.query;

      const result = await this.articleLikeService.checkLikeStatus(
        articleId,
        user_id as string
      );

      res.status(200).json({
        message: "좋아요 상태 조회 성공",
        isLiked: result.isLiked,
        likesCount: result.likesCount,
      });
    } catch (error) {
      console.error("좋아요 상태 조회 에러:", error);
      res.status(500).json({ message: "좋아요 상태 조회에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /article/{articleId}/like/users:
   *   get:
   *     summary: 게시글을 좋아요한 사용자 목록
   *     description: 게시글을 좋아요한 사용자들의 목록을 조회합니다.
   *     tags: [Article Like]
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema:
   *           type: string
   *         description: 게시글 ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 페이지 번호
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: 페이지당 사용자 수
   *     responses:
   *       200:
   *         description: 좋아요한 사용자 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "좋아요한 사용자 목록 조회 성공"
   *                 userIds:
   *                   type: array
   *                   items:
   *                     type: string
   *                   example: ["123", "456", "789"]
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       500:
   *         description: 서버 에러
   */
  getArticleLikers = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.articleLikeService.getArticleLikers(articleId, {
        page,
        limit,
      });

      res.status(200).json({
        message: "좋아요한 사용자 목록 조회 성공",
        userIds: result.userIds,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error("좋아요한 사용자 목록 조회 에러:", error);
      res
        .status(500)
        .json({ message: "좋아요한 사용자 목록 조회에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /article/like/user/{userId}:
   *   get:
   *     summary: 사용자가 좋아요한 게시글 목록
   *     description: 특정 사용자가 좋아요한 게시글 ID 목록을 조회합니다.
   *     tags: [Article Like]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: 사용자 ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 페이지 번호
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: 페이지당 게시글 수
   *     responses:
   *       200:
   *         description: 사용자가 좋아요한 게시글 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용자가 좋아요한 게시글 목록 조회 성공"
   *                 articleIds:
   *                   type: array
   *                   items:
   *                     type: string
   *                   example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       401:
   *         description: 로그인 필요
   *       500:
   *         description: 서버 에러
   */
  getUserLikedArticles = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.articleLikeService.getUserLikedArticles(
        userId,
        { page, limit }
      );

      res.status(200).json({
        message: "사용자가 좋아요한 게시글 목록 조회 성공",
        articleIds: result.articleIds,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error("사용자 좋아요 게시글 조회 에러:", error);
      res
        .status(500)
        .json({ message: "사용자 좋아요 게시글 조회에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /article/like/status/batch:
   *   post:
   *     summary: 여러 게시글의 좋아요 상태 일괄 조회
   *     description: 여러 게시글에 대한 사용자의 좋아요 상태를 한 번에 조회합니다.
   *     tags: [Article Like]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - article_ids
   *               - user_id
   *             properties:
   *               article_ids:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
   *               user_id:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439013"
   *     responses:
   *       200:
   *         description: 일괄 좋아요 상태 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "일괄 좋아요 상태 조회 성공"
   *                 likeStatus:
   *                   type: object
   *                   additionalProperties:
   *                     type: object
   *                     properties:
   *                       isLiked:
   *                         type: boolean
   *                       likesCount:
   *                         type: integer
   *                   example:
   *                     "507f1f77bcf86cd799439011":
   *                       isLiked: true
   *                       likesCount: 15
   *                     "507f1f77bcf86cd799439012":
   *                       isLiked: false
   *                       likesCount: 8
   *       401:
   *         description: 로그인 필요
   *       400:
   *         description: 잘못된 요청 데이터
   *       500:
   *         description: 서버 에러
   */
  getBatchLikeStatus = async (req: express.Request, res: express.Response) => {
    try {
      const { article_ids, user_id } = req.body;

      if (!Array.isArray(article_ids) || !user_id) {
        res.status(400).json({ message: "올바르지 않은 요청 데이터입니다." });
        return;
      }

      const result = await this.articleLikeService.checkMultipleLikeStatus(
        article_ids,
        user_id
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
        message: "일괄 좋아요 상태 조회 성공",
        likeStatus,
      });
    } catch (error) {
      console.error("일괄 좋아요 상태 조회 에러:", error);
      res
        .status(500)
        .json({ message: "일괄 좋아요 상태 조회에 실패했습니다." });
    }
  };
}