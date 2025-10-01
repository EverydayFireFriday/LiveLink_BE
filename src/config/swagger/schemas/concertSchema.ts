export const concertSchema = {
  Concert: {
    type: 'object',
    properties: {
      _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
      uid: { type: 'string', example: 'concert_1703123456789_iu2024' },
      title: { type: 'string', example: '아이유 콘서트' },
      artist: { type: 'array', items: { type: 'string' }, example: ['아이유'] },
      location: { type: 'array', items: { type: 'string' }, example: ['서울 올림픽공원'] },
      datetime: { type: 'array', items: { type: 'string', format: 'date-time' }, example: ['2024-12-31T19:00:00Z'] },
      price: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tier: { type: 'string', example: 'VIP' },
            amount: { type: 'number', example: 150000 },
          },
        },
      },
      description: { type: 'string', example: '아이유의 연말 콘서트입니다.' },
      category: { type: 'array', items: { type: 'string' }, example: ['K-POP'] },
      ticketLink: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            platform: { type: 'string', example: '멜론티켓' },
            url: { type: 'string', example: 'https://ticket.melon.com/...' },
          },
        },
      },
      ticketOpenDate: { type: 'string', format: 'date-time', example: '2024-11-01T10:00:00Z' },
      posterImage: { type: 'string', example: 'https://example.com/poster.jpg' },
      infoImages: { type: 'array', items: { type: 'string' }, example: ['https://example.com/info1.jpg'] },
      status: { type: 'string', enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], example: 'upcoming' },
      likesCount: { type: 'number', example: 1234 },
      createdAt: { type: 'string', format: 'date-time', example: '2024-10-01T00:00:00Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2024-10-01T00:00:00Z' },
    },
  },
};
