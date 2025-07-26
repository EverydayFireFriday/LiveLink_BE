export const chatSchemas = {
  ChatRoom: {
    type: "object",
    required: ["_id", "name", "type", "createdBy", "createdAt"],
    properties: {
      _id: {
        type: "string",
        description: "채팅방 고유 ID",
        example: "507f1f77bcf86cd799439011"
      },
      name: {
        type: "string",
        description: "채팅방 이름",
        example: "BTS 콘서트 후기 채팅"
      },
      description: {
        type: "string",
        description: "채팅방 설명",
        example: "BTS 콘서트 후기를 나누는 채팅방입니다"
      },
      type: {
        type: "string",
        enum: ["private", "public", "group"],
        description: "채팅방 타입",
        example: "public"
      },
      createdBy: {
        type: "string",
        description: "채팅방 생성자 ID",
        example: "507f1f77bcf86cd799439012"
      },
      participants: {
        type: "array",
        items: {
          type: "string"
        },
        description: "참가자 ID 목록",
        example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
      },
      maxParticipants: {
        type: "number",
        description: "최대 참가자 수",
        example: 100
      },
      isActive: {
        type: "boolean",
        description: "채팅방 활성 상태",
        example: true
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "채팅방 생성 시간"
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        description: "채팅방 수정 시간"
      }
    }
  },

  Message: {
    type: "object",
    required: ["_id", "roomId", "senderId", "content", "messageType", "createdAt"],
    properties: {
      _id: {
        type: "string",
        description: "메시지 고유 ID",
        example: "507f1f77bcf86cd799439014"
      },
      roomId: {
        type: "string",
        description: "채팅방 ID",
        example: "507f1f77bcf86cd799439011"
      },
      senderId: {
        type: "string",
        description: "발신자 ID",
        example: "507f1f77bcf86cd799439012"
      },
      senderName: {
        type: "string",
        description: "발신자 이름",
        example: "홍길동"
      },
      content: {
        type: "string",
        description: "메시지 내용",
        example: "안녕하세요! 콘서트 너무 좋았어요!"
      },
      messageType: {
        type: "string",
        enum: ["text", "image", "file", "system"],
        description: "메시지 타입",
        example: "text"
      },
      replyToMessageId: {
        type: "string",
        description: "답장할 메시지 ID",
        example: "507f1f77bcf86cd799439015"
      },
      isEdited: {
        type: "boolean",
        description: "수정 여부",
        example: false
      },
      editedAt: {
        type: "string",
        format: "date-time",
        description: "수정 시간"
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "메시지 생성 시간"
      }
    }
  },

  CreateChatRoomRequest: {
    type: "object",
    required: ["name", "type"],
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description: "채팅방 이름",
        example: "BTS 콘서트 후기 채팅"
      },
      description: {
        type: "string",
        maxLength: 500,
        description: "채팅방 설명",
        example: "BTS 콘서트 후기를 나누는 채팅방입니다"
      },
      type: {
        type: "string",
        enum: ["private", "public", "group"],
        description: "채팅방 타입",
        example: "public"
      },
      maxParticipants: {
        type: "number",
        minimum: 2,
        maximum: 1000,
        description: "최대 참가자 수",
        example: 100
      }
    }
  },

  SendMessageRequest: {
    type: "object",
    required: ["content"],
    properties: {
      content: {
        type: "string",
        minLength: 1,
        maxLength: 1000,
        description: "메시지 내용",
        example: "안녕하세요! 콘서트 너무 좋았어요!"
      },
      messageType: {
        type: "string",
        enum: ["text", "image", "file"],
        description: "메시지 타입",
        example: "text"
      },
      replyToMessageId: {
        type: "string",
        description: "답장할 메시지 ID",
        example: "507f1f77bcf86cd799439015"
      }
    }
  },

  ChatRoomListResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true
      },
      message: {
        type: "string",
        example: "채팅방 목록 조회 성공"
      },
      data: {
        type: "object",
        properties: {
          chatRooms: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ChatRoom"
            }
          },
          pagination: {
            type: "object",
            properties: {
              current: { type: "number", example: 1 },
              total: { type: "number", example: 5 },
              hasNext: { type: "boolean", example: false },
              hasPrev: { type: "boolean", example: false }
            }
          }
        }
      }
    }
  },

  MessageListResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true
      },
      message: {
        type: "string",
        example: "메시지 목록 조회 성공"
      },
      data: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Message"
            }
          },
          pagination: {
            type: "object",
            properties: {
              current: { type: "number", example: 1 },
              total: { type: "number", example: 3 },
              hasNext: { type: "boolean", example: false },
              hasPrev: { type: "boolean", example: false }
            }
          }
        }
      }
    }
  }
};