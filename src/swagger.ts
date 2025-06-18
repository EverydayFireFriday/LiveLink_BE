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
      // Health Check (가장 위로)
      { name: "Health Check", description: "서버 상태 및 모니터링" },

      // Auth 관련 tags
      { name: "Auth", description: "로그인/로그아웃 관리" },
      { name: "Registration", description: "회원가입 관리" },
      { name: "Password", description: "비밀번호 관리" },
      { name: "Profile", description: "프로필 관리" },
      { name: "Verification", description: "이메일 인증 관리" },

      // Concert 관련 tags (수정됨)
      { name: "Concerts - Basic", description: "콘서트 기본 CRUD 관리" },
      { name: "Concerts - Like", description: "콘서트 좋아요 관리" },
      { name: "Concerts - Search", description: "콘서트 검색 및 필터링" },
      { name: "Concerts - Batch", description: "콘서트 배치 작업" },

      // Admin 관련 (추가)
      { name: "Admin", description: "관리자 전용 기능" },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "app.session.id",
          description: "세션 기반 인증",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Bearer 토큰 (호환성을 위해 추가)",
        },
      },
      schemas: {
        // Auth 관련 스키마
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

        // Admin 관련 스키마
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

        // Concert 관련 스키마 (올바르게 수정됨)
        Concert: {
          type: "object",
          required: ["uid", "title", "location", "datetime"],
          properties: {
            uid: {
              type: "string",
              example: "concert_1703123456789_abc123",
              description: "사용자 지정 ID (timestamp 포함)",
            },
            title: {
              type: "string",
              example: "아이유 콘서트 2024",
              description: "콘서트 제목",
            },
            artist: {
              type: "array",
              items: { type: "string" },
              example: ["아이유", "특별 게스트"],
              description: "아티스트명 배열 (빈 배열 허용)",
            },
            location: {
              type: "array",
              items: {
                type: "object",
                required: ["location"],
                properties: {
                  location: {
                    type: "string",
                    example: "올림픽공원 체조경기장",
                    description: "공연장소",
                  },
                },
              },
              description: "공연 장소 정보 배열",
            },
            datetime: {
              type: "array",
              items: { type: "string", format: "date-time" },
              example: [
                "2024-06-15T19:00:00+09:00",
                "2024-06-16T19:00:00+09:00",
              ],
              description: "공연 날짜 및 시간 배열 (ISO 8601 형식)",
            },
            price: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tier: {
                    type: "string",
                    example: "VIP",
                    description: "티켓 등급",
                  },
                  amount: {
                    type: "number",
                    example: 200000,
                    description: "가격 (원)",
                  },
                },
              },
              description: "티켓 가격 정보 배열",
            },
            description: {
              type: "string",
              example: "아이유의 특별한 콘서트",
              description: "콘서트 설명",
            },
            category: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "pop",
                  "rock",
                  "jazz",
                  "classical",
                  "hiphop",
                  "electronic",
                  "indie",
                  "folk",
                  "r&b",
                  "country",
                  "musical",
                  "opera",
                  "other",
                ],
              },
              example: ["pop", "k-pop"],
              description: "음악 카테고리 배열",
            },
            ticketLink: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  platform: {
                    type: "string",
                    example: "인터파크",
                    description: "티켓 판매 플랫폼명",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                    example: "https://ticket.interpark.com/example",
                    description: "티켓 구매 링크",
                  },
                },
              },
              description: "티켓 구매 링크 배열",
            },
            ticketOpenDate: {
              type: "string",
              format: "date-time",
              example: "2024-05-01T10:00:00+09:00",
              description: "티켓 오픈 날짜/시간",
            },
            posterImage: {
              type: "string",
              format: "uri",
              example:
                "https://your-bucket.s3.amazonaws.com/concerts/poster.jpg",
              description: "S3에 업로드된 포스터 이미지 URL",
            },
            info: {
              type: "array",
              items: { type: "string" },
              example: ["주차 가능", "음식 반입 불가", "사진 촬영 금지"],
              description: "콘서트 추가 정보 배열",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              example: ["발라드", "K-POP", "솔로"],
              description: "콘서트 태그 배열",
            },
            status: {
              type: "string",
              enum: ["upcoming", "ongoing", "completed", "cancelled"],
              example: "upcoming",
              description: "콘서트 상태",
            },
            likesCount: {
              type: "number",
              example: 42,
              description: "좋아요 수",
            },
            isLiked: {
              type: "boolean",
              example: true,
              description: "현재 사용자의 좋아요 여부 (로그인한 경우에만)",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // 배치 작업 스키마
        BatchUploadRequest: {
          type: "object",
          required: ["concerts"],
          properties: {
            concerts: {
              type: "array",
              items: { $ref: "#/components/schemas/Concert" },
              description: "등록할 콘서트들의 배열",
            },
            skipDuplicates: {
              type: "boolean",
              default: false,
              description: "중복 UID 무시 여부",
            },
            batchSize: {
              type: "integer",
              default: 100,
              minimum: 1,
              maximum: 1000,
              description: "배치 처리 크기",
            },
          },
        },

        // 공통 응답 스키마
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

        // 페이지네이션 응답
        PaginationResponse: {
          type: "object",
          properties: {
            currentPage: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 5 },
            totalConcerts: { type: "integer", example: 87 },
            limit: { type: "integer", example: 20 },
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
    
    /* Concert 관련 태그 스타일링 */
    .swagger-ui .opblock-tag[data-tag*="Concerts - Basic"] { background: linear-gradient(90deg, #e0f2fe, #b3e5fc); }
    .swagger-ui .opblock-tag[data-tag*="Concerts - Like"] { background: linear-gradient(90deg, #fce4ec, #f8bbd9); }
    .swagger-ui .opblock-tag[data-tag*="Concerts - Search"] { background: linear-gradient(90deg, #e8f5e8, #c8e6c9); }
    .swagger-ui .opblock-tag[data-tag*="Concerts - Batch"] { background: linear-gradient(90deg, #fff3e0, #ffcc02); }
    
    /* Admin 태그 스타일링 */
    .swagger-ui .opblock-tag[data-tag*="Admin"] { background: linear-gradient(90deg, #f3e8ff, #ddd6fe); }
  `,
  customSiteTitle: "LiveLink API Documentation",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    docExpansion: "none", // 처음에는 모든 섹션 접힌 상태
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    tagsSorter: "alpha", // 태그를 알파벳 순으로 정렬
    operationsSorter: "alpha", // 작업을 알파벳 순으로 정렬
  },
};

// 개발 환경에서 디버깅 정보
if (process.env.NODE_ENV !== "production") {
  try {
    const pathCount = Object.keys((swaggerSpec as any).paths || {}).length;
    console.log(`\n📚 Swagger: ${pathCount}개 API 경로 발견`);
    if (pathCount === 0) {
      console.log("⚠️  API가 감지되지 않음 - @swagger 주석 확인 필요");
    } else {
      console.log("✅ Swagger 문서 생성 완료");
      console.log("📖 Auth APIs, Concert APIs, Admin APIs 포함");
    }
  } catch (error) {
    console.log("⚠️  Swagger 초기화 오류:", error);
  }
}

// swaggerUi도 export
export { swaggerUi };
