export const articleSchema = {
  ArticleListItem: {
    type: 'object',
    properties: {
      _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
      title: { type: 'string', example: 'Sample Article Title' },
      author_id: { type: 'string', example: '60d0fe4f5311236168a109cb' },
      category_id: { type: 'string', example: '60d0fe4f5311236168a109cc' },
      published_at: {
        type: 'string',
        format: 'date-time',
        example: '2023-01-01T12:00:00Z',
      },
      views: { type: 'number', example: 1500 },
      likes_count: { type: 'number', example: 100 },
    },
  },
  ArticleDetail: {
    type: 'object',
    properties: {
      _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
      title: { type: 'string', example: 'Sample Article Title' },
      content_url: {
        type: 'string',
        example: 'https://example.com/article-content',
      },
      author_id: { type: 'string', example: '60d0fe4f5311236168a109cb' },
      category_id: { type: 'string', example: '60d0fe4f5311236168a109cc' },
      is_published: { type: 'boolean', example: true },
      published_at: {
        type: 'string',
        format: 'date-time',
        example: '2023-01-01T12:00:00Z',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        example: '2023-01-01T10:00:00Z',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
        example: '2023-01-01T11:00:00Z',
      },
      views: { type: 'number', example: 1500 },
      likes_count: { type: 'number', example: 100 },
    },
  },
};
