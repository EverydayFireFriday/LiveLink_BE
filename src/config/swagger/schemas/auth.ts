export const authSchemas = {
  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      password: {
        type: "string",
        minLength: 7,
        example: "password123",
      },
    },
  },

  RegisterRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      username: {
        type: "string",
        minLength: 2,
        maxLength: 20,
        example: "johndoe",
      },
      password: {
        type: "string",
        minLength: 7,
        example: "password123",
      },
      profileImage: {
        type: "string",
        format: "uri",
        example: "https://example.com/avatar.jpg",
      },
    },
  },

  User: {
    type: "object",
    properties: {
      _id: { type: "string" },
      email: { type: "string", format: "email" },
      username: { type: "string" },
      profileImage: { type: "string", format: "uri" },
      isEmailVerified: { type: "boolean" },
      verificationCode: { type: "string" },
      verificationCodeExpires: { type: "string", format: "date-time" },
      status: { type: "string", enum: ["active", "inactive", "suspended", "banned"] },
      role: { type: "string", enum: ["user", "admin", "moderator"] },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  AdminStats: {
    type: "object",
    properties: {
      totalUsers: { type: "number", example: 150 },
      activeUsers: { type: "number", example: 120 },
      totalConcerts: { type: "number", example: 50 },
      totalArticles: { type: "number", example: 300 },
      totalComments: { type: "number", example: 1200 },
    },
  },
  AdminUserView: {
    type: "object",
    properties: {
      _id: { type: "string", example: "60d0fe4f5311236168a109ca" },
      email: { type: "string", format: "email", example: "user@example.com" },
      username: { type: "string", example: "johndoe" },
      role: { type: "string", enum: ["user", "admin"], example: "user" },
      status: { type: "string", enum: ["active", "inactive", "suspended", "banned"], example: "active" },
      createdAt: { type: "string", format: "date-time", example: "2023-01-01T12:00:00Z" },
    },
  },
  AdminUserDetail: {
    allOf: [
      { $ref: '#/components/schemas/User' },
      {
        type: "object",
        properties: {
          loginHistory: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ip: { type: "string", example: "127.0.0.1" },
                timestamp: { type: "string", format: "date-time", example: "2023-01-10T09:00:00Z" },
              }
            }
          }
        }
      }
    ]
  },
};
