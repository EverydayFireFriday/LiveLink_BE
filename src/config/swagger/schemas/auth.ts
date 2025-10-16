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
    required: ['email', 'password', 'name', 'birthDate', 'isTermsAgreed'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'user@example.com',
        description: '사용자 이메일 주소',
      },
      username: {
        type: 'string',
        minLength: 2,
        maxLength: 20,
        example: 'johndoe',
        description: '사용자명 (선택사항, 입력하지 않으면 자동 생성)',
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
      profileImage: {
        type: 'string',
        format: 'uri',
        example: 'https://example.com/avatar.jpg',
        description: '프로필 이미지 URL (선택사항)',
      },
      isTermsAgreed: {
        type: 'boolean',
        example: true,
        description: '서비스 이용약관 동의 여부 (필수)',
      },
    },
  },

  User: {
    type: 'object',
    required: [
      '_id',
      'email',
      'username',
      'name',
      'birthDate',
      'isEmailVerified',
      'status',
      'role',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      _id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      username: { type: 'string' },
      name: { type: 'string', description: '실명' },
      birthDate: { type: 'string', format: 'date', description: '생년월일' },
      profileImage: {
        type: 'string',
        format: 'uri',
        description: '프로필 이미지 URL (선택사항)',
      },
      isEmailVerified: { type: 'boolean' },
      verificationCode: {
        type: 'string',
        description: '이메일 인증 코드 (선택사항)',
      },
      verificationCodeExpires: {
        type: 'string',
        format: 'date-time',
        description: '인증 코드 만료 시간 (선택사항)',
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'suspended', 'banned'],
      },
      role: { type: 'string', enum: ['user', 'admin', 'moderator'] },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
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
