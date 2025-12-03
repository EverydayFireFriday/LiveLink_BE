export const setlistSchema = {
  Song: {
    type: 'object',
    required: ['title', 'artist'],
    properties: {
      title: {
        type: 'string',
        description: '곡 제목',
        example: 'Dynamite',
      },
      artist: {
        type: 'string',
        description: '아티스트명',
        example: 'BTS',
      },
    },
  },
  Setlist: {
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        description: 'MongoDB ObjectId',
        example: '507f1f77bcf86cd799439011',
      },
      concertId: {
        type: 'string',
        description: '콘서트 UID',
        example: '20231105-concert-123',
      },
      setList: {
        type: 'array',
        description: '곡 목록',
        items: {
          $ref: '#/components/schemas/Song',
        },
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: '생성 일시',
        example: '2024-11-14T10:00:00.000Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: '수정 일시',
        example: '2024-11-14T10:00:00.000Z',
      },
    },
  },
  SetlistCreateRequest: {
    type: 'object',
    required: ['concertId', 'setList'],
    properties: {
      concertId: {
        type: 'string',
        description: '콘서트 UID',
        example: '20231105-concert-123',
      },
      setList: {
        type: 'array',
        description: '곡 목록',
        minItems: 1,
        items: {
          $ref: '#/components/schemas/Song',
        },
      },
    },
  },
  SetlistResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      message: {
        type: 'string',
        example: '셋리스트 조회 성공',
      },
      data: {
        oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/Setlist' }],
      },
    },
  },
};
