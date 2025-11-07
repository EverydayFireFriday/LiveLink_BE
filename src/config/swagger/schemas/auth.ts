export const authSchemas = {
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'user@example.com',
      },
      password: {
        type: 'string',
        minLength: 7,
        example: 'password123',
      },
    },
  },

  RegisterRequest: {
    type: 'object',
    required: [
      'verificationToken',
      'password',
      'name',
      'birthDate',
      'termsConsents',
    ],
    properties: {
      verificationToken: {
        type: 'string',
        example: 'abc123def456',
        description: '이메일 인증 완료 토큰',
      },
      password: {
        type: 'string',
        minLength: 7,
        example: 'password123',
        description: '비밀번호 (최소 7자 이상)',
      },
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 50,
        example: '홍길동',
        description: '실명 (한글 또는 영문)',
      },
      birthDate: {
        type: 'string',
        format: 'date',
        example: '1990-01-01',
        description: '생년월일 (YYYY-MM-DD 형식)',
      },
      username: {
        type: 'string',
        minLength: 2,
        maxLength: 20,
        example: 'johndoe',
        description: '사용자명 (선택사항, 입력하지 않으면 자동 생성)',
      },
      profileImage: {
        type: 'string',
        format: 'uri',
        example: 'https://example.com/avatar.jpg',
        description: '프로필 이미지 URL (선택사항)',
      },
      termsConsents: {
        type: 'array',
        description: '약관 동의 목록 (필수: terms, privacy / 선택: marketing)',
        items: {
          type: 'object',
          required: ['type', 'isAgreed'],
          properties: {
            type: {
              type: 'string',
              enum: ['terms', 'privacy', 'marketing'],
              example: 'terms',
              description: '약관 타입',
            },
            isAgreed: {
              type: 'boolean',
              example: true,
              description: '동의 여부',
            },
            version: {
              type: 'string',
              example: '1.0.0',
              description: '약관 버전 (선택사항, 없으면 현재 버전 사용)',
            },
          },
        },
        example: [
          { type: 'terms', isAgreed: true, version: '1.0.0' },
          { type: 'privacy', isAgreed: true, version: '1.0.0' },
          { type: 'marketing', isAgreed: false, version: '1.0.0' },
        ],
      },
    },
  },

  TermsConsent: {
    type: 'object',
    required: ['type', 'isAgreed', 'version'],
    properties: {
      type: {
        type: 'string',
        enum: ['terms', 'privacy', 'marketing'],
        example: 'terms',
        description: '약관 타입',
      },
      isAgreed: {
        type: 'boolean',
        example: true,
        description: '동의 여부',
      },
      version: {
        type: 'string',
        example: '1.0.0',
        description: '약관 버전',
      },
      agreedAt: {
        type: 'string',
        format: 'date-time',
        example: '2025-01-15T12:00:00Z',
        description: '동의 시각',
      },
    },
  },

  OAuthProvider: {
    type: 'object',
    required: ['provider', 'socialId', 'linkedAt'],
    properties: {
      provider: {
        type: 'string',
        enum: ['google', 'apple'],
        example: 'google',
        description: 'OAuth 프로바이더 타입',
      },
      socialId: {
        type: 'string',
        example: '1234567890',
        description: '소셜 로그인 제공자의 고유 ID',
      },
      email: {
        type: 'string',
        format: 'email',
        example: 'user@gmail.com',
        description: '프로바이더에서 제공한 이메일 (선택사항)',
      },
      linkedAt: {
        type: 'string',
        format: 'date-time',
        example: '2025-01-15T12:00:00Z',
        description: '프로바이더 연동 시각',
      },
    },
  },

  User: {
    type: 'object',
    required: [
      '_id',
      'email',
      'username',
      'status',
      'termsConsents',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      _id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      username: { type: 'string' },
      name: { type: 'string', description: '실명 (선택사항)' },
      birthDate: {
        type: 'string',
        format: 'date',
        description: '생년월일 (선택사항)',
      },
      profileImage: {
        type: 'string',
        format: 'uri',
        description: '프로필 이미지 URL (선택사항)',
      },
      status: {
        type: 'string',
        enum: [
          'active',
          'inactive',
          'suspended',
          'deleted',
          'pending_verification',
        ],
      },
      statusReason: {
        type: 'string',
        description: '상태 변경 사유 (선택사항)',
      },
      termsConsents: {
        type: 'array',
        items: { $ref: '#/components/schemas/TermsConsent' },
        description: '약관 동의 목록',
      },
      oauthProviders: {
        type: 'array',
        items: { $ref: '#/components/schemas/OAuthProvider' },
        description: 'OAuth 프로바이더 목록 (구글, 애플 등)',
      },
      likedConcerts: {
        type: 'array',
        items: { type: 'string' },
        description: '좋아요한 콘서트 ID 목록',
      },
      likedArticles: {
        type: 'array',
        items: { type: 'string' },
        description: '좋아요한 게시글 ID 목록',
      },
      fcmToken: {
        type: 'string',
        description: 'FCM 푸시 알림 토큰',
      },
      fcmTokenUpdatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'FCM 토큰 업데이트 시간',
      },
      notificationPreference: {
        $ref: '#/components/schemas/NotificationPreference',
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  NotificationPreference: {
    type: 'object',
    properties: {
      ticketOpenNotification: {
        type: 'array',
        items: {
          type: 'number',
          enum: [10, 30, 60, 1440],
        },
        description:
          '티켓 오픈 알림 시간 (분 단위) - 10분, 30분, 1시간, 하루 전',
        example: [10, 30, 60, 1440],
      },
      concertStartNotification: {
        type: 'array',
        items: {
          type: 'number',
          enum: [60, 180, 1440],
        },
        description: '공연 시작 알림 시간 (분 단위) - 1시간, 3시간, 하루 전',
        example: [60, 180, 1440],
      },
    },
  },

  TermsConsentResponse: {
    type: 'object',
    properties: {
      terms: {
        type: 'object',
        properties: {
          isAgreed: { type: 'boolean', example: true },
          version: { type: 'string', example: '1.0.0' },
          agreedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-01-15T12:00:00Z',
          },
          needsUpdate: { type: 'boolean', example: false },
          currentVersion: { type: 'string', example: '1.0.0' },
        },
      },
      privacy: {
        type: 'object',
        properties: {
          isAgreed: { type: 'boolean', example: true },
          version: { type: 'string', example: '1.0.0' },
          agreedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-01-15T12:00:00Z',
          },
          needsUpdate: { type: 'boolean', example: false },
          currentVersion: { type: 'string', example: '1.0.0' },
        },
      },
      marketing: {
        type: 'object',
        properties: {
          isConsented: { type: 'boolean', example: false },
          consentedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-01-15T12:00:00Z',
          },
          currentVersion: { type: 'string', example: '1.0.0' },
        },
      },
      requiresAction: {
        type: 'boolean',
        example: false,
        description: '약관 업데이트가 필요한지 여부',
      },
    },
  },

  UpdateTermsConsentRequest: {
    type: 'object',
    required: ['termsConsents'],
    properties: {
      termsConsents: {
        type: 'array',
        description: '업데이트할 약관 동의 목록',
        items: {
          type: 'object',
          required: ['type', 'isAgreed'],
          properties: {
            type: {
              type: 'string',
              enum: ['terms', 'privacy', 'marketing'],
              example: 'terms',
              description: '약관 타입',
            },
            isAgreed: {
              type: 'boolean',
              example: true,
              description: '동의 여부 (terms, privacy는 false 불가)',
            },
            version: {
              type: 'string',
              example: '1.0.0',
              description: '약관 버전 (선택사항, 없으면 현재 버전 사용)',
            },
          },
        },
        example: [
          { type: 'terms', isAgreed: true, version: '1.0.0' },
          { type: 'privacy', isAgreed: true, version: '1.0.0' },
          { type: 'marketing', isAgreed: false, version: '1.0.0' },
        ],
      },
    },
  },

  AdminStats: {
    type: 'object',
    required: [
      'totalUsers',
      'activeUsers',
      'totalConcerts',
      'totalArticles',
      'totalComments',
    ],
    properties: {
      totalUsers: { type: 'number', example: 150 },
      activeUsers: { type: 'number', example: 120 },
      totalConcerts: { type: 'number', example: 50 },
      totalArticles: { type: 'number', example: 300 },
      totalComments: { type: 'number', example: 1200 },
    },
  },
  AdminUserView: {
    type: 'object',
    required: ['_id', 'email', 'username', 'role', 'status', 'createdAt'],
    properties: {
      _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
      email: { type: 'string', format: 'email', example: 'user@example.com' },
      username: { type: 'string', example: 'johndoe' },
      role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'suspended', 'banned'],
        example: 'active',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2023-01-01T12:00:00Z',
      },
    },
  },
  AdminUserDetail: {
    allOf: [
      { $ref: '#/components/schemas/User' },
      {
        type: 'object',
        properties: {
          loginHistory: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ip: { type: 'string', example: '127.0.0.1' },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2023-01-10T09:00:00Z',
                },
              },
            },
          },
        },
      },
    ],
  },
};
