export const searchSchemas = {
  SearchQuery: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description: "검색어",
        example: "BTS 콘서트"
      },
      type: {
        type: "string",
        enum: ["all", "concerts", "articles", "users", "chats"],
        description: "검색 대상",
        example: "all"
      },
      filters: {
        type: "object",
        properties: {
          dateFrom: {
            type: "string",
            format: "date",
            description: "시작 날짜",
            example: "2024-01-01"
          },
          dateTo: {
            type: "string",
            format: "date",
            description: "종료 날짜",
            example: "2024-12-31"
          },
          location: {
            type: "string",
            description: "지역 필터",
            example: "서울"
          },
          category: {
            type: "string",
            description: "카테고리 필터",
            example: "K-POP"
          }
        }
      },
      sort: {
        type: "string",
        enum: ["relevance", "date", "popularity"],
        description: "정렬 기준",
        example: "relevance"
      },
      page: {
        type: "number",
        minimum: 1,
        description: "페이지 번호",
        example: 1
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 50,
        description: "페이지당 결과 수",
        example: 10
      }
    }
  },

  SearchResult: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "결과 ID",
        example: "507f1f77bcf86cd799439020"
      },
      type: {
        type: "string",
        enum: ["concert", "article", "user", "chat"],
        description: "결과 타입",
        example: "concert"
      },
      title: {
        type: "string",
        description: "제목",
        example: "BTS WORLD TOUR 2024"
      },
      description: {
        type: "string",
        description: "설명",
        example: "BTS의 월드 투어 콘서트입니다."
      },
      thumbnail: {
        type: "string",
        format: "uri",
        description: "썸네일 이미지",
        example: "https://cdn.livelink.app/thumbnails/concert_thumbnail.jpg"
      },
      relevanceScore: {
        type: "number",
        description: "관련도 점수",
        example: 0.95
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "생성 시간"
      }
    }
  },

  SearchResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true
      },
      message: {
        type: "string",
        example: "검색 완료"
      },
      data: {
        type: "object",
        properties: {
          query: {
            type: "string",
            example: "BTS 콘서트"
          },
          results: {
            type: "array",
            items: {
              $ref: "#/components/schemas/SearchResult"
            }
          },
          totalCount: {
            type: "number",
            example: 25
          },
          pagination: {
            type: "object",
            properties: {
              current: { type: "number", example: 1 },
              total: { type: "number", example: 3 },
              hasNext: { type: "boolean", example: true },
              hasPrev: { type: "boolean", example: false }
            }
          },
          facets: {
            type: "object",
            properties: {
              types: {
                type: "object",
                properties: {
                  concerts: { type: "number", example: 10 },
                  articles: { type: "number", example: 8 },
                  users: { type: "number", example: 5 },
                  chats: { type: "number", example: 2 }
                }
              },
              locations: {
                type: "object",
                additionalProperties: {
                  type: "number"
                },
                example: {
                  "서울": 15,
                  "부산": 5,
                  "대구": 3
                }
              }
            }
          }
        }
      }
    }
  }
};