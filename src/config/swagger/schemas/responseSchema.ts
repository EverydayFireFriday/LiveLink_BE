export const responseSchema = {
  ApiResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        description: '요청 성공 여부',
        example: true,
      },
      message: {
        type: 'string',
        description: '응답 메시지',
        example: '요청이 성공적으로 처리되었습니다.',
      },
      data: {
        description: '응답 데이터',
        nullable: true,
      },
      error: {
        type: 'string',
        description: '에러 메시지 (실패 시)',
        nullable: true,
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: '응답 생성 시간',
        example: '2024-01-01T12:00:00.000Z',
      },
    },
    required: ['success', 'message', 'timestamp'],
  },

  SuccessResponse: {
    allOf: [
      { $ref: '#/components/schemas/ApiResponse' },
      {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
        },
      },
    ],
  },

  ErrorResponse: {
    allOf: [
      { $ref: '#/components/schemas/ApiResponse' },
      {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: { type: 'string' },
        },
        required: ['error'],
      },
    ],
  },

  PaginatedApiResponse: {
    allOf: [
      { $ref: '#/components/schemas/ApiResponse' },
      {
        type: 'object',
        properties: {
          pagination: {
            $ref: '#/components/schemas/Pagination',
          },
        },
        required: ['pagination'],
      },
    ],
  },

  // 구체적인 에러 응답 예시들
  BadRequestError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false], example: false },
      message: { type: 'string', example: '잘못된 요청입니다.' },
      error: { type: 'string', example: '유효성 검사에 실패했습니다.' },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T12:00:00.000Z',
      },
    },
  },

  UnauthorizedError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false], example: false },
      message: { type: 'string', example: '인증이 필요합니다.' },
      error: { type: 'string', example: '로그인이 필요합니다.' },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T12:00:00.000Z',
      },
    },
  },

  ForbiddenError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false], example: false },
      message: { type: 'string', example: '접근 권한이 없습니다.' },
      error: { type: 'string', example: '관리자 권한이 필요합니다.' },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T12:00:00.000Z',
      },
    },
  },

  NotFoundError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false], example: false },
      message: {
        type: 'string',
        example: '요청한 리소스를 찾을 수 없습니다.',
      },
      error: { type: 'string', example: '리소스가 존재하지 않습니다.' },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T12:00:00.000Z',
      },
    },
  },

  ConflictError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false], example: false },
      message: { type: 'string', example: '이미 존재하는 리소스입니다.' },
      error: { type: 'string', example: '중복된 데이터입니다.' },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T12:00:00.000Z',
      },
    },
  },

  InternalServerError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false], example: false },
      message: {
        type: 'string',
        example: '서버 내부 오류가 발생했습니다.',
      },
      error: { type: 'string', example: '서버 처리 중 오류가 발생했습니다.' },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T12:00:00.000Z',
      },
    },
  },
};
