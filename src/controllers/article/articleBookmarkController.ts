// controllers/article/articleBookmarkController.ts
import express from "express";
import { getArticleBookmarkService } from "../../services/article";

export class ArticleBookmarkController {
  private articleBookmarkService = getArticleBookmarkService();

  /**
   * @swagger
   * /article/{articleId}/bookmark:
   *   post:
   *     summary: 게시글 북마크 추가
   *     description: 게시글을 북마크에 추가합니다.
   *     tags: [Article Bookmark]
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
   *         description: 북마크 추가 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "북마크가 추가되었습니다."
   *                 bookmark:
   *                   $ref: '#/components/schemas/ArticleBookmark'
   *       400:
   *         description: 이미 북마크한 게시글
   *       401:
   *         description: 로그인 필요
   *       404:
   *         description: 게시글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  bookmarkArticle = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const { user_id } = req.body;

      const bookmark = await this.articleBookmarkService.bookmarkArticle({
        article_id: parseInt(articleId),
        user_id,
      });

      res.status(201).json({
        message: "북마크가 추가되었습니다.",
        bookmark,
      });
    } catch (error: any) {
      console.error("게시글 북마크 에러:", error);

      if (error.message.includes("이미 북마크한")) {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes("유효성 검사")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "북마크 추가에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/{articleId}/bookmark:
   *   delete:
   *     summary: 게시글 북마크 삭제
   *     description: 게시글을 북마크에서 제거합니다.
   *     tags: [Article Bookmark]
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
   *         description: 북마크 삭제 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "북마크가 삭제되었습니다."
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         description: 로그인 필요
   *       404:
   *         description: 북마크를 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  unbookmarkArticle = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleBookmarkService.unbookmarkArticle({
        article_id: parseInt(articleId),
        user_id,
      });

      res.status(200).json({
        message: "북마크가 삭제되었습니다.",
        success: result.success,
      });
    } catch (error: any) {
      console.error("게시글 북마크 삭제 에러:", error);

      if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "북마크 삭제에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/{articleId}/bookmark/toggle:
   *   post:
   *     summary: 게시글 북마크 토글
   *     description: 북마크 상태를 토글합니다. (있으면 삭제, 없으면 추가)
   *     tags: [Article Bookmark]
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
   *         description: 북마크 토글 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "북마크 상태가 변경되었습니다."
   *                 isBookmarked:
   *                   type: boolean
   *                   example: true
   *       401:
   *         description: 로그인 필요
   *       500:
   *         description: 서버 에러
   */
  toggleBookmark = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleBookmarkService.toggleBookmark(
        articleId,
        user_id.toString()
      );

      res.status(200).json({
        message: "북마크 상태가 변경되었습니다.",
        isBookmarked: result.isBookmarked,
      });
    } catch (error) {
      console.error("북마크 토글 에러:", error);
      res.status(500).json({ message: "북마크 토글에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /bookmark/user/{userId}:
   *   get:
   *     summary: 사용자의 북마크 목록 조회
   *     description: 특정 사용자가 북마크한 게시글 목록을 조회합니다.
   *     tags: [Article Bookmark]
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
   *         description: 페이지당 북마크 수
   *     responses:
   *       200:
   *         description: 사용자 북마크 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용자 북마크 목록 조회 성공"
   *                 bookmarks:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ArticleBookmark'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       401:
   *         description: 로그인 필요
   *       500:
   *         description: 서버 에러
   */
  /**
   * @swagger
   * /article/{articleId}/bookmark/status:
   *   get:
   *     summary: 게시글 북마크 상태 확인
   *     description: 특정 사용자의 게시글 북마크 상태를 확인합니다.
   *     tags: [Article Bookmark]
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
   *         description: 북마크 상태 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "북마크 상태 조회 성공"
   *                 isBookmarked:
   *                   type: boolean
   *                   example: true
   *       401:
   *         description: 로그인 필요
   *       500:
   *         description: 서버 에러
   */
  getBookmarkStatus = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const { user_id } = req.query;

      const result = await this.articleBookmarkService.checkBookmarkStatus(
        articleId,
        user_id as string
      );

      res.status(200).json({
        message: "북마크 상태 조회 성공",
        isBookmarked: result.isBookmarked,
      });
    } catch (error) {
      console.error("북마크 상태 조회 에러:", error);
      res.status(500).json({ message: "북마크 상태 조회에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /article/{articleId}/bookmark/count:
   *   get:
   *     summary: 게시글의 북마크 수 조회
   *     description: 특정 게시글의 총 북마크 수를 조회합니다.
   *     tags: [Article Bookmark]
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema:
   *           type: string
   *         description: 게시글 ID
   *     responses:
   *       200:
   *         description: 북마크 수 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "북마크 수 조회 성공"
   *                 bookmarkCount:
   *                   type: integer
   *                   example: 25
   *       500:
   *         description: 서버 에러
   */
  getBookmarkCount = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const bookmarkCount = await this.articleBookmarkService.getBookmarkCount(articleId);

      res.status(200).json({
        message: "북마크 수 조회 성공",
        bookmarkCount,
      });
    } catch (error) {
      console.error("북마크 수 조회 에러:", error);
      res.status(500).json({ message: "북마크 수 조회에 실패했습니다." });
    }
  };

  getUserBookmarks = async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.articleBookmarkService.getUserBookmarks(
        userId,
        { page, limit }
      );

      res.status(200).json({
        message: "사용자 북마크 목록 조회 성공",
        bookmarks: result.bookmarks,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error("사용자 북마크 조회 에러:", error);
      res.status(500).json({ message: "사용자 북마크 조회에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /bookmark/user/{userId}/stats:
   *   get:
   *     summary: 사용자의 북마크 통계
   *     description: 사용자의 북마크 관련 통계 정보를 조회합니다.
   *     tags: [Article Bookmark]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: 사용자 ID
   *     responses:
   *       200:
   *         description: 사용자 북마크 통계 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용자 북마크 통계 조회 성공"
   *                 stats:
   *                   type: object
   *                   properties:
   *                     totalBookmarks:
   *                       type: integer
   *                       example: 42
   *                       description: 총 북마크 수
   *                     recentBookmarks:
   *                       type: integer
   *                       example: 5
   *                       description: 최근 30일간 북마크 수
   *       401:
   *         description: 로그인 필요
   *       500:
   *         description: 서버 에러
   */
  getUserBookmarkStats = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const { userId } = req.params;
      const stats = await this.articleBookmarkService.getUserBookmarkStats(userId);

      res.status(200).json({
        message: "사용자 북마크 통계 조회 성공",
        stats,
      });
    } catch (error) {
      console.error("사용자 북마크 통계 조회 에러:", error);
      res
        .status(500)
        .json({ message: "사용자 북마크 통계 조회에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /bookmark/popular:
   *   get:
   *     summary: 인기 북마크 게시글 조회
   *     description: 북마크 수를 기준으로 인기 게시글을 조회합니다.
   *     tags: [Article Bookmark]
   *     parameters:
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
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 30
   *         description: 최근 며칠간의 데이터 기준
   *     responses:
   *       200:
   *         description: 인기 북마크 게시글 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "인기 북마크 게시글 조회 성공"
   *                 articles:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       bookmarkCount:
   *                         type: integer
   *                         description: 북마크 수
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     total:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   *       500:
   *         description: 서버 에러
   */
  getPopularBookmarkedArticles = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const days = parseInt(req.query.days as string) || 30;

      const result = await this.articleBookmarkService.getPopularBookmarkedArticles({
          page,
          limit,
          days,
        });

      res.status(200).json({
        message: "인기 북마크 게시글 조회 성공",
        articles: result.articles,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error("인기 북마크 게시글 조회 에러:", error);
      res
        .status(500)
        .json({ message: "인기 북마크 게시글 조회에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /bookmark/status/batch:
   *   post:
   *     summary: 여러 게시글의 북마크 상태 일괄 조회
   *     description: 여러 게시글에 대한 사용자의 북마크 상태를 한 번에 조회합니다.
   *     tags: [Article Bookmark]
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
   *                 example: "60d5ecf0f2c3b7001c8e4d7a"
   *     responses:
   *       200:
   *         description: 일괄 북마크 상태 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "일괄 북마크 상태 조회 성공"
   *                 bookmarkStatus:
   *                   type: object
   *                   additionalProperties:
   *                     type: boolean
   *                   example:
   *                     "507f1f77bcf86cd799439011": true
   *                     "507f1f77bcf86cd799439012": false
   *       401:
   *         description: 로그인 필요
   *       400:
   *         description: 잘못된 요청 데이터
   *       500:
   *         description: 서버 에러
   */
  getBatchBookmarkStatus = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const { article_ids, user_id } = req.body;

      if (!Array.isArray(article_ids) || !user_id) {
        res.status(400).json({ message: "올바르지 않은 요청 데이터입니다." });
        return;
      }

      const result = await this.articleBookmarkService.checkMultipleBookmarkStatus(
        article_ids,
        user_id
      );

      // Map을 Object로 변환
      const bookmarkStatus: Record<string, boolean> = {};
      result.forEach((value, key) => {
        bookmarkStatus[key] = value;
      });

      res.status(200).json({
        message: "일괄 북마크 상태 조회 성공",
        bookmarkStatus,
      });
    } catch (error) {
      console.error("일괄 북마크 상태 조회 에러:", error);
      res
        .status(500)
        .json({ message: "일괄 북마크 상태 조회에 실패했습니다." });
    }
  };
}