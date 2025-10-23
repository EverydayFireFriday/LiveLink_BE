export const chatSchemas = {
  ChatRoom: {
    type: 'object',
    required: ['id', 'name', 'members', 'createdAt'],
    properties: {
      id: {
        type: 'string',
        description: '채팅방 고유 ID',
        example: 'chatroom_1703123456789_abc123',
      },
      name: {
        type: 'string',
        description: '채팅방 이름',
        example: '콘서트 동행 구해요',
      },
      members: {
        type: 'array',
        items: { type: 'string' },
        description: '채팅방 멤버들의 사용자 ID 목록',
        example: ['user_123', 'user_456'],
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: '채팅방 생성 시간',
      },
    },
  },
  Message: {
    type: 'object',
    required: ['id', 'roomId', 'senderId', 'content', 'createdAt'],
    properties: {
      id: {
        type: 'string',
        description: '메시지 고유 ID',
        example: 'message_1703123456789_def456',
      },
      roomId: {
        type: 'string',
        description: '채팅방 ID',
        example: 'chatroom_1703123456789_abc123',
      },
      senderId: {
        type: 'string',
        description: '메시지를 보낸 사용자 ID',
        example: 'user_123',
      },
      content: {
        type: 'string',
        description: '메시지 내용',
        example: '안녕하세요!',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: '메시지 전송 시간',
      },
    },
  },
  CreateChatRoomRequest: {
    type: 'object',
    required: ['name', 'members'],
    properties: {
      name: {
        type: 'string',
        description: '새 채팅방 이름',
        example: '새로운 채팅방',
      },
      members: {
        type: 'array',
        items: { type: 'string' },
        description: '채팅방에 초대할 사용자들의 ID 목록',
        example: ['user_789'],
      },
    },
  },
  SendMessageRequest: {
    type: 'object',
    required: ['content'],
    properties: {
      content: {
        type: 'string',
        description: '전송할 메시지 내용',
        example: '만나서 반갑습니다.',
      },
    },
  },
};
