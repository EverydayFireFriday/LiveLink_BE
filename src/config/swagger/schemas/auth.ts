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
};
