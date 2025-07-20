export const articleSchemas = {
  Article: {
    type: "object",
    required: [
      "id",
      "title",
      "content_url",
      "author_id",
      "is_published",
      "created_at",
      "updated_at",
    ],
    properties: {
      id: {
        type: "number",
        description: "아티클 고유 ID",
        example: 1,
      },
      title: {
        type: "string",
        description: "아티클 제목",
        example: "Node.js와 TypeScript로 만드는 RESTful API",
        maxLength: 200,
      },
      content_url: {
        type: "string",
        format: "uri",
        description: "아티클 내용 URL",
        example: "https://example.com/articles/nodejs-typescript-api.md",
      },
      author_id: {
        type: "number",
        description: "작성자 ID",
        example: 101,
      },
      category_id: {
        type: "number",
        description: "카테고리 ID (선택사항)",
        example: 201,
        nullable: true,
      },
      is_published: {
        type: "boolean",
        description: "발행 여부",
        example: true,
      },
      published_at: {
        type: "string",
        format: "date-time",
        description: "발행 일시",
        example: "2024-07-12T10:00:00Z",
        nullable: true,
      },
      created_at: {
        type: "string",
        format: "date-time",
        description: "생성 일시",
        example: "2024-07-12T09:00:00Z",
      },
      updated_at: {
        type: "string",
        format: "date-time",
        description: "수정 일시",
        example: "2024-07-12T11:00:00Z",
      },
      views: {
        type: "number",
        description: "조회수",
        example: 250,
        minimum: 0,
      },
      likes_count: {
        type: "number",
        description: "좋아요 수",
        example: 42,
        minimum: 0,
      },
    },
  },

  ArticleWithRelations: {
    allOf: [
      { $ref: "#/components/schemas/Article" },
      {
        type: "object",
        properties: {
          author: {
            type: "object",
            description: "작성자 정보",
            properties: {
              id: { type: "number", example: 101 },
              username: { type: "string", example: "yanghuibeom" },
              email: {
                type: "string",
                format: "email",
                example: "yanghuibeom@example.com",
              },
            },
            required: ["id", "username", "email"],
          },
          category: {
            type: "object",
            description: "카테고리 정보",
            nullable: true,
            properties: {
              id: { type: "number", example: 201 },
              name: { type: "string", example: "Backend" },
            },
            required: ["id", "name"],
          },
          tags: {
            type: "array",
            description: "태그 목록",
            items: {
              type: "object",
              properties: {
                id: { type: "number", example: 301 },
                name: { type: "string", example: "TypeScript" },
              },
              required: ["id", "name"],
            },
          },
        },
      },
    ],
  },

  CreateArticleRequest: {
    type: "object",
    required: ["title", "content_url"],
    properties: {
      title: {
        type: "string",
        description: "아티클 제목",
        example: "새로운 아티클 제목",
        maxLength: 200,
      },
      content_url: {
        type: "string",
        format: "uri",
        description: "아티클 내용 URL",
        example: "https://example.com/articles/new-article.md",
      },
      category_name: {
        type: "string",
        description: "카테고리 이름 (선택사항)",
        example: "Backend",
      },
      tag_names: {
        type: "array",
        description: "태그 이름 목록 (선택사항)",
        items: {
          type: "string",
          example: "TypeScript",
        },
      },
      is_published: {
        type: "boolean",
        description: "발행 여부 (기본값: false)",
        example: false,
        default: false,
      },
      published_at: {
        type: "string",
        format: "date-time",
        description: "발행 일시 (is_published가 true일 때 설정)",
        example: "2024-07-12T10:00:00Z",
      },
    },
  },

  UpdateArticleRequest: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "수정된 아티클 제목",
        example: "수정된 아티클 제목",
        maxLength: 200,
      },
      content_url: {
        type: "string",
        format: "uri",
        description: "수정된 아티클 내용 URL",
        example: "https://example.com/articles/updated-article.md",
      },
      category_name: {
        type: "string",
        description: "수정된 카테고리 이름",
        example: "Frontend",
      },
      tag_names: {
        type: "array",
        description: "수정된 태그 이름 목록",
        items: {
          type: "string",
          example: "JavaScript",
        },
      },
      is_published: {
        type: "boolean",
        description: "발행 여부 수정",
        example: true,
      },
      published_at: {
        type: "string",
        format: "date-time",
        description: "발행 일시 수정",
        example: "2024-07-13T12:00:00Z",
      },
    },
  },

  // Category 관련 스키마
  Category: {
    type: "object",
    required: ["id", "name", "created_at"],
    properties: {
      id: {
        type: "number",
        description: "카테고리 고유 ID",
        example: 201,
      },
      name: {
        type: "string",
        description: "카테고리 이름",
        example: "Backend",
        maxLength: 50,
      },
      created_at: {
        type: "string",
        format: "date-time",
        description: "생성 일시",
        example: "2024-07-12T09:00:00Z",
      },
    },
  },

  CreateCategoryRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        description: "카테고리 이름",
        example: "웹 개발",
        maxLength: 50,
      },
    },
  },

  // Tag 관련 스키마
  Tag: {
    type: "object",
    required: ["id", "name", "created_at"],
    properties: {
      id: {
        type: "number",
        description: "태그 고유 ID",
        example: 301,
      },
      name: {
        type: "string",
        description: "태그 이름",
        example: "TypeScript",
        maxLength: 30,
      },
      created_at: {
        type: "string",
        format: "date-time",
        description: "생성 일시",
        example: "2024-07-12T09:00:00Z",
      },
    },
  },

  CreateTagRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        description: "태그 이름",
        example: "Node.js",
        maxLength: 30,
      },
    },
  },

  // Comment 관련 스키마
  Comment: {
    type: "object",
    required: [
      "id",
      "article_id",
      "author_id",
      "content",
      "created_at",
      "updated_at",
    ],
    properties: {
      id: {
        type: "number",
        description: "댓글 고유 ID",
        example: 1,
      },
      article_id: {
        type: "number",
        description: "아티클 ID",
        example: 1,
      },
      author_id: {
        type: "number",
        description: "작성자 ID",
        example: 101,
      },
      content: {
        type: "string",
        description: "댓글 내용",
        example: "유익한 정보 감사합니다!",
        maxLength: 1000,
      },
      parent_id: {
        type: "number",
        description: "부모 댓글 ID (대댓글인 경우)",
        example: 1,
        nullable: true,
      },
      created_at: {
        type: "string",
        format: "date-time",
        description: "생성 일시",
        example: "2024-07-12T10:30:00Z",
      },
      updated_at: {
        type: "string",
        format: "date-time",
        description: "수정 일시",
        example: "2024-07-12T10:30:00Z",
      },
      likes_count: {
        type: "number",
        description: "좋아요 수",
        example: 10,
        minimum: 0,
      },
    },
  },

  CommentWithReplies: {
    allOf: [
      { $ref: "#/components/schemas/Comment" },
      {
        type: "object",
        properties: {
          replies: {
            type: "array",
            description: "대댓글 목록",
            items: { $ref: "#/components/schemas/Comment" },
          },
        },
      },
    ],
  },

  CreateCommentRequest: {
    type: "object",
    required: ["content"],
    properties: {
      content: {
        type: "string",
        description: "댓글 내용",
        example: "정말 유용한 글이네요! 감사합니다.",
        maxLength: 1000,
      },
      parent_id: {
        type: "number",
        description: "부모 댓글 ID (대댓글인 경우)",
        example: 1,
      },
    },
  },

  UpdateCommentRequest: {
    type: "object",
    required: ["content"],
    properties: {
      content: {
        type: "string",
        description: "댓글 내용",
        example: "수정된 댓글 내용입니다.",
        maxLength: 1000,
      },
    },
  },

  // Like/Bookmark 관련 스키마
  ArticleLikeResponse: {
    type: "object",
    properties: {
      message: { type: "string", example: "아티클 좋아요 추가/제거됨" },
      isLiked: { type: "boolean", example: true },
      likesCount: { type: "integer", example: 26 },
      timestamp: { type: "string", format: "date-time" },
    },
  },

  ArticleBookmarkResponse: {
    type: "object",
    properties: {
      message: { type: "string", example: "아티클 북마크 추가/제거됨" },
      isBookmarked: { type: "boolean", example: true },
      timestamp: { type: "string", format: "date-time" },
    },
  },

  ArticleListResponse: {
    type: "object",
    properties: {
      message: { type: "string", example: "아티클 목록 조회 성공" },
      data: {
        type: "object",
        properties: {
          articles: {
            type: "array",
            items: { $ref: "#/components/schemas/ArticleWithRelations" },
          },
          pagination: { $ref: "#/components/schemas/PaginationResponse" },
        },
      },
      timestamp: { type: "string", format: "date-time" },
    },
  },
};
