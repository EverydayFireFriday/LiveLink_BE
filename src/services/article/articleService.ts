// services/article/articleService.ts
import {
  getArticleModel,
  getTagModel,
  getCategoryModel,
  getArticleTagModel,
  getArticleLikeModel,
  getArticleBookmarkModel,
  IArticle,
} from "../../models/article";
import {
  createArticleSchema,
  updateArticleSchema,
  articleIdSchema,
  incrementViewSchema,
} from "../../utils/validation/article";
import { ObjectId } from "mongodb";

export class ArticleService {
  private articleModel = getArticleModel();
  private tagModel = getTagModel();
  private categoryModel = getCategoryModel();
  private articleTagModel = getArticleTagModel();
  private articleLikeModel = getArticleLikeModel();
  private articleBookmarkModel = getArticleBookmarkModel();

  // 게시글 생성
  async createArticle(data: any): Promise<IArticle> {
    // 유효성 검사
    const validatedData = createArticleSchema.parse(data);

    let categoryObjectId: ObjectId | null = null;
    if (validatedData.category_name) {
      const category = await this.categoryModel.findByName(
        validatedData.category_name
      );
      if (!category) {
        throw new Error(`'${validatedData.category_name}'은(는) 존재하지 않는 카테고리입니다.`);
      }
      categoryObjectId = category._id;
    }

    let tagObjectIds: ObjectId[] = [];
    if (validatedData.tag_names && validatedData.tag_names.length > 0) {
      const tags = await this.tagModel.findManyByName(validatedData.tag_names);
      if (tags.length !== validatedData.tag_names.length) {
        const foundNames = tags.map(t => t.name);
        const notFoundNames = validatedData.tag_names.filter(n => !foundNames.includes(n));
        throw new Error(`다음 태그가 존재하지 않습니다: ${notFoundNames.join(', ')}`);
      }
      tagObjectIds = tags.map(tag => tag._id);
    }

    // 게시글 생성
    const article = await this.articleModel.create({
      title: validatedData.title,
      content_url: validatedData.content_url,
      author_id: new ObjectId(validatedData.author_id),
      category_id: categoryObjectId,
      is_published: validatedData.is_published || false,
      published_at: validatedData.published_at || null,
    });

    // 태그 연결
    if (tagObjectIds.length > 0) {
      await this.articleTagModel.createMany(
        article._id.toString(),
        tagObjectIds.map(id => id.toString())
      );
    }

    return article;
  }

  // 게시글 조회 (ID로)
  async getArticleById(
    id: string,
    options: { withTags?: boolean; withStats?: boolean } = {}
  ): Promise<any> {
    articleIdSchema.parse({ id: parseInt(id) });

    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    let result: any = { ...article };

    // 태그 정보 포함
    if (options.withTags) {
      const tags = await this.articleTagModel.findTagsByArticle(id);
      result.tags = tags;
    }

    // 통계 정보 포함
    if (options.withStats) {
      const [likesCount, bookmarksCount] = await Promise.all([
        this.articleLikeModel.countByArticle(id),
        this.articleBookmarkModel.countByArticle(id),
      ]);
      result.stats = { likesCount, bookmarksCount };
    }

    return result;
  }

  // 발행된 게시글 목록 조회
  async getPublishedArticles(
    options: {
      page?: number;
      limit?: number;
      category_id?: string;
      tag_id?: string;
      search?: string;
    } = {}
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, category_id, tag_id, search } = options;

    let articles: any[];
    let total: number;

    if (tag_id) {
      // 태그별 게시글 조회
      const result = await this.articleTagModel.findArticlesByTag(tag_id, {
        page,
        limit,
        publishedOnly: true,
      });
      articles = result.articles;
      total = result.total;
    } else if (search) {
      // 검색
      const result = await this.articleModel.search(search, {
        page,
        limit,
        publishedOnly: true,
      });
      articles = result.articles;
      total = result.total;
    } else {
      // 일반 목록 조회
      const result = await this.articleModel.findPublished({
        page,
        limit,
        category_id,
      });
      articles = result.articles;
      total = result.total;
    }

    // 각 게시글에 태그 정보 추가
    const articlesWithTags = await Promise.all(
      articles.map(async (article) => {
        const tags = await this.articleTagModel.findTagsByArticle(
          article._id.toString()
        );
        return { ...article, tags };
      })
    );

    return {
      articles: articlesWithTags,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 게시글 업데이트
  async updateArticle(id: string, data: any): Promise<IArticle> {
    articleIdSchema.parse({ id: parseInt(id) });
    const validatedData = updateArticleSchema.parse(data);

    // 게시글 존재 확인
    const existingArticle = await this.articleModel.findById(id);
    if (!existingArticle) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    const updateData: any = { ...validatedData };

    // 카테고리 이름으로 ID 조회
    if (validatedData.category_name !== undefined) {
      if (validatedData.category_name === null) {
        updateData.category_id = null; // 카테고리 제거
      } else {
        const category = await this.categoryModel.findByName(
          validatedData.category_name
        );
        if (!category) {
          throw new Error(`'${validatedData.category_name}'은(는) 존재하지 않는 카테고리입니다.`);
        }
        updateData.category_id = category._id; // ObjectId로 변환
      }
      delete updateData.category_name; // category_name은 DB에 저장되지 않으므로 삭제
    }

    // 태그 이름으로 ID 조회 및 업데이트
    if (validatedData.tag_names !== undefined) {
      if (validatedData.tag_names.length > 0) {
        const tags = await this.tagModel.findManyByName(validatedData.tag_names);
        if (tags.length !== validatedData.tag_names.length) {
          const foundNames = tags.map(t => t.name);
          const notFoundNames = validatedData.tag_names.filter(n => !foundNames.includes(n));
          throw new Error(`다음 태그가 존재하지 않습니다: ${notFoundNames.join(', ')}`);
        }
        await this.articleTagModel.updateArticleTags(
          id,
          tags.map(tag => tag._id.toString()) // ObjectId를 string으로 변환
        );
      } else {
        await this.articleTagModel.deleteByArticle(id); // 모든 태그 제거
      }
      delete updateData.tag_names; // tag_names는 DB에 저장되지 않으므로 삭제
    }

    const updatedArticle = await this.articleModel.updateById(id, updateData);
    if (!updatedArticle) {
      throw new Error("게시글 업데이트에 실패했습니다.");
    }

    return updatedArticle;
  }

  // 게시글 삭제
  async deleteArticle(id: string): Promise<void> {
    articleIdSchema.parse({ id: parseInt(id) });

    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    // 관련 데이터 삭제
    await Promise.all([
      this.articleTagModel.deleteByArticle(id),
      this.articleLikeModel.deleteByArticle(id),
      this.articleBookmarkModel.deleteByArticle(id),
    ]);

    // 게시글 삭제
    await this.articleModel.deleteById(id);
  }

  // 조회수 증가
  async incrementViews(id: string): Promise<void> {
    incrementViewSchema.parse({ article_id: parseInt(id) });
    await this.articleModel.incrementViews(id);
  }

  // 작성자별 게시글 조회
  async getArticlesByAuthor(
    authorId: string,
    options: {
      page?: number;
      limit?: number;
      includeUnpublished?: boolean;
    } = {}
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;

    const result = await this.articleModel.findByAuthor(authorId, options);

    // 각 게시글에 태그 정보 추가
    const articlesWithTags = await Promise.all(
      result.articles.map(async (article) => {
        const tags = await this.articleTagModel.findTagsByArticle(
          article._id.toString()
        );
        return { ...article, tags };
      })
    );

    return {
      articles: articlesWithTags,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  // 사용자가 좋아요한 게시글 목록
  async getLikedArticlesByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;

    // 좋아요한 게시글 ID 목록 조회
    const { articleIds, total } =
      await this.articleLikeModel.findArticleIdsByUser(userId, { page, limit });

    if (articleIds.length === 0) {
      return { articles: [], total: 0, page, totalPages: 0 };
    }

    // 게시글 정보 조회 (여러 ID로 조회하는 로직 구현 필요)
    const articles = await Promise.all(
      articleIds.map(async (articleId) => {
        return await this.articleModel.findById(articleId);
      })
    );

    // null 값 필터링
    const validArticles = articles.filter(Boolean);

    // 각 게시글에 태그 정보 추가
    const articlesWithTags = await Promise.all(
      validArticles.map(async (article: any) => {
        const tags = await this.articleTagModel.findTagsByArticle(
          article._id.toString()
        );
        return { ...article, tags };
      })
    );

    return {
      articles: articlesWithTags,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 사용자가 북마크한 게시글 목록
  async getBookmarkedArticlesByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;

    // 북마크한 게시글 정보 조회 (게시글 정보 포함)
    const { bookmarks, total } =
      await this.articleBookmarkModel.findBookmarkedArticlesByUser(userId, {
        page,
        limit,
      });

    // 각 게시글에 태그 정보 추가
    const articlesWithTags = await Promise.all(
      bookmarks.map(async (bookmark) => {
        if (bookmark.article) {
          const tags = await this.articleTagModel.findTagsByArticle(
            bookmark.article._id.toString()
          );
          return {
            ...bookmark.article,
            tags,
            bookmarkedAt: bookmark.created_at,
          };
        }
        return null;
      })
    );

    const validArticles = articlesWithTags.filter(Boolean);

    return {
      articles: validArticles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 인기 게시글 조회 (좋아요 수 기준)
  async getPopularArticles(
    options: {
      page?: number;
      limit?: number;
      days?: number;
    } = {}
  ): Promise<{
    articles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, days = 7 } = options;

    // 최근 좋아요가 많은 게시글들 조회
    const result =
      await this.articleBookmarkModel.findPopularBookmarkedArticles({
        page,
        limit,
        days,
      });

    // 각 게시글에 태그 정보 추가
    const articlesWithTags = await Promise.all(
      result.articles.map(async (item) => {
        if (item.article) {
          const tags = await this.articleTagModel.findTagsByArticle(
            item.article._id.toString()
          );
          return {
            ...item.article,
            tags,
            popularityScore: item.bookmarkCount,
          };
        }
        return null;
      })
    );

    const validArticles = articlesWithTags.filter(Boolean);

    return {
      articles: validArticles,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}

// 싱글톤 인스턴스
let articleService: ArticleService;

export const getArticleService = (): ArticleService => {
  if (!articleService) {
    articleService = new ArticleService();
  }
  return articleService;
};
