export const notificationSchemas = {
  Notification: {
    type: "object",
    required: ["_id", "userId", "type", "title", "message", "isRead", "createdAt"],
    properties: {
      _id: {
        type: "string",
        description: "알림 고유 ID",
        example: "507f1f77bcf86cd799439016"
      },
      userId: {
        type: "string",
        description: "수신자 ID",
        example: "507f1f77bcf86cd799439012"
      },
      type: {
        type: "string",
        enum: ["like", "comment", "follow", "concert", "chat", "system"],
        description: "알림 타입",
        example: "like"
      },
      title: {
        type: "string",
        description: "알림 제목",
        example: "새로운 좋아요"
      },
      message: {
        type: "string",
        description: "알림 메시지",
        example: "홍길동님이 회원님의 게시글을 좋아합니다."
      },
      data: {
        type: "object",
        description: "추가 데이터",
        properties: {
          targetId: {
            type: "string",
            description: "관련 객체 ID",
            example: "507f1f77bcf86cd799439017"
          },
          targetType: {
            type: "string",
            enum: ["article", "comment", "concert", "user"],
            description: "관련 객체 타입",
            example: "article"
          }
        }
      },
      isRead: {
        type: "boolean",
        description: "읽음 상태",
        example: false
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "알림 생성 시간"
      }
    }
  },

  NotificationSettings: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        description: "설정 고유 ID",
        example: "507f1f77bcf86cd799439018"
      },
      userId: {
        type: "string",
        description: "사용자 ID",
        example: "507f1f77bcf86cd799439012"
      },
      emailNotifications: {
        type: "object",
        properties: {
          likes: { type: "boolean", example: true },
          comments: { type: "boolean", example: true },
          follows: { type: "boolean", example: true },
          concerts: { type: "boolean", example: true },
          chats: { type: "boolean", example: false }
        }
      },
      pushNotifications: {
        type: "object",
        properties: {
          likes: { type: "boolean", example: true },
          comments: { type: "boolean", example: true },
          follows: { type: "boolean", example: true },
          concerts: { type: "boolean", example: true },
          chats: { type: "boolean", example: true }
        }
      }
    }
  }
};