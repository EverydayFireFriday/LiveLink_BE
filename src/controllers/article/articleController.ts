import { asyncHandler, sendSuccess, handleControllerError, logPerformance } from "../../utils/controllerHelper";
import logger, { ErrorCategory } from "../../utils/logger";
// controllers/article/articleController.ts
import { asyncHandler, sendSuccess, handleControllerError, logPerformance } from "../../utils/controllerHelper";
import logger, { ErrorCategory } from "../../utils/logger";
import express from "express";
import { asyncHandler, sendSuccess, handleControllerError, logPerformance } from "../../utils/controllerHelper";
import logger from "../../utils/logger";
import { getArticleService } from "../../services/article";
import { safeParseInt } from "../../utils/numberUtils";

export class ArticleController {
  private articleService = getArticleService();

  // 🛡️ 세션 검증 헬퍼 메서드
  private validateSession(
    req: express.Request,
    res: express.Response
  ): boolean {
    if (!req.session?.user?.userId) {
      res.status(401).json({
        message: "로그인이 필요합니다.",
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });
      return false;
    }
    return true;
  }

  /**
   * @swagger
   * /article:
   *   post:
   *     summary: 게시글 생성
   *     description: 새로운 게시글을 생성합니다.
   *     tags: [Article]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - content_url
   *               - author_id
   *             properties:
   *               title:
   *                 type: string
   *                 maxLength: 200
   *                 example: "Next.js 14 새로운 기능 소개"
   *               content_url:
   *                 type: string
   *                 format: uri
   *                 example: "https://storage.example.com/articles/content-123.md"
   *               author_id:
   *                 type: string
   *                 example: "60d5ecf0f2c3b7001c8e4d7a" # Changed to string
   *               category_name: # Changed from category_id
   *                 type: string
   *                 example: "Backend"
   *               tag_names: # Changed from tag_ids
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["TypeScript", "Node.js"]
   *               is_published:
   *                 type: boolean
   *                 default: false
   *                 example: true
   *               published_at:
   *                 type: string
   *                 format: date-time
   *                 example: "2024-01-15T10:30:00Z"
   *     responses:
   *       201:
   *         description: 게시글 생성 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "게시글이 성공적으로 생성되었습니다."
   *                 article:
   *                   $ref: '#/components/schemas/Article'
   *       400:
   *         description: 잘못된 요청 데이터
   *       401:
   *         description: 로그인 필요
   *       404:
   *         description: 카테고리를 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  createArticle = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = "createArticle";
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const article = await this.articleService.createArticle(req.body);

      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });
      } else if (error.message.includes("존재하지 않는")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "게시글 생성에 실패했습니다." });
      }
    }
  });

  /**
   * @swagger
   * /article/{id}:
   *   get:
   *     summary: 게시글 상세 조회
   *     description: 특정 게시글의 상세 정보를 조회합니다.
   *     tags: [Article]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 게시글 ID
   *       - in: query
   *         name: withTags
   *         schema:
   *           type: boolean
   *           default: true
   *         description: 태그 정보 포함 여부
   *       - in: query
   *         name: withStats
   *         schema:
   *           type: boolean
   *           default: true
   *         description: 통계 정보 포함 여부
   *     responses:
   *       200:
   *         description: 게시글 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "게시글 조회 성공"
   *                 article:
   *                   $ref: '#/components/schemas/ArticleDetail'
   *       404:
   *         description: 게시글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const withTags = req.query.withTags !== "false";
      const withStats = req.query.withStats !== "false";

      const article = await this.articleService.getArticleById(id, {
        withTags,
        withStats,
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });

      // 조회수 증가
      await this.articleService.incrementViews(id);

      res.status(200).json({
        message: "게시글 조회 성공",
        article,
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });
      } else {
        res.status(500).json({ message: "게시글 조회에 실패했습니다." });
      }
    }
  });

  /**
   * @swagger
   * /article:
   *   get:
   *     summary: 발행된 게시글 목록 조회
   *     description: 발행된 게시글 목록을 페이지네이션과 함께 조회합니다.
   *     tags: [Article]
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
   *         name: category_id
   *         schema:
   *           type: string
   *         description: 카테고리 ID로 필터링
   *       - in: query
   *         name: tag_id
   *         schema:
   *           type: string
   *         description: 태그 ID로 필터링
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 제목/내용 검색어
   *     responses:
   *       200:
   *         description: 게시글 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "게시글 목록 조회 성공"
   *                 articles:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ArticleListItem'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       500:
   *         description: 서버 에러
   */
  getPublishedArticles = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);
      const category_id = req.query.category_id as string;
      const tag_id = req.query.tag_id as string;
      const search = req.query.search as string;

      const result = await this.articleService.getPublishedArticles({
        page,
        limit,
        category_id,
        tag_id,
        search,
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });

      res.status(200).json({
        message: "게시글 목록 조회 성공",
        articles: result.articles,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });
    } catch (error) {
      handleControllerError(req, "getArticles", error);

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });
      } else if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "게시글 수정에 실패했습니다." });
      }
    }
  });

  /**
   * @swagger
   * /article/{id}:
   *   delete:
   *     summary: 게시글 삭제
   *     description: 게시글과 관련된 모든 데이터를 삭제합니다.
   *     tags: [Article]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 게시글 ID
   *     responses:
   *       200:
   *         description: 게시글 삭제 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "게시글이 성공적으로 삭제되었습니다."
   *       401:
   *         description: 로그인 필요
   *       404:
   *         description: 게시글을 찾을 수 없음
   *       500:
   *         description: 서버 에러
   */
  deleteArticle = async (req: express.Request, res: express.Response) => {
    try {
      // 🛡️ 세션 검증
      if (!this.validateSession(req, res)) return;

      const { id } = req.params;
      await this.articleService.deleteArticle(id);

      res.status(200).json({
        message: "게시글이 성공적으로 삭제되었습니다.",
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });
      } else {
        res.status(500).json({ message: "게시글 삭제에 실패했습니다." });
      }
    }
  });

  /**
   * @swagger
   * /article/author/{authorId}:
   *   get:
   *     summary: 작성자별 게시글 목록 조회
   *     description: 특정 작성자의 게시글 목록을 조회합니다.
   *     tags: [Article]
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
   *         description: 페이지당 게시글 수
   *       - in: query
   *         name: includeUnpublished
   *         schema:
   *           type: boolean
   *           default: false
   *         description: 미발행 게시글 포함 여부
   *     responses:
   *       200:
   *         description: 작성자별 게시글 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "작성자별 게시글 목록 조회 성공"
   *                 articles:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ArticleListItem'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       500:
   *         description: 서버 에러
   */
  getArticlesByAuthor = async (req: express.Request, res: express.Response) => {
    try {
      const { authorId } = req.params;
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);
      const includeUnpublished = req.query.includeUnpublished === "true";

      const result = await this.articleService.getArticlesByAuthor(authorId, {
        page,
        limit,
        includeUnpublished,
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });

      res.status(200).json({
        message: "작성자별 게시글 목록 조회 성공",
        articles: result.articles,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });
    } catch (error) {
      console.error("작성자별 게시글 조회 에러:", error);
      res.status(500).json({ message: "작성자별 게시글 조회에 실패했습니다." });
    }
  });

  /**
   * @swagger
   * /article/popular:
   *   get:
   *     summary: 인기 게시글 목록 조회
   *     description: 좋아요/북마크 수를 기준으로 인기 게시글을 조회합니다.
   *     tags: [Article]
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
   *           default: 7
   *         description: 최근 며칠간의 데이터 기준
   *     responses:
   *       200:
   *         description: 인기 게시글 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "인기 게시글 목록 조회 성공"
   *                 articles:
   *                   type: array
   *                   items:
   *                     allOf:
   *                       - $ref: '#/components/schemas/ArticleListItem'
   *                       - type: object
   *                         properties:
   *                           popularityScore:
   *                             type: integer
   *                             description: 인기도 점수
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       500:
   *         description: 서버 에러
   */
  getPopularArticles = async (req: express.Request, res: express.Response) => {
    try {
      const page = safeParseInt(req.query.page, 1);
      const limit = safeParseInt(req.query.limit, 20);
      const days = safeParseInt(req.query.days, 7);

      const result = await this.articleService.getPopularArticles({
        page,
        limit,
        days,
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });

      res.status(200).json({
        message: "인기 게시글 목록 조회 성공",
        articles: result.articles,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      logPerformance(req, operation, startTime, { articleId: article.id });
      sendSuccess(res, req, "게시글이 성공적으로 생성되었습니다.", { article }, 201);
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticleById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticleById';
    
    try {
      const { id } = req.params;
      
      logger.debug('Article retrieval started', {
        operation,
        correlationId: req.correlationId,
        articleId: id
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const article = await this.articleService.getArticleById(id);

      logPerformance(req, operation, startTime);
      sendSuccess(res, req, "게시글 조회 성공", { article });
      
    } catch (error: any) {
      handleControllerError(req, operation, error);
    }
  });

  getArticles = asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const operation = 'getArticles';
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const order = req.query.order as string || "desc";

      logger.debug('Articles list retrieval started', {
        operation,
        correlationId: req.correlationId,
        metadata: { page, limit, category, sortBy, order }
      });

      // 지연 로딩
      if (!this.articleService) {
        const { ArticleService } = await import("../../services/article/articleService");
        this.articleService = new ArticleService();
      }

      const result = await this.articleService.getArticles({
        page,
        limit,
        category,
        sortBy,
        order,
      });

      logPerformance(req, operation, startTime, { 
        articlesCount: result.articles.length,
        totalArticles: result.total 
      });
      
      sendSuccess(res, req, "게시글 목록 조회 성공", {
        articles: result.articles,
        pagination: {
          currentPage: page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      });
      
    } catch (error) {
      handleControllerError(req, operation, error);
    }
  });
      });
    } catch (error) {
      console.error("인기 게시글 조회 에러:", error);
      res.status(500).json({ message: "인기 게시글 조회에 실패했습니다." });
    }
  });
}
