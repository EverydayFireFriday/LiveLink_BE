export const paginationSchema = {
  Pagination: {
    type: 'object',
    required: ['page', 'limit', 'total', 'totalPages'],
    properties: {
      page: { type: 'number', example: 1, description: 'Current page number' },
      limit: {
        type: 'number',
        example: 10,
        description: 'Number of items per page',
      },
      total: {
        type: 'number',
        example: 100,
        description: 'Total number of items',
      },
      totalPages: {
        type: 'number',
        example: 10,
        description: 'Total number of pages',
      },
    },
  },
  PaginationInfo: {
    type: 'object',
    required: ['page', 'limit', 'totalItems', 'totalPages'],
    properties: {
      page: { type: 'number', example: 1, description: 'Current page number' },
      limit: {
        type: 'number',
        example: 10,
        description: 'Number of items per page',
      },
      totalItems: {
        type: 'number',
        example: 100,
        description: 'Total number of items',
      },
      totalPages: {
        type: 'number',
        example: 10,
        description: 'Total number of pages',
      },
    },
  },
  PaginationResponse: {
    type: 'object',
    required: ['pagination'],
    properties: {
      pagination: {
        $ref: '#/components/schemas/PaginationInfo',
      },
    },
  },
};
