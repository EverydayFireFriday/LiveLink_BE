export const adminSchemas = {
  AdminUserView: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        description: "사용자 고유 ID",
        example: "507f1f77bcf86cd799439011",
      },
      email: {
        type: "string",
        format: "email",
        description: "사용자 이메일",
        example: "user@example.com",
      },
      username: {
        type: "string",
        description: "사용자명",
        example: "johndoe",
      },
      status: {
        type: "string",
        enum: ["active", "inactive", "suspended", "banned"],
        description: "사용자 상태",
        example: "active",
      },
      role: {
        type: "string",
        enum: ["user", "admin", "moderator"],
        description: "사용자 역할",
        example: "user",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "계정 생성일",
        example: "2024-01-15T10:30:00Z",
      },
      lastLoginAt: {
        type: "string",
        format: "date-time",
        description: "마지막 로그인 시간",
        example: "2024-06-18T09:15:00Z",
      },
      isEmailVerified: {
        type: "boolean",
        description: "이메일 인증 여부",
        example: true,
      },
    },
    required: ["_id", "email", "username", "status", "createdAt"],
  },

  AdminUserDetail: {
    allOf: [
      { $ref: "#/components/schemas/AdminUserView" },
      {
        type: "object",
        properties: {
          profile: {
            type: "object",
            properties: {
              firstName: {
                type: "string",
                description: "이름",
                example: "John",
              },
              lastName: {
                type: "string",
                description: "성",
                example: "Doe",
              },
              phone: {
                type: "string",
                description: "전화번호",
                example: "+82-10-1234-5678",
              },
              birthDate: {
                type: "string",
                format: "date",
                description: "생년월일",
                example: "1990-05-15",
              },
              address: {
                type: "object",
                properties: {
                  street: { type: "string", example: "123 Main St" },
                  city: { type: "string", example: "Seoul" },
                  country: { type: "string", example: "South Korea" },
                  postalCode: { type: "string", example: "12345" },
                },
              },
            },
          },
          loginHistory: {
            type: "array",
            description: "최근 로그인 기록",
            items: {
              type: "object",
              properties: {
                timestamp: {
                  type: "string",
                  format: "date-time",
                  example: "2024-06-18T09:15:00Z",
                },
                ipAddress: {
                  type: "string",
                  example: "192.168.1.1",
                },
                userAgent: {
                  type: "string",
                  example:
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                location: {
                  type: "string",
                  example: "Seoul, South Korea",
                },
              },
            },
          },
          activityStats: {
            type: "object",
            properties: {
              totalSessions: {
                type: "integer",
                description: "총 세션 수",
                example: 125,
              },
              totalLoginDays: {
                type: "integer",
                description: "총 로그인 일수",
                example: 45,
              },
              averageSessionDuration: {
                type: "integer",
                description: "평균 세션 시간 (분)",
                example: 32,
              },
            },
          },
        },
      },
    ],
  },

  AdminStats: {
    type: "object",
    properties: {
      userStats: {
        type: "object",
        properties: {
          totalUsers: {
            type: "integer",
            description: "전체 사용자 수",
            example: 1250,
          },
          activeUsers: {
            type: "integer",
            description: "활성 사용자 수 (30일 기준)",
            example: 890,
          },
          newUsersToday: {
            type: "integer",
            description: "오늘 신규 가입자",
            example: 15,
          },
          newUsersThisWeek: {
            type: "integer",
            description: "이번 주 신규 가입자",
            example: 78,
          },
          newUsersThisMonth: {
            type: "integer",
            description: "이번 달 신규 가입자",
            example: 245,
          },
          verifiedUsers: {
            type: "integer",
            description: "이메일 인증 완료 사용자",
            example: 1100,
          },
          suspendedUsers: {
            type: "integer",
            description: "정지된 사용자",
            example: 12,
          },
        },
        required: ["totalUsers", "activeUsers", "newUsersToday"],
      },
      sessionStats: {
        type: "object",
        properties: {
          totalSessions: {
            type: "integer",
            description: "전체 세션 수",
            example: 15600,
          },
          activeSessions: {
            type: "integer",
            description: "현재 활성 세션 수",
            example: 234,
          },
          averageSessionDuration: {
            type: "integer",
            description: "평균 세션 시간 (분)",
            example: 28,
          },
          peakConcurrentUsers: {
            type: "integer",
            description: "최대 동시 접속자 수",
            example: 456,
          },
        },
        required: ["totalSessions", "activeSessions"],
      },
      systemStats: {
        type: "object",
        properties: {
          serverUptime: {
            type: "integer",
            description: "서버 가동 시간 (초)",
            example: 2547600,
          },
          databaseSize: {
            type: "string",
            description: "데이터베이스 크기",
            example: "2.5 GB",
          },
          totalApiCalls: {
            type: "integer",
            description: "총 API 호출 수",
            example: 1250000,
          },
          errorRate: {
            type: "number",
            format: "float",
            description: "오류율 (%)",
            example: 0.15,
          },
        },
        required: ["serverUptime", "totalApiCalls"],
      },
      recentActivity: {
        type: "array",
        description: "최근 활동 로그",
        items: {
          type: "object",
          properties: {
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2024-06-18T12:30:00Z",
            },
            action: {
              type: "string",
              description: "활동 유형",
              example: "user_login",
            },
            userId: {
              type: "string",
              description: "사용자 ID",
              example: "507f1f77bcf86cd799439011",
            },
            details: {
              type: "string",
              description: "활동 상세 정보",
              example: "User logged in from Seoul, South Korea",
            },
          },
          required: ["timestamp", "action"],
        },
      },
    },
    required: ["userStats", "sessionStats", "systemStats"],
  },
};
