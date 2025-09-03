import express from "express";
import { getArticleCommentService } from "../../services/article";
import { safeParseInt } from "../../utils/numberUtils";
import logger from "../../utils/logger";

export class ArticleCommentController {
  private articleCommentService = getArticleCommentService();

  // 🛡️ 세션 검증 헬퍼 메서드
  private validateSession(
    req: express.Request,
    res: express.Response
  ): boolean {
    if (!req.session?.user?.userId) {
      res.status(401).json({
        message: "로그인이 필요합니다.",
      });
      return false;
    }
    return true;
  }

  /**
   * @swagger
   * /article/comment/{articleId}:
   *   post:
   *     summary: 댓글 생성
   *     description: 게시글에 새로운 댓글을 작성합니다.
   *     tags: [Article Comment]
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
   *               - author_id
   *               - content
   *             properties:
   *               author_id:
   *                 type: string # Changed to string
   *                 example: "60d5ecf0f2c3b7001c8e4d7a"
   *               content:
   *                 type: string
   *                 maxLength: 1000
   *                 example: "정말 유익한 글이네요! 감사합니다."
   *               parent_id:
   *                 type: string # Changed to string
   *                 description: 대댓글인 경우 부모 댓글 ID
   *                 example: "60d5ecf0f2c3b7001c8e4d7b"
   *     responses:
   *       201:
   *         description: 댓글 생성 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "댓글이 성공적으로 작성되었습니다."
   *                 comment:
   *                   $ref: '#/components/schemas/Comment'
   *       400:
   *         description: 잘못된 요청 데이터
   *       401:
   *         description: 로그인 필요
   *       404:
   *         description: 게시글 또는 부모 댓글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  createComment = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { articleId } = req.params;
      const { author_id, content, parent_id } = req.body;

      const comment = await this.articleCommentService.createComment({
        article_id: articleId,
        author_id,
        content,
        parent_id,
      });

      res.status(201).json({
        message: "댓글이 성공적으로 작성되었습니다.",
        comment,
      });
    } catch (error: any) {
      logger.error("댓글 생성 에러:", error);

      if (error.message.includes("유효성 검사")) {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "댓글 작성에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/comment/{articleId}:
   *   get:
   *     summary: 게시글의 댓글 목록 조회
   *     description: 게시글의 댓글과 대댓글을 계층형으로 조회합니다.
   *     tags: [Article Comment]
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
   *         description: 페이지당 댓글 수 (최상위 댓글 기준)
   *     responses:
   *       200:
   *         description: 댓글 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "댓글 목록 조회 성공"
   *                 comments:
   *                   type: array
   *                   items:
   *                     allOf:
   *                       - $ref: '#/components/schemas/Comment'
   *                       - type: object
   *                         properties:
   *                           replies:
   *                             type: array
   *                             items:
   *                               $ref: '#/components/schemas/Comment'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationResponse'
   *       404:
   *         description: 게시글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  getCommentsByArticle = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const { articleId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleCommentService.getCommentsByArticle(
        articleId,
        {
          page,
          limit,
        }
      );

      res.status(200).json({
        message: "댓글 목록 조회 성공",
        comments: result.comments,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      logger.error("댓글 목록 조회 에러:", error);

      if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "댓글 목록 조회에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/comment/{commentId}:
   *   get:
   *     summary: 댓글 상세 조회
   *     description: 특정 댓글의 상세 정보를 조회합니다.
   *     tags: [Article Comment]
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: string
   *         description: 댓글 ID
   *     responses:
   *       200:
   *         description: 댓글 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "댓글 조회 성공"
   *                 comment:
   *                   $ref: '#/components/schemas/Comment'
   *       404:
   *         description: 댓글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  getCommentById = async (req: express.Request, res: express.Response) => {
    try {
      const { commentId } = req.params;
      const comment =
        await this.articleCommentService.getCommentById(commentId);

      res.status(200).json({
        message: "댓글 조회 성공",
        comment,
      });
    } catch (error: any) {
      logger.error("댓글 조회 에러:", error);

      if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "댓글 조회에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/comment/{commentId}:
   *   put:
   *     summary: 댓글 수정
   *     description: 기존 댓글의 내용을 수정합니다. 작성자만 수정할 수 있습니다.
   *     tags: [Article Comment]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: string
   *         description: 댓글 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - content
   *               - author_id
   *             properties:
   *               content:
   *                 type: string
   *                 maxLength: 1000
   *                 example: "수정된 댓글 내용입니다."
   *               author_id:
   *                 type: string
   *                 description: 작성자 확인용 ID
   *                 example: "60d5ecf0f2c3b7001c8e4d7a"
   *     responses:
   *       200:
   *         description: 댓글 수정 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "댓글이 성공적으로 수정되었습니다."
   *                 comment:
   *                   $ref: '#/components/schemas/Comment'
   *       400:
   *         description: 잘못된 요청 데이터
   *       401:
   *         description: 로그인 필요
   *       403:
   *         description: 수정 권한 없음
   *       404:
   *         description: 댓글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  updateComment = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { commentId } = req.params;
      const { content, author_id } = req.body;

      const comment = await this.articleCommentService.updateComment(
        commentId,
        { content },
        author_id
      );

      res.status(200).json({
        message: "댓글이 성공적으로 수정되었습니다.",
        comment,
      });
    } catch (error: any) {
      logger.error("댓글 수정 에러:", error);

      if (error.message.includes("유효성 검사")) {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes("권한이 없습니다")) {
        res.status(403).json({ message: error.message });
      } else if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "댓글 수정에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/comment/{commentId}:
   *   delete:
   *     summary: 댓글 삭제
   *     description: 댓글을 삭제합니다. 작성자만 삭제할 수 있으며, 대댓글도 함께 삭제됩니다.
   *     tags: [Article Comment]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: string
   *         description: 댓글 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - author_id
   *             properties:
   *               author_id:
   *                 type: string
   *                 description: 작성자 확인용 ID
   *                 example: "60d5ecf0f2c3b7001c8e4d7a"
   *     responses:
   *       200:
   *         description: 댓글 삭제 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "댓글이 성공적으로 삭제되었습니다."
   *       401:
   *         description: 로그인 필요
   *       403:
   *         description: 삭제 권한 없음
   *       404:
   *         description: 댓글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  deleteComment = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { commentId } = req.params;
      const { author_id } = req.body;

      await this.articleCommentService.deleteComment(commentId, author_id);

      res.status(200).json({
        message: "댓글이 성공적으로 삭제되었습니다.",
      });
    } catch (error: any) {
      logger.error("댓글 삭제 에러:", error);

      if (error.message.includes("권한이 없습니다")) {
        res.status(403).json({ message: error.message });
      } else if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "댓글 삭제에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/comment/like/toggle/{commentId}:
   *   post:
   *     summary: 댓글 좋아요 토글
   *     description: 댓글 좋아요 상태를 토글합니다. (있으면 취소, 없으면 추가)
   *     tags: [Article Comment]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: string
   *         description: 댓글 ID
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
   *                 type: string
   *                 example: "60d5ecf0f2c3b7001c8e4d7a"
   *     responses:
   *       200:
   *         description: 댓글 좋아요 토글 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "댓글 좋아요 상태가 변경되었습니다."
   *                 isLiked:
   *                   type: boolean
   *                   example: true
   *                 newLikesCount:
   *                   type: integer
   *                   example: 5
   *       401:
   *         description: 로그인 필요
   *       500:
   *         description: 서버 에러
   */
  toggleCommentLike = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { commentId } = req.params;
      const { user_id } = req.body;

      const result = await this.articleCommentService.toggleCommentLike(
        commentId,
        user_id
      );

      res.status(200).json({
        message: "댓글 좋아요 상태가 변경되었습니다.",
        isLiked: result.isLiked,
        newLikesCount: result.newLikesCount,
      });
    } catch (error) {
      logger.error("댓글 좋아요 토글 에러:", error);
      res.status(500).json({ message: "댓글 좋아요 토글에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /article/comment/replies/{commentId}:
   *   get:
   *     summary: 댓글의 대댓글 목록 조회
   *     description: 특정 댓글의 대댓글 목록을 조회합니다.
   *     tags: [Article Comment]
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: string
   *         description: 부모 댓글 ID
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
   *         description: 페이지당 대댓글 수
   *     responses:
   *       200:
   *         description: 대댓글 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "대댓글 목록 조회 성공"
   *                 comments:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Comment'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationResponse'
   *       404:
   *         description: 부모 댓글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  getRepliesByComment = async (req: express.Request, res: express.Response) => {
    try {
      const { commentId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleCommentService.getRepliesByComment(
        commentId,
        {
          page,
          limit,
        }
      );

      res.status(200).json({
        message: "대댓글 목록 조회 성공",
        comments: result.comments,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      logger.error("대댓글 목록 조회 에러:", error);

      if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "대댓글 목록 조회에 실패했습니다." });
      }
    }
  };

  /**
   * @swagger
   * /article/comment/author/{authorId}:
   *   get:
   *     summary: 작성자별 댓글 목록 조회
   *     description: 특정 작성자가 작성한 댓글 목록을 조회합니다.
   *     tags: [Article Comment]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: authorId
   *         required: true
   *         schema:
   *           type: string
   *         description: 작성자 ID
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
   *         description: 페이지당 댓글 수
   *     responses:
   *       200:
   *         description: 작성자별 댓글 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "작성자별 댓글 목록 조회 성공"
   *                 comments:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Comment'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationResponse'
   *       401:
   *         description: 로그인 필요
   *       500:
   *         description: 서버 에러
   */
  getCommentsByAuthor = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { authorId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);

      const result = await this.articleCommentService.getCommentsByAuthor(
        authorId,
        {
          page,
          limit,
        }
      );

      res.status(200).json({
        message: "작성자별 댓글 목록 조회 성공",
        comments: result.comments,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error("작성자별 댓글 조회 에러:", error);
      res.status(500).json({ message: "작성자별 댓글 조회에 실패했습니다." });
    }
  };

  /**
   * @swagger
   * /article/comment/count/{articleId}:
   *   get:
   *     summary: 게시글의 댓글 수 조회
   *     description: 특정 게시글의 총 댓글 수를 조회합니다.
   *     tags: [Article Comment]
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema:
   *           type: string
   *         description: 게시글 ID
   *     responses:
   *       200:
   *         description: 댓글 수 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "댓글 수 조회 성공"
   *                 commentCount:
   *                   type: integer
   *                   example: 42
   *       500:
   *         description: 서버 에러
   */
  getCommentCount = async (req: express.Request, res: express.Response) => {
    try {
      const { articleId } = req.params;
      const commentCount =
        await this.articleCommentService.getCommentCount(articleId);

      res.status(200).json({
        message: "댓글 수 조회 성공",
        commentCount,
      });
    } catch (error) {
      logger.error("댓글 수 조회 에러:", error);
      res.status(500).json({ message: "댓글 수 조회에 실패했습니다." });
    }
  };
}
