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
      // ... 나머지 Concert 속성들
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
