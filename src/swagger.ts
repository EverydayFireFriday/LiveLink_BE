import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const PORT = process.env.PORT || 3000;

// Swagger 설정
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "LiveLink API",
      version: "1.0.0",
      description:
        "Authentication & Concert Management API with Redis Session & MongoDB Native Driver",
      contact: {
        name: "LiveLink API Support",
        email: "support@livelink.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
      ...(process.env.PRODUCTION_URL
        ? [
            {
              url: process.env.PRODUCTION_URL,
              description: "Production server",
            },
          ]
        : []),
    ],
    tags: [
      { name: "Auth", description: "로그인/로그아웃 관리" },
      { name: "Registration", description: "회원가입 관리" },
      { name: "Password", description: "비밀번호 관리" },
      { name: "Profile", description: "프로필 관리" },
      { name: "Verification", description: "이메일 인증 관리" },
      { name: "Concerts", description: "콘서트 관리 API" },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "app.session.id",
          description: "세션 기반 인증",
        },
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            password: { type: "string", minLength: 7, example: "password123" },
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
            password: { type: "string", minLength: 7, example: "password123" },
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
            id: { type: "string" },
            email: { type: "string", format: "email" },
            username: { type: "string" },
            profileImage: { type: "string", format: "uri" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Concert: {
          type: "object",
          required: ["uid", "title", "artist", "location", "datetime"],
          properties: {
            uid: { type: "string", example: "concert_1703123456789_abc123" },
            title: { type: "string", example: "아이유 콘서트 2024" },
            artist: {
              type: "array",
              items: { type: "string" },
              example: ["아이유"],
            },
            location: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  venue: { type: "string" },
                  address: { type: "string" },
                  city: { type: "string" },
                },
              },
            },
            datetime: {
              type: "array",
              items: { type: "string", format: "date-time" },
            },
            status: {
              type: "string",
              enum: ["upcoming", "ongoing", "completed", "cancelled"],
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
            data: { type: "object" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
            error: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  apis: ["./src/controllers/**/*.ts", "./src/routes/**/*.ts"],
};

// Swagger 스펙 생성
export const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Swagger UI 옵션
export const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info h1 { color: #3b82f6; font-size: 2rem; font-weight: bold; }
    .swagger-ui .info .title { color: #1e40af; }
    .swagger-ui .scheme-container { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      border: 1px solid #e2e8f0;
    }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
    .swagger-ui .opblock.opblock-put { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
  `,
  customSiteTitle: "LiveLink API Documentation",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    docExpansion: "none",
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
  },
};

// 개발 환경에서 디버깅 정보
if (process.env.NODE_ENV !== "production") {
  try {
    const pathCount = Object.keys((swaggerSpec as any).paths || {}).length;
    console.log(`\n📚 Swagger: ${pathCount}개 API 경로 발견`);
    if (pathCount === 0) {
      console.log("⚠️  Auth API가 감지되지 않음 - @swagger 주석 확인 필요");
    }
  } catch (error) {
    console.log("⚠️  Swagger 초기화 오류");
  }
}

// swaggerUi도 export
export { swaggerUi };
