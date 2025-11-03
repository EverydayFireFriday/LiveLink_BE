export const notificationSchemas = {
  UpdateNotificationPreferenceRequest: {
    type: 'object',
    required: ['ticketOpenNotification', 'concertStartNotification'],
    properties: {
      ticketOpenNotification: {
        type: 'array',
        items: {
          type: 'number',
          enum: [10, 30, 60, 1440],
        },
        description:
          '티켓 오픈 알림 시간 (분 단위) - 10분, 30분, 1시간, 하루 전 중 선택',
        example: [10, 30, 60, 1440],
      },
      concertStartNotification: {
        type: 'array',
        items: {
          type: 'number',
          enum: [60, 180, 1440],
        },
        description:
          '공연 시작 알림 시간 (분 단위) - 1시간, 3시간, 하루 전 중 선택',
        example: [60, 180, 1440],
      },
    },
  },

  NotificationHistory: {
    type: 'object',
    required: [
      '_id',
      'userId',
      'concertId',
      'title',
      'message',
      'type',
      'isRead',
      'sentAt',
      'createdAt',
      'expiresAt',
    ],
    properties: {
      _id: {
        type: 'string',
        example: '60d0fe4f5311236168a109ca',
      },
      userId: {
        type: 'string',
        example: '60d0fe4f5311236168a109ca',
        description: '알림을 받은 사용자 ID',
      },
      concertId: {
        type: 'string',
        example: '60d0fe4f5311236168a109cb',
        description: '관련 콘서트 ID',
      },
      title: {
        type: 'string',
        example: 'BTS 콘서트 티켓 오픈 1시간 전!',
        description: '알림 제목',
      },
      message: {
        type: 'string',
        example: '일반 예매 티켓 오픈까지 1시간 남았습니다. 놓치지 마세요!',
        description: '알림 메시지',
      },
      type: {
        type: 'string',
        enum: [
          'ticket_open_10min',
          'ticket_open_30min',
          'ticket_open_1hour',
          'ticket_open_1day',
          'concert_start_1hour',
          'concert_start_3hour',
          'concert_start_1day',
        ],
        example: 'ticket_open_1hour',
        description: '알림 타입',
      },
      isRead: {
        type: 'boolean',
        example: false,
        description: '읽음 여부',
      },
      readAt: {
        type: 'string',
        format: 'date-time',
        example: '2025-01-15T14:30:00Z',
        description: '읽은 시간 (읽은 경우에만 존재)',
      },
      sentAt: {
        type: 'string',
        format: 'date-time',
        example: '2025-01-15T14:00:00Z',
        description: '전송 시간',
      },
      data: {
        type: 'object',
        additionalProperties: {
          type: 'string',
        },
        example: {
          concertId: '60d0fe4f5311236168a109cb',
          concertTitle: 'BTS 콘서트',
          ticketOpenTitle: '일반 예매',
        },
        description: '추가 데이터',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2025-01-15T14:00:00Z',
      },
      expiresAt: {
        type: 'string',
        format: 'date-time',
        example: '2025-04-15T14:00:00Z',
        description: 'TTL 만료 시간 (읽은 알림: 30일, 안읽은 알림: 90일)',
      },
    },
  },

  NotificationHistoryList: {
    type: 'object',
    properties: {
      notifications: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/NotificationHistory',
        },
      },
      pagination: {
        type: 'object',
        properties: {
          total: {
            type: 'number',
            example: 25,
          },
          page: {
            type: 'number',
            example: 1,
          },
          limit: {
            type: 'number',
            example: 20,
          },
          hasMore: {
            type: 'boolean',
            example: true,
          },
        },
      },
    },
  },

  NotificationStats: {
    type: 'object',
    properties: {
      unreadCount: {
        type: 'number',
        example: 5,
        description: '읽지 않은 알림 개수',
      },
      totalCount: {
        type: 'number',
        example: 25,
        description: '전체 알림 개수',
      },
    },
  },
};
