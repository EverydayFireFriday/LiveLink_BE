export const commentSchema = {
  Comment: {
    type: 'object',
    required: [
      '_id',
      'article_id',
      'author_id',
      'content',
      'created_at',
      'updated_at',
      'likes_count',
    ],
    properties: {
      _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
      article_id: { type: 'string', example: '60d0fe4f5311236168a109cb' },
      author_id: { type: 'string', example: '60d0fe4f5311236168a109cc' },
      content: { type: 'string', example: '이것은 댓글 내용입니다.' },
      parent_id: {
        type: 'string',
        nullable: true,
        example: '60d0fe4f5311236168a109cd',
        description: '부모 댓글 ID (답글인 경우에만 포함, 선택사항)',
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
      likes_count: { type: 'number', example: 5 },
    },
  },
};
