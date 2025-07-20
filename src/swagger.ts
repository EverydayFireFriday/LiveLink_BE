import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const PORT = process.env.PORT || 3000;

// 동적 서버 URL 생성 함수
const getServerUrl = () => {
  // 배포 환경에서는 환경변수 우선 사용
  if (process.env.NODE_ENV === "production" && process.env.PRODUCTION_URL) {
    return process.env.PRODUCTION_URL;
  }

  // 런타임에서 현재 호스트 기반으로 URL 생성
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
    servers:
      process.env.NODE_ENV === "production"
        ? [
            {
              url: process.env.PRODUCTION_URL || "https://test.newyear.bio",
              description: "Production server",
            },
          ]
        : [
            {
              url: `http://localhost:${PORT}`,
              description: "Development server",
            },
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

      // Concert 관련 tags
      { name: "Concerts - Basic", description: "콘서트 기본 CRUD 관리" },
      { name: "Concerts - Like", description: "콘서트 좋아요 관리" },
      { name: "Concerts - Search", description: "콘서트 검색 및 필터링" },
      { name: "Concerts - Batch", description: "콘서트 배치 작업" },

      // Article 관련 tags
      { name: "Article", description: "게시글 관리" },
      { name: "Article Bookmark", description: "게시글 북마크 관리" },
      { name: "Article Comment", description: "게시글 댓글 관리" },
      { name: "Article Like", description: "게시글 좋아요 관리" },

      // Admin 관련
      { name: "Admin", description: "관리자 전용 기능" },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "app.session.id",
          description: "세션 기반 인증 - 로그인 후 자동으로 설정되는 세션 쿠키",
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

        // Concert 관련 스키마 - 업데이트된 location과 infoImages 필드
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
                type: "string",
              },
              description: "공연 장소 목록 (문자열 배열로 간소화)",
              example: ["올림픽공원 체조경기장", "부산 BEXCO"],
              minItems: 1,
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
              maxLength: 2000,
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
                  "k-pop",
                  "indie",
                  "hiphop",
                  "electronic",
                  "folk",
                  "r&b",
                  "country",
                  "musical",
                  "opera",
                  "ballad",
                  "dance",
                  "trot",
                  "rap",
                  "hip-hop",
                  "edm",
                  "house",
                  "techno",
                  "dubstep",
                  "reggae",
                  "blues",
                  "soul",
                  "funk",
                  "punk",
                  "metal",
                  "alternative",
                  "grunge",
                  "fusion",
                  "world",
                  "latin",
                  "gospel",
                  "new-age",
                  "ambient",
                  "instrumental",
                  "acoustic",
                  "live",
                  "concert",
                  "festival",
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
            infoImages: {
              type: "array",
              items: {
                type: "string",
                format: "uri",
              },
              example: [
                "https://your-bucket.s3.amazonaws.com/concerts/iu2024/info1.jpg",
                "https://your-bucket.s3.amazonaws.com/concerts/iu2024/info2.jpg",
              ],
              description: "추가 정보 이미지 URL 배열 (기존 info에서 변경)",
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
              description:
                "현재 사용자의 좋아요 여부 (세션에서 인증된 사용자인 경우에만)",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // Concert 생성/수정 요청 스키마
        ConcertCreateRequest: {
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
              maxLength: 200,
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
                type: "string",
              },
              description: "공연 장소 목록 (문자열 배열로 간소화)",
              example: ["올림픽공원 체조경기장", "부산 BEXCO"],
              minItems: 1,
            },
            datetime: {
              type: "array",
              items: { type: "string", format: "date-time" },
              example: [
                "2024-06-15T19:00:00+09:00",
                "2024-06-16T19:00:00+09:00",
              ],
              description: "공연 날짜 및 시간 배열",
              minItems: 1,
            },
            price: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tier: { type: "string", example: "VIP" },
                  amount: { type: "number", example: 200000 },
                },
              },
              description: "티켓 가격 정보 배열 (선택사항)",
            },
            description: {
              type: "string",
              example: "아이유의 특별한 콘서트",
              description: "콘서트 설명",
              maxLength: 2000,
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
                  "k-pop",
                  "indie",
                  "hiphop",
                  "electronic",
                  "folk",
                  "r&b",
                  "country",
                  "musical",
                  "opera",
                  "ballad",
                  "dance",
                  "trot",
                  "rap",
                  "hip-hop",
                  "edm",
                  "house",
                  "techno",
                  "dubstep",
                  "reggae",
                  "blues",
                  "soul",
                  "funk",
                  "punk",
                  "metal",
                  "alternative",
                  "grunge",
                  "fusion",
                  "world",
                  "latin",
                  "gospel",
                  "new-age",
                  "ambient",
                  "instrumental",
                  "acoustic",
                  "live",
                  "concert",
                  "festival",
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
                  platform: { type: "string", example: "인터파크" },
                  url: {
                    type: "string",
                    format: "uri",
                    example: "https://ticket.interpark.com/example",
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
              description: "포스터 이미지 URL",
            },
            infoImages: {
              type: "array",
              items: {
                type: "string",
                format: "uri",
              },
              example: [
                "https://your-bucket.s3.amazonaws.com/concerts/iu2024/info1.jpg",
              ],
              description: "추가 정보 이미지 URL 배열 (기존 info에서 변경)",
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
              default: "upcoming",
              description: "콘서트 상태",
            },
          },
        },

        // 배치 작업 스키마
        BatchUploadRequest: {
          type: "object",
          required: ["concerts"],
          properties: {
            concerts: {
              type: "array",
              items: { $ref: "#/components/schemas/ConcertCreateRequest" },
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

        BatchUploadResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "배치 업로드 완료" },
            results: {
              type: "object",
              properties: {
                totalRequested: {
                  type: "integer",
                  example: 100,
                  description: "요청된 총 콘서트 수",
                },
                successCount: {
                  type: "integer",
                  example: 95,
                  description: "성공적으로 업로드된 콘서트 수",
                },
                errorCount: {
                  type: "integer",
                  example: 5,
                  description: "오류 발생한 콘서트 수",
                },
                duplicateCount: {
                  type: "integer",
                  example: 3,
                  description: "중복으로 인해 스킵된 콘서트 수",
                },
                errors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      uid: { type: "string" },
                      error: { type: "string" },
                    },
                  },
                  description: "오류 발생 항목들",
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },

        // 좋아요 관련 스키마
        LikeResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "좋아요 추가/제거됨" },
            isLiked: { type: "boolean", example: true },
            likesCount: { type: "integer", example: 43 },
            timestamp: { type: "string", format: "date-time" },
          },
        },

        // 검색 필터 스키마
        ConcertSearchFilters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "제목 검색",
              example: "아이유",
            },
            artist: {
              type: "string",
              description: "아티스트 검색",
              example: "아이유",
            },
            location: {
              type: "string",
              description: "장소 검색",
              example: "올림픽공원",
            },
            category: {
              type: "array",
              items: { type: "string" },
              description: "카테고리 필터",
              example: ["pop", "k-pop"],
            },
            status: {
              type: "string",
              enum: ["upcoming", "ongoing", "completed", "cancelled"],
              description: "상태 필터",
              example: "upcoming",
            },
            dateFrom: {
              type: "string",
              format: "date",
              description: "시작 날짜 (YYYY-MM-DD)",
              example: "2024-06-01",
            },
            dateTo: {
              type: "string",
              format: "date",
              description: "종료 날짜 (YYYY-MM-DD)",
              example: "2024-12-31",
            },
            priceMin: {
              type: "number",
              description: "최소 가격",
              example: 50000,
            },
            priceMax: {
              type: "number",
              description: "최대 가격",
              example: 300000,
            },
            sortBy: {
              type: "string",
              enum: ["date", "title", "likesCount", "createdAt"],
              default: "date",
              description: "정렬 기준",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              default: "asc",
              description: "정렬 순서",
            },
            page: {
              type: "integer",
              minimum: 1,
              default: 1,
              description: "페이지 번호",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
              description: "페이지당 항목 수",
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

        // 콘서트 목록 응답
        ConcertListResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "콘서트 목록 조회 성공" },
            data: {
              type: "object",
              properties: {
                concerts: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Concert" },
                },
                pagination: { $ref: "#/components/schemas/PaginationResponse" },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },

        // Article 관련 스키마
        Article: {
          type: "object",
          required: ["id", "title", "content_url", "author_id", "is_published", "created_at", "updated_at"],
          properties: {
            id: {
              type: "number",
              description: "아티클 고유 ID",
              example: 1,
            },
            title: {
              type: "string",
              description: "아티클 제목",
              example: "Node.js와 TypeScript로 만드는 RESTful API",
              maxLength: 200,
            },
            content_url: {
              type: "string",
              format: "uri",
              description: "아티클 내용 URL",
              example: "https://example.com/articles/nodejs-typescript-api.md",
            },
            author_id: {
              type: "number",
              description: "작성자 ID",
              example: 101,
            },
            category_id: {
              type: "number",
              description: "카테고리 ID (선택사항)",
              example: 201,
              nullable: true,
            },
            is_published: {
              type: "boolean",
              description: "발행 여부",
              example: true,
            },
            published_at: {
              type: "string",
              format: "date-time",
              description: "발행 일시",
              example: "2024-07-12T10:00:00Z",
              nullable: true,
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "생성 일시",
              example: "2024-07-12T09:00:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "수정 일시",
              example: "2024-07-12T11:00:00Z",
            },
            views: {
              type: "number",
              description: "조회수",
              example: 250,
              minimum: 0,
            },
            likes_count: {
              type: "number",
              description: "좋아요 수",
              example: 42,
              minimum: 0,
            },
          },
        },

        ArticleWithRelations: {
          allOf: [
            { $ref: "#/components/schemas/Article" },
            {
              type: "object",
              properties: {
                author: {
                  type: "object",
                  description: "작성자 정보",
                  properties: {
                    id: { type: "number", example: 101 },
                    username: { type: "string", example: "yanghuibeom" },
                    email: { type: "string", format: "email", example: "yanghuibeom@example.com" },
                  },
                  required: ["id", "username", "email"],
                },
                category: {
                  type: "object",
                  description: "카테고리 정보",
                  nullable: true,
                  properties: {
                    id: { type: "number", example: 201 },
                    name: { type: "string", example: "Backend" },
                  },
                  required: ["id", "name"],
                },
                tags: {
                  type: "array",
                  description: "태그 목록",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "number", example: 301 },
                      name: { type: "string", example: "TypeScript" },
                    },
                    required: ["id", "name"],
                  },
                },
              },
            },
          ],
        },

        CreateArticleRequest: {
          type: "object",
          required: ["title", "content_url"],
          properties: {
            title: {
              type: "string",
              description: "아티클 제목",
              example: "새로운 아티클 제목",
              maxLength: 200,
            },
            content_url: {
              type: "string",
              format: "uri",
              description: "아티클 내용 URL",
              example: "https://example.com/articles/new-article.md",
            },
            category_name: {
              type: "string",
              description: "카테고리 이름 (선택사항)",
              example: "Backend",
            },
            tag_names: {
              type: "array",
              description: "태그 이름 목록 (선택사항)",
              items: {
                type: "string",
                example: "TypeScript",
              },
            },
            is_published: {
              type: "boolean",
              description: "발행 여부 (기본값: false)",
              example: false,
              default: false,
            },
            published_at: {
              type: "string",
              format: "date-time",
              description: "발행 일시 (is_published가 true일 때 설정)",
              example: "2024-07-12T10:00:00Z",
            },
          },
        },

        UpdateArticleRequest: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "수정된 아티클 제목",
              example: "수정된 아티클 제목",
              maxLength: 200,
            },
            content_url: {
              type: "string",
              format: "uri",
              description: "수정된 아티클 내용 URL",
              example: "https://example.com/articles/updated-article.md",
            },
            category_name: {
              type: "string",
              description: "수정된 카테고리 이름",
              example: "Frontend",
            },
            tag_names: {
              type: "array",
              description: "수정된 태그 이름 목록",
              items: {
                type: "string",
                example: "JavaScript",
              },
            },
            is_published: {
              type: "boolean",
              description: "발행 여부 수정",
              example: true,
            },
            published_at: {
              type: "string",
              format: "date-time",
              description: "발행 일시 수정",
              example: "2024-07-13T12:00:00Z",
            },
          },
        },

        // Category 관련 스키마
        Category: {
          type: "object",
          required: ["id", "name", "created_at"],
          properties: {
            id: {
              type: "number",
              description: "카테고리 고유 ID",
              example: 201,
            },
            name: {
              type: "string",
              description: "카테고리 이름",
              example: "Backend",
              maxLength: 50,
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "생성 일시",
              example: "2024-07-12T09:00:00Z",
            },
          },
        },

        CreateCategoryRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              description: "카테고리 이름",
              example: "웹 개발",
              maxLength: 50,
            },
          },
        },

        // Tag 관련 스키마
        Tag: {
          type: "object",
          required: ["id", "name", "created_at"],
          properties: {
            id: {
              type: "number",
              description: "태그 고유 ID",
              example: 301,
            },
            name: {
              type: "string",
              description: "태그 이름",
              example: "TypeScript",
              maxLength: 30,
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "생성 일시",
              example: "2024-07-12T09:00:00Z",
            },
          },
        },

        CreateTagRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              description: "태그 이름",
              example: "Node.js",
              maxLength: 30,
            },
          },
        },

        // Comment 관련 스키마
        Comment: {
          type: "object",
          required: ["id", "article_id", "author_id", "content", "created_at", "updated_at"],
          properties: {
            id: {
              type: "number",
              description: "댓글 고유 ID",
              example: 1,
            },
            article_id: {
              type: "number",
              description: "아티클 ID",
              example: 1,
            },
            author_id: {
              type: "number",
              description: "작성자 ID",
              example: 101,
            },
            content: {
              type: "string",
              description: "댓글 내용",
              example: "유익한 정보 감사합니다!",
              maxLength: 1000,
            },
            parent_id: {
              type: "number",
              description: "부모 댓글 ID (대댓글인 경우)",
              example: 1,
              nullable: true,
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "생성 일시",
              example: "2024-07-12T10:30:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "수정 일시",
              example: "2024-07-12T10:30:00Z",
            },
            likes_count: {
              type: "number",
              description: "좋아요 수",
              example: 10,
              minimum: 0,
            },
          },
        },

        CommentWithReplies: {
          allOf: [
            { $ref: "#/components/schemas/Comment" },
            {
              type: "object",
              properties: {
                replies: {
                  type: "array",
                  description: "대댓글 목록",
                  items: { $ref: "#/components/schemas/Comment" },
                },
              },
            },
          ],
        },

        CreateCommentRequest: {
          type: "object",
          required: ["content"],
          properties: {
            content: {
              type: "string",
              description: "댓글 내용",
              example: "정말 유용한 글이네요! 감사합니다.",
              maxLength: 1000,
            },
            parent_id: {
              type: "number",
              description: "부모 댓글 ID (대댓글인 경우)",
              example: 1,
            },
          },
        },

        UpdateCommentRequest: {
          type: "object",
          required: ["content"],
          properties: {
            content: {
              type: "string",
              description: "댓글 내용",
              example: "수정된 댓글 내용입니다.",
              maxLength: 1000,
            },
          },
        },

        // Like/Bookmark 관련 스키마
        ArticleLikeResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "아티클 좋아요 추가/제거됨" },
            isLiked: { type: "boolean", example: true },
            likesCount: { type: "integer", example: 26 },
            timestamp: { type: "string", format: "date-time" },
          },
        },

        ArticleBookmarkResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "아티클 북마크 추가/제거됨" },
            isBookmarked: { type: "boolean", example: true },
            timestamp: { type: "string", format: "date-time" },
          },
        },

        // Article 목록 응답
        ArticleListResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "아티클 목록 조회 성공" },
            data: {
              type: "object",
              properties: {
                articles: {
                  type: "array",
                  items: { $ref: "#/components/schemas/ArticleWithRelations" },
                },
                pagination: { $ref: "#/components/schemas/PaginationResponse" },
              },
            },
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

// Swagger UI 옵션 (화려한 컬러와 대소문자 무시 검색 + 다크 모드)
export const swaggerUiOptions = {
  explorer: true,
  customCss: `
    /* 다크 모드 토글 버튼 */
    .dark-mode-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      cursor: pointer;
      font-size: 18px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }

    .dark-mode-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
    }

    /* 기본 스타일 초기화 */
    .swagger-ui .topbar { display: none }
    
    /* 헤더 스타일링 */
    .swagger-ui .info h1 { 
      color: #3b82f6; 
      font-size: 2rem; 
      font-weight: bold;
    }
    .swagger-ui .info .title { 
      color: #1e40af; 
    }
    
    /* 서버 선택 영역 */
    .swagger-ui .scheme-container { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      border: 1px solid #e2e8f0;
    }
    
    /* HTTP 메소드별 컬러 */
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
    
    /* 태그별 화려한 스타일링 */
    .swagger-ui .opblock-tag { 
      border-radius: 8px;
      margin: 10px 0;
      transition: all 0.3s ease;
    }
    .swagger-ui .opblock-tag:hover { 
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    /* Health Check */
    .swagger-ui .opblock-tag[data-tag*="Health"] { 
      background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(132, 250, 176, 0.3);
    }
    
    /* Auth 관련 태그들 */
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
    
    /* Concert 관련 태그들 */
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
    
    /* Article 관련 태그들 */
    .swagger-ui .opblock-tag[data-tag*="Article"] { 
      background: linear-gradient(135deg, #81C784 0%, #4CAF50 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(129, 199, 132, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Article Bookmark"] { 
      background: linear-gradient(135deg, #4FC3F7 0%, #03A9F4 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(79, 195, 247, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Article Comment"] { 
      background: linear-gradient(135deg, #FFB74D 0%, #FF9800 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(255, 183, 77, 0.3);
    }
    .swagger-ui .opblock-tag[data-tag*="Article Like"] { 
      background: linear-gradient(135deg, #F06292 0%, #E91E63 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(240, 98, 146, 0.3);
    }
    
    /* Admin 태그 */
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
    
    /* 검색 필터 스타일링 */
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
    
    /* 버튼 스타일링 */
    .swagger-ui .btn { 
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .swagger-ui .btn:hover { 
      transform: translateY(-1px);
    }
    
    /* 응답 코드 스타일링 */
    .swagger-ui .responses-inner h4 { 
      color: #374151;
      font-weight: bold;
    }
    
    /* 파라미터 테이블 스타일링 */
    .swagger-ui table thead tr td, .swagger-ui table thead tr th { 
      background: #f9fafb;
      color: #374151;
      font-weight: bold;
      border-bottom: 2px solid #e5e7eb;
    }
    
    /* 모델 섹션 스타일링 */
    .swagger-ui .model-box { 
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    
    /* 애니메이션 효과 */
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

    /* 다크 모드 스타일 - 더 자연스러운 배경색 */
    [data-theme="dark"] body,
    [data-theme="dark"] .swagger-ui,
    [data-theme="dark"] .swagger-ui .wrapper {
      background-color: #1a202c !important;
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui .info h1 {
      color: #63b3ed !important;
    }

    [data-theme="dark"] .swagger-ui .info .title {
      color: #90cdf4 !important;
    }

    [data-theme="dark"] .swagger-ui .info .description {
      color: #cbd5e0 !important;
    }

    /* 다크 모드에서 버전 뱃지 스타일 */
    [data-theme="dark"] .swagger-ui .info .version {
      background: #4a5568 !important;
      color: #e2e8f0 !important;
      border: 1px solid #718096 !important;
    }

    [data-theme="dark"] .swagger-ui .info .version-stamp {
      background: #4a5568 !important;
      color: #e2e8f0 !important;
      border: 1px solid #718096 !important;
    }

    [data-theme="dark"] .swagger-ui .info .version-stamp pre {
      background: transparent !important;
      color: #e2e8f0 !important;
    }

    /* OpenAPI 버전 뱃지 */
    [data-theme="dark"] .swagger-ui .info .version-stamp .version-stamp-oas {
      background: #38a169 !important;
      color: white !important;
      border: 1px solid #2f855a !important;
    }

    [data-theme="dark"] .swagger-ui .scheme-container {
      background: #1a202c !important;
      border-color: #2d3748 !important;
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui .filter-container {
      background: #1a202c !important;
      border-color: #2d3748 !important;
    }

    [data-theme="dark"] .swagger-ui .filter .operation-filter-input {
      background: #2d3748 !important;
      border-color: #4a5568 !important;
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui .filter .operation-filter-input::placeholder {
      color: #a0aec0 !important;
    }

    [data-theme="dark"] .swagger-ui .opblock {
      background: #2d3748 !important;
      border-color: #4a5568 !important;
    }

    [data-theme="dark"] .swagger-ui .opblock .opblock-summary {
      background: #4a5568 !important;
      color: #e2e8f0 !important;
      border-color: #718096 !important;
    }

    /* 다크 모드에서 API 경로 가시성 개선 */
    [data-theme="dark"] .swagger-ui .opblock-summary-path {
      color: #f7fafc !important;
      font-weight: 600 !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-summary-description {
      color: #cbd5e0 !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-summary-method {
      color: white !important;
      font-weight: bold !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-body {
      background: #2d3748 !important;
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui .parameters,
    [data-theme="dark"] .swagger-ui .responses-wrapper,
    [data-theme="dark"] .swagger-ui .model-box-control {
      background: #2d3748 !important;
      color: #e2e8f0 !important;
      border-color: #4a5568 !important;
    }

    [data-theme="dark"] .swagger-ui table,
    [data-theme="dark"] .swagger-ui table thead tr td,
    [data-theme="dark"] .swagger-ui table thead tr th {
      background: #4a5568 !important;
      color: #e2e8f0 !important;
      border-color: #718096 !important;
    }

    [data-theme="dark"] .swagger-ui table tbody tr td {
      background: #2d3748 !important;
      color: #e2e8f0 !important;
      border-color: #4a5568 !important;
    }

    [data-theme="dark"] .swagger-ui .model-box {
      background: #2d3748 !important;
      border-color: #4a5568 !important;
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui input[type="text"],
    [data-theme="dark"] .swagger-ui input[type="email"],
    [data-theme="dark"] .swagger-ui input[type="password"],
    [data-theme="dark"] .swagger-ui textarea,
    [data-theme="dark"] .swagger-ui select {
      background: #4a5568 !important;
      color: #e2e8f0 !important;
      border-color: #718096 !important;
    }

    [data-theme="dark"] .swagger-ui .highlight-code,
    [data-theme="dark"] .swagger-ui .microlight,
    [data-theme="dark"] .swagger-ui pre,
    [data-theme="dark"] .swagger-ui code {
      background: #4a5568 !important;
      color: #e2e8f0 !important;
      border: 1px solid #718096 !important;
    }

    [data-theme="dark"] .swagger-ui .responses-inner h4,
    [data-theme="dark"] .swagger-ui .response-col_status {
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui .btn {
      background: #4299e1 !important;
      color: white !important;
      border-color: #3182ce !important;
    }

    [data-theme="dark"] .swagger-ui .btn:hover {
      background: #3182ce !important;
    }

    [data-theme="dark"] .swagger-ui .btn.execute {
      background: #48bb78 !important;
      border-color: #38a169 !important;
    }

    [data-theme="dark"] .swagger-ui .btn.execute:hover {
      background: #38a169 !important;
    }

    [data-theme="dark"] .swagger-ui ::-webkit-scrollbar-track {
      background: #2d3748 !important;
    }

    [data-theme="dark"] .swagger-ui ::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #4a5568 0%, #718096 100%) !important;
    }

    /* 다크 모드 인증 모달 스타일 */
    [data-theme="dark"] .swagger-ui .dialog-ux .modal-ux {
      background: #1a202c !important;
      border: 1px solid #4a5568 !important;
    }

    [data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-header {
      background: #2d3748 !important;
      color: #e2e8f0 !important;
      border-bottom: 1px solid #4a5568 !important;
    }

    [data-theme="dark"] .swagger-ui .dialog-ux .modal-ux-content {
      background: #1a202c !important;
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container {
      background: #1a202c !important;
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container h4,
    [data-theme="dark"] .swagger-ui .auth-container h5,
    [data-theme="dark"] .swagger-ui .auth-container label {
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container .auth-btn-wrapper {
      background: #2d3748 !important;
      border: 1px solid #4a5568 !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container input[type="text"],
    [data-theme="dark"] .swagger-ui .auth-container input[type="password"] {
      background: #4a5568 !important;
      color: #e2e8f0 !important;
      border: 1px solid #718096 !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container textarea {
      background: #4a5568 !important;
      color: #e2e8f0 !important;
      border: 1px solid #718096 !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container .auth-btn-wrapper input {
      background: #4a5568 !important;
      color: #e2e8f0 !important;
      border: 1px solid #718096 !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container .auth-btn-wrapper button {
      background: #4299e1 !important;
      color: white !important;
      border: 1px solid #3182ce !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container .auth-btn-wrapper button:hover {
      background: #3182ce !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container .close-modal {
      color: #e2e8f0 !important;
    }

    [data-theme="dark"] .swagger-ui .auth-container .close-modal:hover {
      color: #f7fafc !important;
    }

    /* 모달 오버레이 */
    [data-theme="dark"] .swagger-ui .dialog-ux .backdrop-ux {
      background: rgba(0, 0, 0, 0.7) !important;
    }

    /* 다크 모드에서 그라디언트 태그들이 더 잘 보이도록 조정 */
    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Health"] { 
      box-shadow: 0 4px 15px rgba(132, 250, 176, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Auth"] { 
      box-shadow: 0 4px 15px rgba(168, 237, 234, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Registration"] { 
      box-shadow: 0 4px 15px rgba(255, 236, 210, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Password"] { 
      box-shadow: 0 4px 15px rgba(255, 154, 158, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Profile"] { 
      box-shadow: 0 4px 15px rgba(168, 202, 186, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Verification"] { 
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Concerts - Basic"] { 
      box-shadow: 0 4px 15px rgba(116, 185, 255, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Concerts - Like"] { 
      box-shadow: 0 4px 15px rgba(253, 121, 168, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Concerts - Search"] { 
      box-shadow: 0 4px 15px rgba(0, 184, 148, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Concerts - Batch"] { 
      box-shadow: 0 4px 15px rgba(253, 203, 110, 0.4) !important;
    }

    [data-theme="dark"] .swagger-ui .opblock-tag[data-tag*="Admin"] { 
      box-shadow: 0 4px 15px rgba(108, 92, 231, 0.4) !important;
    }
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
    tagsSorter: "alpha",
    operationsSorter: "alpha",

    onComplete: function () {
      try {
        // 다크 모드 토글 버튼 생성
        const toggleButton = document.createElement("button");
        toggleButton.className = "dark-mode-toggle";
        toggleButton.innerHTML = "🌙";
        toggleButton.title = "다크 모드 토글";

        // 현재 테마 상태 확인
        const currentTheme = localStorage.getItem("swagger-theme") || "light";
        if (currentTheme === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
          toggleButton.innerHTML = "☀️";
        }

        // 토글 기능
        toggleButton.addEventListener("click", () => {
          const isDark =
            document.documentElement.getAttribute("data-theme") === "dark";

          if (isDark) {
            document.documentElement.removeAttribute("data-theme");
            toggleButton.innerHTML = "🌙";
            localStorage.setItem("swagger-theme", "light");
          } else {
            document.documentElement.setAttribute("data-theme", "dark");
            toggleButton.innerHTML = "☀️";
            localStorage.setItem("swagger-theme", "dark");
          }
        });

        // 버튼을 DOM에 추가
        document.body.appendChild(toggleButton);

        // 검색 필터 기능
        setTimeout(() => {
          const win = window as any;

          if (win.ui && win.ui.getSystem) {
            const system = win.ui.getSystem();
            const layoutSelectors = system.layoutSelectors;

            if (layoutSelectors && layoutSelectors.taggedOperations) {
              const originalTaggedOps = layoutSelectors.taggedOperations;

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
                    // 태그명 검색
                    const tagName = taggedOp.get
                      ? taggedOp.get("tagName")
                      : taggedOp.tagName;
                    if (
                      tagName &&
                      tagName.toLowerCase().includes(lowerFilter)
                    ) {
                      return true;
                    }

                    // 태그 설명 검색
                    const tagObj = taggedOp.get
                      ? taggedOp.get("tag")
                      : taggedOp.tag;
                    if (tagObj) {
                      const description = tagObj.get
                        ? tagObj.get("description")
                        : tagObj.description;
                      if (
                        description &&
                        description.toLowerCase().includes(lowerFilter)
                      ) {
                        return true;
                      }
                    }

                    // 오퍼레이션들 내부 검색
                    const operations = taggedOp.get
                      ? taggedOp.get("operations")
                      : taggedOp.operations;
                    if (operations && operations.some) {
                      return operations.some((op: any) => {
                        try {
                          // API 경로 검색
                          const path = op.get ? op.get("path") : op.path;
                          if (
                            path &&
                            path.toLowerCase().includes(lowerFilter)
                          ) {
                            return true;
                          }

                          const operation = op.get
                            ? op.get("operation")
                            : op.operation;
                          if (operation) {
                            // HTTP 메소드 검색
                            const method = operation.get
                              ? operation.get("method")
                              : operation.method;
                            if (
                              method &&
                              method.toLowerCase().includes(lowerFilter)
                            ) {
                              return true;
                            }

                            // API 요약 검색
                            const summary = operation.get
                              ? operation.get("summary")
                              : operation.summary;
                            if (
                              summary &&
                              summary.toLowerCase().includes(lowerFilter)
                            ) {
                              return true;
                            }

                            // API 설명 검색
                            const description = operation.get
                              ? operation.get("description")
                              : operation.description;
                            if (
                              description &&
                              description.toLowerCase().includes(lowerFilter)
                            ) {
                              return true;
                            }

                            // operationId 검색
                            const operationId = operation.get
                              ? operation.get("operationId")
                              : operation.operationId;
                            if (
                              operationId &&
                              operationId.toLowerCase().includes(lowerFilter)
                            ) {
                              return true;
                            }

                            // 태그 검색 (operation 레벨)
                            const tags = operation.get
                              ? operation.get("tags")
                              : operation.tags;
                            if (tags && Array.isArray(tags)) {
                              if (
                                tags.some((tag) =>
                                  tag.toLowerCase().includes(lowerFilter)
                                )
                              ) {
                                return true;
                              }
                            }
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

          // DOM 기반 검색 백업 (더 강력한 검색)
          const searchInput = document.querySelector(
            ".operation-filter-input"
          ) as HTMLInputElement;
          if (searchInput) {
            // 기존 이벤트 리스너 제거
            const newInput = searchInput.cloneNode(true) as HTMLInputElement;
            searchInput.parentNode?.replaceChild(newInput, searchInput);

            // 새로운 검색 로직
            newInput.addEventListener("input", function (e) {
              const searchTerm = (e.target as HTMLInputElement).value
                .toLowerCase()
                .trim();

              if (!searchTerm) {
                // 검색어가 없으면 모든 태그 표시
                const tags = document.querySelectorAll(".opblock-tag");
                tags.forEach((tag) => {
                  (tag as HTMLElement).style.display = "block";
                });
                return;
              }

              const tags = document.querySelectorAll(".opblock-tag");
              tags.forEach((tag) => {
                const tagElement = tag as HTMLElement;
                let shouldShow = false;

                // 태그 제목 검색
                const tagTitle =
                  tagElement.querySelector("h3")?.textContent?.toLowerCase() ||
                  "";
                if (tagTitle.includes(searchTerm)) {
                  shouldShow = true;
                }

                // 개별 API 검색
                const operations = tagElement.querySelectorAll(".opblock");
                let hasMatchingOperation = false;

                operations.forEach((operation) => {
                  const opElement = operation as HTMLElement;

                  // API 경로 검색
                  const pathElement = opElement.querySelector(
                    ".opblock-summary-path"
                  );
                  const path = pathElement?.textContent?.toLowerCase() || "";

                  // API 요약 검색
                  const summaryElement = opElement.querySelector(
                    ".opblock-summary-description"
                  );
                  const summary =
                    summaryElement?.textContent?.toLowerCase() || "";

                  // HTTP 메소드 검색
                  const methodElement = opElement.querySelector(
                    ".opblock-summary-method"
                  );
                  const method =
                    methodElement?.textContent?.toLowerCase() || "";

                  if (
                    path.includes(searchTerm) ||
                    summary.includes(searchTerm) ||
                    method.includes(searchTerm)
                  ) {
                    hasMatchingOperation = true;
                    opElement.style.display = "block";
                  } else {
                    opElement.style.display = "none";
                  }
                });

                if (shouldShow || hasMatchingOperation) {
                  tagElement.style.display = "block";
                } else {
                  tagElement.style.display = "none";
                }
              });
            });

            console.log("✅ DOM 기반 검색이 추가되었습니다.");
          }
        }, 2000);
      } catch (error) {
        console.log("검색 필터 초기화 중 오류:", error);
      }

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

        setTimeout(() => {
          const filterInput = document.querySelector(
            ".operation-filter-input"
          ) as HTMLInputElement;
          if (filterInput && "placeholder" in filterInput) {
            filterInput.placeholder =
              "🔍 검색... (태그, API 경로, 메소드, 설명)";
          }
        }, 3000);
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
      console.log("화려한 UI 테마 적용");
      console.log("다크 모드 지원");
      console.log("대소문자 구분 없는 검색 기능 활성화");
      console.log("📖 포함된 API: Auth, Concert, Admin");
      console.log("인증 방식: Session-based (Redis)");
    }

    console.log("\n주요 기능:");
    console.log("  • 세션 기반 인증 (Redis)");
    console.log("  • 동적 서버 URL 설정 (배포환경 자동 감지)");
    console.log("  • 그라디언트 컬러 테마");
    console.log("  • 대소문자 무시 검색");
    console.log("  • 호버 애니메이션 효과");
    console.log("  • 태그별 컬러 구분");
    console.log("  • 반응형 디자인");
    console.log("  • localStorage 테마 저장");

    console.log("\n다크 모드 기능:");
    console.log("  • 수동 토글 버튼 (우상단 🌙/☀️)");
    console.log("  • 모든 컴포넌트 다크 모드 대응");
    console.log("  • 부드러운 전환 애니메이션");
    console.log("  • 테마 설정 자동 저장");
  } catch (error) {
    console.log("⚠️  Swagger 초기화 오류:", error);
  }
}

// swaggerUi도 export
export { swaggerUi };
