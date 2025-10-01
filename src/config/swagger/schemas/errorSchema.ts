export const errorSchema = {
  ErrorResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: '에러 메시지' },
      statusCode: { type: 'number', example: 400 },
      error: { type: 'string', example: 'Bad Request' },
    },
  },
};
