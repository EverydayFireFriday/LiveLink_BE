import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const PORT = process.env.PORT || 3000;

// 동적 서버 URL 생성 함수
const getServerUrl = () => {
  // 배포 환경에서는 환경변수 우선 사용
  if (process.env.PRODUCTION_URL) {
    return process.env.PRODUCTION_URL;
  }

  // 현재 호스트 기반으로 URL 생성 (런타임에서 결정)
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  // 개발 환경 fallback
  return `http://localhost:${PORT}`;
};

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
        url: process.env.PRODUCTION_URL || `http://localhost:${PORT}`,
        description:
          process.env.NODE_ENV === "production"
            ? "Production server"
            : "Development server",
      },
      // 개발 환경에서만 localhost 추가
      ...(process.env.NODE_ENV !== "production"
        ? [
            {
              url: `http://localhost:${PORT}`,
              description: "Local development server",
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

// Swagger UI 옵션 (화려한 컬러와 대소문자 무시 검색)
export const swaggerUiOptions = {
  explorer: true,
  customCss: `
    /* 기본 스타일 초기화 */
    .swagger-ui .topbar { display: none }
    
    /* 헤더 스타일링 - 심플하게 */
    .swagger-ui .info h1 { 
      color: #3b82f6; 
      font-size: 2rem; 
      font-weight: bold;
    }
    .swagger-ui .info .title { 
      color: #1e40af; 
    }
    
    /* 서버 선택 영역 - 기존 스타일 */
    .swagger-ui .scheme-container { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      border: 1px solid #e2e8f0;
    }
    
    /* HTTP 메소드별 컬러 - 기존 스타일 */
    .swagger-ui .opblock.opblock-post { 
      border-color: #10b981; 
      background: rgba(16, 185, 129, 0.1);
    }
    .swagger-ui .opblock.opblock-get { 
      border-color: #3b82f6; 
      background: rgba(59, 130, 246, 0.1);
    }
    .swagger-ui .opblock.opblock-put { 
      border-color: #f59e0b; 
      background: rgba(245, 158, 11, 0.1);
    }
    .swagger-ui .opblock.opblock-delete { 
      border-color: #ef4444; 
      background: rgba(239, 68, 68, 0.1);
    }
    
    /* 태그별 화려한 스타일링 - API 폴더만 화려하게! */
    .swagger-ui .opblock-tag { 
      border-radius: 8px;
      margin: 10px 0;
      transition: all 0.3s ease;
    }
    .swagger-ui .opblock-tag:hover { 
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    /* Health Check - 화려하게! */
    .swagger-ui .opblock-tag[data-tag*="Health"] { 
      background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(132, 250, 176, 0.3);
    }
    
    /* Auth 관련 태그들 - 화려하게! */
    .swagger-ui .opblock-tag[data-tag*="Auth"] { 
      background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
      color: #2d3748;
      box-shadow: 0 4px 15px rgba(168, 237, 234, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Registration"] { 
      background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
      color: #2d3748;
      box-shadow: 0 4px 15px rgba(255, 236, 210, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Password"] { 
      background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
      color: #2d3748;
      box-shadow: 0 4px 15px rgba(255, 154, 158, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Profile"] { 
      background: linear-gradient(135deg, #a8caba 0%, #5d4e75 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(168, 202, 186, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Verification"] { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    
    /* Concert 관련 태그들 - 화려하게! */
    .swagger-ui .opblock-tag[data-tag*="Concerts - Basic"] { 
      background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(116, 185, 255, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Concerts - Like"] { 
      background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(253, 121, 168, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Concerts - Search"] { 
      background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(0, 184, 148, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Concerts - Batch"] { 
      background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(253, 203, 110, 0.3);
    }
    
    /* Admin 태그 - 화려하게! */
    .swagger-ui .opblock-tag[data-tag*="Admin"] { 
      background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);
    }
    
    /* 모든 태그 제목 스타일 */
    .swagger-ui .opblock-tag .opblock-tag-section h3 {
      font-weight: bold;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    /* 검색 필터 스타일링 - 기본 스타일 */
    .swagger-ui .filter-container { 
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #e2e8f0;
    }
    .swagger-ui .filter .operation-filter-input { 
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 10px 15px;
      font-size: 14px;
    }
    
    /* 버튼 스타일링 - 기본 스타일 */
    .swagger-ui .btn { 
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .swagger-ui .btn:hover { 
      transform: translateY(-1px);
    }
    
    /* 응답 코드 스타일링 - 기본 */
    .swagger-ui .responses-inner h4 { 
      color: #374151;
      font-weight: bold;
    }
    
    /* 파라미터 테이블 스타일링 - 기본 */
    .swagger-ui table thead tr td, .swagger-ui table thead tr th { 
      background: #f9fafb;
      color: #374151;
      font-weight: bold;
      border-bottom: 2px solid #e5e7eb;
    }
    
    /* 모델 섹션 스타일링 - 기본 */
    .swagger-ui .model-box { 
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    
    /* 애니메이션 효과 - 약간만 */
    .swagger-ui .opblock { 
      transition: all 0.2s ease;
      border-radius: 6px;
      margin: 5px 0;
    }
    .swagger-ui .opblock:hover { 
      transform: translateX(2px);
    }
    
    /* 스크롤바 스타일링 */
    .swagger-ui ::-webkit-scrollbar { 
      width: 8px;
      height: 8px;
    }
    .swagger-ui ::-webkit-scrollbar-track { 
      background: #f1f1f1;
      border-radius: 4px;
    }
    .swagger-ui ::-webkit-scrollbar-thumb { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
    }
    .swagger-ui ::-webkit-scrollbar-thumb:hover { 
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
    }
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

    // 검색 시 대소문자 구분 안함 (커스텀 필터 함수)
    onComplete: function () {
      try {
        // 더 안전한 방식으로 필터 함수 오버라이드
        setTimeout(() => {
          const win = window as any;

          // Swagger UI가 완전히 로드되었을 때 실행
          if (win.ui && win.ui.getSystem) {
            const system = win.ui.getSystem();
            const layoutSelectors = system.layoutSelectors;

            // 기존 필터 함수 찾기
            if (layoutSelectors && layoutSelectors.taggedOperations) {
              const originalTaggedOps = layoutSelectors.taggedOperations;

              // 새로운 필터 함수로 오버라이드
              system.layoutSelectors.taggedOperations = function (
                state: any,
                tagFilter: string
              ) {
                const taggedOps = originalTaggedOps(state, "");

                if (!tagFilter || tagFilter.trim().length === 0) {
                  return taggedOps;
                }

                const lowerFilter = tagFilter.toLowerCase().trim();

                return taggedOps.filter((taggedOp: any) => {
                  try {
                    // 태그명 확인
                    const tagName = taggedOp.get
                      ? taggedOp.get("tagName")
                      : taggedOp.tagName;
                    if (
                      tagName &&
                      tagName.toLowerCase().includes(lowerFilter)
                    ) {
                      return true;
                    }

                    // 오퍼레이션들 확인
                    const operations = taggedOp.get
                      ? taggedOp.get("operations")
                      : taggedOp.operations;
                    if (operations && operations.some) {
                      return operations.some((op: any) => {
                        try {
                          const operation = op.get
                            ? op.get("operation")
                            : op.operation;
                          const path = op.get ? op.get("path") : op.path;

                          if (
                            path &&
                            path.toLowerCase().includes(lowerFilter)
                          ) {
                            return true;
                          }

                          if (operation) {
                            const method = operation.get
                              ? operation.get("method")
                              : operation.method;
                            const summary = operation.get
                              ? operation.get("summary")
                              : operation.summary;
                            const operationId = operation.get
                              ? operation.get("operationId")
                              : operation.operationId;

                            return (
                              (method &&
                                method.toLowerCase().includes(lowerFilter)) ||
                              (summary &&
                                summary.toLowerCase().includes(lowerFilter)) ||
                              (operationId &&
                                operationId.toLowerCase().includes(lowerFilter))
                            );
                          }

                          return false;
                        } catch (e) {
                          return false;
                        }
                      });
                    }

                    return false;
                  } catch (e) {
                    return true; // 에러 시 보여주기
                  }
                });
              };

              console.log(
                "✅ Swagger 검색 필터가 성공적으로 오버라이드되었습니다."
              );
            }
          }

          // 대안: DOM 기반 검색도 추가
          const searchInput = document.querySelector(
            ".operation-filter-input"
          ) as HTMLInputElement;
          if (searchInput) {
            // 기존 이벤트 리스너 제거
            const newInput = searchInput.cloneNode(true) as HTMLInputElement;
            searchInput.parentNode?.replaceChild(newInput, searchInput);

            // 새로운 검색 로직
            newInput.addEventListener("input", function (e) {
              const searchTerm = (
                e.target as HTMLInputElement
              ).value.toLowerCase();
              const tags = document.querySelectorAll(".opblock-tag");

              tags.forEach((tag) => {
                const tagElement = tag as HTMLElement;
                const tagTitle =
                  tagElement.querySelector("h3")?.textContent?.toLowerCase() ||
                  "";

                if (!searchTerm || tagTitle.includes(searchTerm)) {
                  tagElement.style.display = "block";
                } else {
                  tagElement.style.display = "none";
                }
              });
            });

            console.log("✅ DOM 기반 검색이 추가되었습니다.");
          }
        }, 2000); // 더 긴 지연시간
      } catch (error) {
        console.log("검색 필터 초기화 중 오류:", error);
      }

      // 추가적인 UI 개선
      try {
        const style = document.createElement("style");
        style.textContent = `
          .swagger-ui .filter .operation-filter-input::placeholder {
            color: rgba(0, 0, 0, 0.5);
            font-style: italic;
          }
          .swagger-ui .opblock-summary-description {
            font-weight: 500;
          }
          .swagger-ui .opblock-summary-path {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: rgba(0,0,0,0.05);
            padding: 2px 6px;
            border-radius: 4px;
          }
        `;
        document.head.appendChild(style);

        // 검색 placeholder 텍스트 변경 (타입 안전성 고려)
        setTimeout(() => {
          const filterInput = document.querySelector(
            ".operation-filter-input"
          ) as HTMLInputElement;
          if (filterInput && "placeholder" in filterInput) {
            filterInput.placeholder =
              "🔍 태그 검색... (예: admin, auth, concert)";
          }
        }, 3000); // DOM이 완전히 로드된 후 실행
      } catch (error) {
        console.log("UI 개선 적용 중 오류:", error);
      }
    },
  },
};

// 개발 환경에서 디버깅 정보
if (process.env.NODE_ENV !== "production") {
  try {
    const pathCount = Object.keys((swaggerSpec as any).paths || {}).length;
    console.log(`\n🎵 LiveLink API Swagger Documentation`);
    console.log(`📚 발견된 API 경로: ${pathCount}개`);
    console.log(
      `🌍 서버 URL: ${process.env.PRODUCTION_URL || `http://localhost:${PORT}`}`
    );

    if (pathCount === 0) {
      console.log("⚠️  API가 감지되지 않음 - @swagger 주석 확인 필요");
    } else {
      console.log("✅ Swagger 문서 생성 완료");
      console.log("🎨 화려한 UI 테마 적용");
      console.log("🔍 대소문자 구분 없는 검색 기능 활성화");
      console.log("📖 포함된 API: Auth, Concert, Admin");
    }

    console.log("\n🎯 주요 기능:");
    console.log("  • 동적 서버 URL 설정 (배포환경 자동 감지)");
    console.log("  • 그라디언트 컬러 테마");
    console.log("  • 대소문자 무시 검색");
    console.log("  • 호버 애니메이션 효과");
    console.log("  • 태그별 컬러 구분");
  } catch (error) {
    console.log("⚠️  Swagger 초기화 오류:", error);
  }
}

// swaggerUi도 export
export { swaggerUi };
