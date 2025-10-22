export const concertSchemas = {
  Concert: {
    type: "object",
    required: ["uid", "title", "location", "datetime"],
    properties: {
      uid: {
        type: "string",
        example: "concert_1703123456789_abc123",
        description: "사용자 지정 ID (timestamp 포함)",
      },
      title: {
        type: "string",
        example: "아이유 콘서트 2024",
        description: "콘서트 제목",
      },
      artist: {
        type: "array",
        items: { type: "string" },
        example: ["아이유", "특별 게스트"],
        description: "아티스트명 배열 (빈 배열 허용)",
      },
      location: {
        type: "array",
        items: { type: "string" },
        description: "공연 장소 목록 (문자열 배열로 간소화)",
        example: ["올림픽공원 체조경기장", "부산 BEXCO"],
        minItems: 1,
      },
      datetime: {
        type: "array",
        items: { type: "string", format: "date-time" },
        example: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"],
        description: "공연 날짜 및 시간 배열 (ISO 8601 형식)",
      },
      price: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tier: { type: "string", example: "VIP" },
            amount: { type: "number", example: 150000 },
          },
        },
        description: "가격 정보 (선택사항)",
      },
      description: {
        type: "string",
        example: "아이유의 연말 콘서트입니다.",
        description: "공연 설명 (선택사항)",
      },
      category: {
        type: "array",
        items: { type: "string" },
        example: ["K-POP"],
        description: "카테고리 (선택사항)",
      },
      ticketLink: {
        type: "array",
        items: {
          type: "object",
          properties: {
            platform: { type: "string", example: "멜론티켓" },
            url: { type: "string", example: "https://ticket.melon.com/..." },
          },
        },
        description: "티켓 구매 링크 (선택사항)",
      },
      ticketOpenDate: {
        type: "array",
        items: {
          type: "object",
          properties: {
            openTitle: { type: "string", example: "선예매 오픈" },
            openDate: {
              type: "string",
              format: "date-time",
              example: "2024-11-01T10:00:00Z",
            },
          },
        },
        example: [
          {
            openTitle: "선예매 오픈",
            openDate: "2024-11-01T10:00:00Z",
          },
          {
            openTitle: "일반예매 오픈",
            openDate: "2024-11-05T10:00:00Z",
          },
        ],
        description: "티켓 오픈 날짜 목록 (선택사항)",
      },
      posterImage: {
        type: "string",
        example: "https://example.com/poster.jpg",
        description: "포스터 이미지 URL (선택사항)",
      },
      infoImages: {
        type: "array",
        items: { type: "string" },
        example: ["https://example.com/info1.jpg"],
        description: "상세 정보 이미지들 (선택사항)",
      },
      status: {
        type: "string",
        enum: ["upcoming", "ongoing", "completed", "cancelled"],
        example: "upcoming",
        description: "콘서트 상태",
      },
      likesCount: {
        type: "number",
        example: 42,
        description: "좋아요 수",
      },
      isLiked: {
        type: "boolean",
        example: true,
        description: "현재 사용자의 좋아요 여부",
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  ConcertCreateRequest: {
    type: "object",
    required: ["uid", "title", "location", "datetime"],
    properties: {
      uid: {
        type: "string",
        example: "concert_1703123456789_abc123",
        description: "사용자 지정 ID (timestamp 포함)",
      },
      title: {
        type: "string",
        example: "아이유 콘서트 2024",
        description: "콘서트 제목",
      },
      artist: {
        type: "array",
        items: { type: "string" },
        example: ["아이유", "특별 게스트"],
        description: "아티스트명 배열 (빈 배열 허용)",
      },
      location: {
        type: "array",
        items: { type: "string" },
        description: "공연 장소 목록 (문자열 배열로 간소화)",
        example: ["올림픽공원 체조경기장", "부산 BEXCO"],
        minItems: 1,
      },
      datetime: {
        type: "array",
        items: { type: "string", format: "date-time" },
        example: ["2024-06-15T19:00:00+09:00", "2024-06-16T19:00:00+09:00"],
        description: "공연 날짜 및 시간 배열 (ISO 8601 형식)",
      },
      price: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tier: { type: "string", example: "VIP" },
            amount: { type: "number", example: 150000 },
          },
        },
        description: "가격 정보 (선택사항)",
      },
      description: {
        type: "string",
        example: "아이유의 연말 콘서트입니다.",
        description: "공연 설명 (선택사항)",
      },
      category: {
        type: "array",
        items: { type: "string" },
        example: ["K-POP"],
        description: "카테고리 (선택사항)",
      },
      ticketLink: {
        type: "array",
        items: {
          type: "object",
          properties: {
            platform: { type: "string", example: "멜론티켓" },
            url: { type: "string", example: "https://ticket.melon.com/..." },
          },
        },
        description: "티켓 구매 링크 (선택사항)",
      },
      ticketOpenDate: {
        type: "array",
        items: {
          type: "object",
          properties: {
            openTitle: { type: "string", example: "선예매 오픈" },
            openDate: {
              type: "string",
              format: "date-time",
              example: "2024-11-01T10:00:00Z",
            },
          },
        },
        example: [
          {
            openTitle: "선예매 오픈",
            openDate: "2024-11-01T10:00:00Z",
          },
          {
            openTitle: "일반예매 오픈",
            openDate: "2024-11-05T10:00:00Z",
          },
        ],
        description: "티켓 오픈 날짜 목록 (선택사항)",
      },
      posterImage: {
        type: "string",
        example: "https://example.com/poster.jpg",
        description: "포스터 이미지 URL (선택사항)",
      },
      infoImages: {
        type: "array",
        items: { type: "string" },
        example: ["https://example.com/info1.jpg"],
        description: "상세 정보 이미지들 (선택사항)",
      },
      status: {
        type: "string",
        enum: ["upcoming", "ongoing", "completed", "cancelled"],
        example: "upcoming",
        description: "콘서트 상태",
      },
    },
  },

  LikeResponse: {
    type: "object",
    properties: {
      message: { type: "string", example: "좋아요 추가/제거됨" },
      isLiked: { type: "boolean", example: true },
      likesCount: { type: "integer", example: 43 },
      timestamp: { type: "string", format: "date-time" },
    },
  },
};
