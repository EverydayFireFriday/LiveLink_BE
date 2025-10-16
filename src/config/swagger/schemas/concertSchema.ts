export const concertSchema = {
  Concert: {
    type: 'object',
    required: [
      '_id',
      'uid',
      'title',
      'artist',
      'location',
      'status',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
      uid: { type: 'string', example: 'concert_1703123456789_iu2024' },
      title: { type: 'string', example: '아이유 콘서트' },
      artist: { type: 'array', items: { type: 'string' }, example: ['아이유'] },
      location: {
        type: 'array',
        items: { type: 'string' },
        example: ['서울 올림픽공원'],
      },
      datetime: {
        type: 'array',
        items: { type: 'string', format: 'date-time' },
        example: ['2024-12-31T19:00:00Z'],
        description: '공연 날짜 (선택사항, 날짜 미정인 경우 제외 가능)',
      },
      price: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tier: { type: 'string', example: 'VIP' },
            amount: { type: 'number', example: 150000 },
          },
        },
        description: '가격 정보 (선택사항)',
      },
      description: {
        type: 'string',
        example: '아이유의 연말 콘서트입니다.',
        description: '공연 설명 (선택사항)',
      },
      category: {
        type: 'array',
        items: { type: 'string' },
        example: ['K-POP'],
        description: '카테고리 (선택사항)',
      },
      ticketLink: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            platform: { type: 'string', example: '멜론티켓' },
            url: { type: 'string', example: 'https://ticket.melon.com/...' },
          },
        },
        description: '티켓 구매 링크 (선택사항)',
      },
      ticketOpenDate: {
        type: 'string',
        format: 'date-time',
        example: '2024-11-01T10:00:00Z',
        description: '티켓 오픈 날짜 (선택사항)',
      },
      posterImage: {
        type: 'string',
        example: 'https://example.com/poster.jpg',
        description: '포스터 이미지 URL (선택사항)',
      },
      infoImages: {
        type: 'array',
        items: { type: 'string' },
        example: ['https://example.com/info1.jpg'],
        description: '상세 정보 이미지들 (선택사항)',
      },
      status: {
        type: 'string',
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        example: 'upcoming',
      },
      likesCount: {
        type: 'number',
        example: 1234,
        description: '좋아요 수 (선택사항)',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-10-01T00:00:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-10-01T00:00:00Z',
      },
    },
  },
};
