/**
 * API 에러 코드 상수
 *
 * 코드 체계:
 * - AUTH_XXX: 인증/인가 관련 (1000번대)
 * - ARTICLE_XXX: 게시글 관련 (2000번대)
 * - COMMENT_XXX: 댓글 관련 (3000번대)
 * - CHAT_XXX: 채팅 관련 (4000번대)
 * - CONCERT_XXX: 공연 관련 (5000번대)
 * - NOTIF_XXX: 알림 관련 (6000번대)
 * - USER_XXX: 사용자 관련 (7000번대)
 * - DB_XXX: 데이터베이스 관련 (9000번대)
 * - VAL_XXX: 유효성 검증 관련
 * - SYS_XXX: 시스템 관련
 */
export const ErrorCodes = {
  // ==================== Auth 관련 (1000번대) ====================
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_UNAUTHORIZED: 'AUTH_003',
  AUTH_FORBIDDEN: 'AUTH_004',
  AUTH_EMAIL_ALREADY_EXISTS: 'AUTH_005',
  AUTH_INVALID_VERIFICATION_CODE: 'AUTH_006',
  AUTH_VERIFICATION_CODE_EXPIRED: 'AUTH_007',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_008',
  AUTH_INVALID_TOKEN: 'AUTH_009',
  AUTH_SESSION_NOT_FOUND: 'AUTH_010',
  AUTH_ALREADY_LOGGED_IN: 'AUTH_011',
  AUTH_INVALID_PASSWORD: 'AUTH_012',
  AUTH_PASSWORD_MISMATCH: 'AUTH_013',
  AUTH_TERMS_NOT_AGREED: 'AUTH_014',
  AUTH_INVALID_EMAIL: 'AUTH_015',
  AUTH_USER_NOT_FOUND: 'AUTH_016',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_017',
  AUTH_ACCOUNT_DELETED: 'AUTH_018',
  AUTH_OAUTH_FAILED: 'AUTH_019',
  AUTH_INVALID_ID_TOKEN: 'AUTH_020',
  AUTH_USERNAME_TAKEN: 'AUTH_021',
  AUTH_ALREADY_REGISTERED: 'AUTH_022',
  AUTH_NOT_REGISTRATION_PENDING: 'AUTH_023',
  AUTH_SESSION_CONFLICT: 'AUTH_024',
  AUTH_VERIFICATION_NOT_FOUND: 'AUTH_025',

  // ==================== Article 관련 (2000번대) ====================
  ARTICLE_NOT_FOUND: 'ARTICLE_001',
  ARTICLE_ALREADY_LIKED: 'ARTICLE_002',
  ARTICLE_NOT_LIKED: 'ARTICLE_003',
  ARTICLE_UPDATE_FAILED: 'ARTICLE_004',
  ARTICLE_DELETE_FAILED: 'ARTICLE_005',
  ARTICLE_CREATE_FAILED: 'ARTICLE_006',
  ARTICLE_NO_PERMISSION: 'ARTICLE_007',
  ARTICLE_INVALID_CATEGORY: 'ARTICLE_008',
  ARTICLE_BOOKMARK_ALREADY_EXISTS: 'ARTICLE_009',
  ARTICLE_BOOKMARK_NOT_FOUND: 'ARTICLE_010',
  ARTICLE_FOLDER_NOT_FOUND: 'ARTICLE_011',
  ARTICLE_FOLDER_ALREADY_EXISTS: 'ARTICLE_012',
  ARTICLE_FOLDER_CREATE_FAILED: 'ARTICLE_013',
  ARTICLE_FOLDER_UPDATE_FAILED: 'ARTICLE_014',
  ARTICLE_FOLDER_DELETE_FAILED: 'ARTICLE_015',

  // ==================== Comment 관련 (3000번대) ====================
  COMMENT_NOT_FOUND: 'COMMENT_001',
  COMMENT_NO_PERMISSION: 'COMMENT_002',
  COMMENT_PARENT_NOT_FOUND: 'COMMENT_003',
  COMMENT_CREATE_FAILED: 'COMMENT_004',
  COMMENT_UPDATE_FAILED: 'COMMENT_005',
  COMMENT_DELETE_FAILED: 'COMMENT_006',
  COMMENT_ALREADY_DELETED: 'COMMENT_007',
  COMMENT_MAX_DEPTH_EXCEEDED: 'COMMENT_008',

  // ==================== Chat 관련 (4000번대) ====================
  CHAT_ROOM_NOT_FOUND: 'CHAT_001',
  CHAT_NO_PERMISSION: 'CHAT_002',
  CHAT_MESSAGE_NOT_FOUND: 'CHAT_003',
  CHAT_ALREADY_JOINED: 'CHAT_004',
  CHAT_NOT_JOINED: 'CHAT_005',
  CHAT_ROOM_FULL: 'CHAT_006',
  CHAT_SEND_FAILED: 'CHAT_007',
  CHAT_INVALID_MESSAGE_TYPE: 'CHAT_008',

  // ==================== Concert 관련 (5000번대) ====================
  CONCERT_NOT_FOUND: 'CONCERT_001',
  CONCERT_ALREADY_LIKED: 'CONCERT_002',
  CONCERT_NOT_LIKED: 'CONCERT_003',
  CONCERT_CREATE_FAILED: 'CONCERT_004',
  CONCERT_UPDATE_FAILED: 'CONCERT_005',
  CONCERT_DELETE_FAILED: 'CONCERT_006',
  CONCERT_INVALID_DATE: 'CONCERT_007',
  CONCERT_SOLD_OUT: 'CONCERT_008',
  CONCERT_NOT_ON_SALE: 'CONCERT_009',
  CONCERT_SETLIST_NOT_FOUND: 'CONCERT_010',

  // ==================== Concert Review 관련 (5500번대) ====================
  REVIEW_NOT_FOUND: 'REVIEW_001',
  REVIEW_CREATE_FAILED: 'REVIEW_002',
  REVIEW_UPDATE_FAILED: 'REVIEW_003',
  REVIEW_DELETE_FAILED: 'REVIEW_004',
  REVIEW_NO_PERMISSION: 'REVIEW_005',
  ALREADY_LIKED: 'REVIEW_006',
  LIKE_NOT_FOUND: 'REVIEW_007',
  FORBIDDEN: 'REVIEW_008',

  // ==================== Notification 관련 (6000번대) ====================
  NOTIF_NOT_FOUND: 'NOTIF_001',
  NOTIF_ALREADY_READ: 'NOTIF_002',
  NOTIF_SEND_FAILED: 'NOTIF_003',
  NOTIF_FCM_TOKEN_INVALID: 'NOTIF_004',
  NOTIF_SUBSCRIPTION_NOT_FOUND: 'NOTIF_005',
  NOTIF_ALREADY_SUBSCRIBED: 'NOTIF_006',
  NOTIF_HISTORY_NOT_FOUND: 'NOTIF_007',

  // ==================== User 관련 (7000번대) ====================
  USER_NOT_FOUND: 'USER_001',
  USER_ALREADY_EXISTS: 'USER_002',
  USER_UPDATE_FAILED: 'USER_003',
  USER_DELETE_FAILED: 'USER_004',
  USER_INVALID_STATUS: 'USER_005',
  USER_PROFILE_UPDATE_FAILED: 'USER_006',
  USER_SESSION_NOT_FOUND: 'USER_007',

  // ==================== Support 관련 (7500번대) ====================
  SUPPORT_INQUIRY_NOT_FOUND: 'SUPPORT_001',
  SUPPORT_ALREADY_ANSWERED: 'SUPPORT_002',
  SUPPORT_CREATE_FAILED: 'SUPPORT_003',
  SUPPORT_UPDATE_FAILED: 'SUPPORT_004',
  SUPPORT_DELETE_FAILED: 'SUPPORT_005',
  SUPPORT_INVALID_CATEGORY: 'SUPPORT_006',
  SUPPORT_INVALID_PRIORITY: 'SUPPORT_007',

  // ==================== File 관련 (8000번대) ====================
  FILE_UPLOAD_FAILED: 'FILE_001',
  FILE_NOT_FOUND: 'FILE_002',
  FILE_DELETE_FAILED: 'FILE_003',
  FILE_TOO_LARGE: 'FILE_004',
  FILE_INVALID_TYPE: 'FILE_005',

  // ==================== Database 관련 (9000번대) ====================
  DB_CONNECTION_ERROR: 'DB_001',
  DB_DUPLICATE_KEY: 'DB_002',
  DB_QUERY_FAILED: 'DB_003',
  DB_TRANSACTION_FAILED: 'DB_004',
  DB_VALIDATION_ERROR: 'DB_005',

  // ==================== Validation 관련 ====================
  VAL_INVALID_INPUT: 'VAL_001',
  VAL_MISSING_FIELD: 'VAL_002',
  VAL_INVALID_FORMAT: 'VAL_003',
  VAL_OUT_OF_RANGE: 'VAL_004',
  VAL_INVALID_ENUM: 'VAL_005',
  VAL_INVALID_DATE: 'VAL_006',

  // ==================== System 관련 ====================
  SYS_INTERNAL_ERROR: 'SYS_001',
  SYS_SERVICE_UNAVAILABLE: 'SYS_002',
  SYS_RATE_LIMIT_EXCEEDED: 'SYS_003',
  SYS_MAINTENANCE: 'SYS_004',
  SYS_TIMEOUT: 'SYS_005',
  INTERNAL_SERVER_ERROR: 'SYS_001', // Alias for SYS_INTERNAL_ERROR
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * 에러 코드에 대한 기본 메시지 매핑
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Auth
  AUTH_001: '잘못된 인증 정보입니다.',
  AUTH_002: '토큰이 만료되었습니다.',
  AUTH_003: '인증이 필요합니다.',
  AUTH_004: '접근 권한이 없습니다.',
  AUTH_005: '이미 사용 중인 이메일입니다.',
  AUTH_006: '유효하지 않은 인증 코드입니다.',
  AUTH_007: '인증 코드가 만료되었습니다.',
  AUTH_008: '이메일 인증이 필요합니다.',
  AUTH_009: '유효하지 않은 토큰입니다.',
  AUTH_010: '세션을 찾을 수 없습니다.',
  AUTH_011: '이미 로그인되어 있습니다.',
  AUTH_012: '잘못된 비밀번호입니다.',
  AUTH_013: '비밀번호가 일치하지 않습니다.',
  AUTH_014: '약관 동의가 필요합니다.',
  AUTH_015: '유효하지 않은 이메일 형식입니다.',
  AUTH_016: '사용자를 찾을 수 없습니다.',
  AUTH_017: '정지된 계정입니다.',
  AUTH_018: '삭제된 계정입니다.',
  AUTH_019: 'OAuth 인증에 실패했습니다.',
  AUTH_020: '유효하지 않은 ID 토큰입니다.',
  AUTH_021: '이미 사용 중인 별명입니다.',
  AUTH_022: '이미 가입이 완료된 사용자입니다.',
  AUTH_023: '가입 대기 상태가 아닙니다.',
  AUTH_024: '이미 다른 기기에서 로그인되어 있습니다.',
  AUTH_025: '인증 프로세스를 찾을 수 없습니다.',

  // Article
  ARTICLE_001: '게시글을 찾을 수 없습니다.',
  ARTICLE_002: '이미 좋아요한 게시글입니다.',
  ARTICLE_003: '좋아요하지 않은 게시글입니다.',
  ARTICLE_004: '게시글 수정에 실패했습니다.',
  ARTICLE_005: '게시글 삭제에 실패했습니다.',
  ARTICLE_006: '게시글 생성에 실패했습니다.',
  ARTICLE_007: '게시글 수정 권한이 없습니다.',
  ARTICLE_008: '유효하지 않은 카테고리입니다.',
  ARTICLE_009: '이미 북마크한 게시글입니다.',
  ARTICLE_010: '북마크를 찾을 수 없습니다.',
  ARTICLE_011: '폴더를 찾을 수 없습니다.',
  ARTICLE_012: '이미 존재하는 폴더명입니다.',
  ARTICLE_013: '폴더 생성에 실패했습니다.',
  ARTICLE_014: '폴더 수정에 실패했습니다.',
  ARTICLE_015: '폴더 삭제에 실패했습니다.',

  // Comment
  COMMENT_001: '댓글을 찾을 수 없습니다.',
  COMMENT_002: '댓글 수정 권한이 없습니다.',
  COMMENT_003: '상위 댓글을 찾을 수 없습니다.',
  COMMENT_004: '댓글 작성에 실패했습니다.',
  COMMENT_005: '댓글 수정에 실패했습니다.',
  COMMENT_006: '댓글 삭제에 실패했습니다.',
  COMMENT_007: '이미 삭제된 댓글입니다.',
  COMMENT_008: '댓글 깊이 제한을 초과했습니다.',

  // Chat
  CHAT_001: '채팅방을 찾을 수 없습니다.',
  CHAT_002: '채팅방 접근 권한이 없습니다.',
  CHAT_003: '메시지를 찾을 수 없습니다.',
  CHAT_004: '이미 참여 중인 채팅방입니다.',
  CHAT_005: '참여하지 않은 채팅방입니다.',
  CHAT_006: '채팅방이 가득 찼습니다.',
  CHAT_007: '메시지 전송에 실패했습니다.',
  CHAT_008: '유효하지 않은 메시지 타입입니다.',

  // Concert
  CONCERT_001: '공연을 찾을 수 없습니다.',
  CONCERT_002: '이미 좋아요한 공연입니다.',
  CONCERT_003: '좋아요하지 않은 공연입니다.',
  CONCERT_004: '공연 생성에 실패했습니다.',
  CONCERT_005: '공연 수정에 실패했습니다.',
  CONCERT_006: '공연 삭제에 실패했습니다.',
  CONCERT_007: '유효하지 않은 날짜입니다.',
  CONCERT_008: '매진된 공연입니다.',
  CONCERT_009: '판매 중이지 않은 공연입니다.',
  CONCERT_010: '생성된 셋리스트가 없습니다.',

  // Concert Review
  REVIEW_001: '리뷰를 찾을 수 없습니다.',
  REVIEW_002: '리뷰 생성에 실패했습니다.',
  REVIEW_003: '리뷰 수정에 실패했습니다.',
  REVIEW_004: '리뷰 삭제에 실패했습니다.',
  REVIEW_005: '리뷰 수정 권한이 없습니다.',
  REVIEW_006: '이미 좋아요한 리뷰입니다.',
  REVIEW_007: '좋아요를 찾을 수 없습니다.',
  REVIEW_008: '접근 권한이 없습니다.',

  // Notification
  NOTIF_001: '알림을 찾을 수 없습니다.',
  NOTIF_002: '이미 읽은 알림입니다.',
  NOTIF_003: '알림 전송에 실패했습니다.',
  NOTIF_004: '유효하지 않은 FCM 토큰입니다.',
  NOTIF_005: '구독 정보를 찾을 수 없습니다.',
  NOTIF_006: '이미 구독 중입니다.',
  NOTIF_007: '알림 기록을 찾을 수 없습니다.',

  // User
  USER_001: '사용자를 찾을 수 없습니다.',
  USER_002: '이미 존재하는 사용자입니다.',
  USER_003: '사용자 정보 수정에 실패했습니다.',
  USER_004: '사용자 삭제에 실패했습니다.',
  USER_005: '유효하지 않은 사용자 상태입니다.',
  USER_006: '프로필 업데이트에 실패했습니다.',
  USER_007: '세션을 찾을 수 없습니다.',

  // Support
  SUPPORT_001: '문의를 찾을 수 없습니다.',
  SUPPORT_002: '이미 답변된 문의입니다.',
  SUPPORT_003: '문의 생성에 실패했습니다.',
  SUPPORT_004: '문의 수정에 실패했습니다.',
  SUPPORT_005: '문의 삭제에 실패했습니다.',
  SUPPORT_006: '유효하지 않은 문의 카테고리입니다.',
  SUPPORT_007: '유효하지 않은 우선순위입니다.',

  // File
  FILE_001: '파일 업로드에 실패했습니다.',
  FILE_002: '파일을 찾을 수 없습니다.',
  FILE_003: '파일 삭제에 실패했습니다.',
  FILE_004: '파일 크기가 너무 큽니다.',
  FILE_005: '지원하지 않는 파일 형식입니다.',

  // Database
  DB_001: '데이터베이스 연결에 실패했습니다.',
  DB_002: '중복된 데이터입니다.',
  DB_003: '데이터베이스 쿼리 실패했습니다.',
  DB_004: '트랜잭션 처리에 실패했습니다.',
  DB_005: '데이터 유효성 검증에 실패했습니다.',

  // Validation
  VAL_001: '유효하지 않은 입력값입니다.',
  VAL_002: '필수 필드가 누락되었습니다.',
  VAL_003: '잘못된 형식입니다.',
  VAL_004: '값이 허용 범위를 벗어났습니다.',
  VAL_005: '유효하지 않은 값입니다.',
  VAL_006: '유효하지 않은 날짜입니다.',

  // System
  SYS_001: '서버 내부 오류가 발생했습니다.',
  SYS_002: '서비스를 일시적으로 사용할 수 없습니다.',
  SYS_003: '요청 한도를 초과했습니다.',
  SYS_004: '서비스 점검 중입니다.',
  SYS_005: '요청 시간이 초과되었습니다.',
};
