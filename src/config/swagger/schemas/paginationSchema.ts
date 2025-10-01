export const paginationSchema = {
  Pagination: {
    type: 'object',
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
    properties: {
      pagination: {
        $ref: '#/components/schemas/PaginationInfo',
      },
    },
  },
};
