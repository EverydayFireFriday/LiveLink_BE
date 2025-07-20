export const commonSchemas = {
  SuccessResponse: {
    type: "object",
    properties: {
      message: { type: "string" },
      data: { type: "object" },
      timestamp: { type: "string", format: "date-time" },
    },
  },

  ErrorResponse: {
    type: "object",
    properties: {
      message: { type: "string" },
      error: { type: "string" },
      timestamp: { type: "string", format: "date-time" },
    },
  },

  PaginationResponse: {
    type: "object",
    properties: {
      currentPage: { type: "integer", example: 1 },
      totalPages: { type: "integer", example: 5 },
      totalConcerts: { type: "integer", example: 87 },
      limit: { type: "integer", example: 20 },
    },
  },
};
