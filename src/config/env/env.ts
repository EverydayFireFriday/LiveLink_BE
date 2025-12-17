import { z } from 'zod';
import logger from '../../utils/logger/logger';

// 🔧 환경변수 스키마 정의
const envSchema = z.object({
  // 🗄️ 데이터베이스 관련
  MONGO_URI: z.string().min(1, 'MongoDB URI가 필요합니다'),
  REDIS_URL: z.string().min(1, 'Redis URL이 필요합니다'),

  // 🔐 보안 관련
  SESSION_SECRET: z
    .string()
    .min(32, '세션 시크릿은 최소 32자 이상이어야 합니다'),
  // 플랫폼별 세션 만료 시간 (밀리초)
  // APP 플랫폼 (X-Platform: app) → 30일
  // WEB 플랫폼 (X-Platform: web) → 1일
  SESSION_MAX_AGE_APP: z
    .string()
    .regex(/^\d+$/, '숫자만 입력 가능합니다')
    .optional()
    .default('2592000000'), // 30일 (30 * 24 * 60 * 60 * 1000)
  SESSION_MAX_AGE_WEB: z
    .string()
    .regex(/^\d+$/, '숫자만 입력 가능합니다')
    .optional()
    .default('86400000'), // 1일 (24 * 60 * 60 * 1000)
  BRUTE_FORCE_MAX_ATTEMPTS: z
    .string()
    .regex(/^\d+$/, '숫자만 입력 가능합니다')
    .optional()
    .default('15'),
  BRUTE_FORCE_BLOCK_DURATION: z
    .string()
    .regex(/^\d+$/, '숫자만 입력 가능합니다')
    .optional()
    .default('900'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional().default('lax'),

  // 🌐 서버 환경
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .regex(/^\d+$/, '포트는 숫자여야 합니다')
    .optional()
    .default('3000'),
  FRONTEND_URL: z
    .string()
    .url('올바른 URL 형식이 아닙니다')
    .optional()
    .default('http://localhost:3000'),

  // 🔐 CORS 보안 설정
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((val) => val.split(',').map((origin) => origin.trim()))
    .refine(
      (origins) =>
        origins.every((origin) => z.string().url().safeParse(origin).success),
      '모든 허용 도메인이 올바른 URL 형식이어야 합니다',
    ),

  // 📧 이메일 관련
  EMAIL_USER: z.string().email('올바른 이메일 형식이 아닙니다'),
  EMAIL_PASS: z.string().min(1, '이메일 비밀번호가 필요합니다').optional(),

  // 👑 관리자 관련
  ADMIN_EMAILS: z
    .string()
    .min(1, '최소 하나의 관리자 이메일이 필요합니다')
    .transform((val) => val.split(',').map((email) => email.trim()))
    .refine(
      (emails) =>
        emails.every((email) => z.string().email().safeParse(email).success),
      '모든 관리자 이메일이 올바른 형식이어야 합니다',
    ),

  // 🗃️ 기타 옵션
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'verbose', 'debug'])
    .optional()
    .default('info'),

  // 🕐 스케줄러 설정
  CONCERT_STATUS_CHECK_INTERVAL: z
    .string()
    .regex(/^\d+$/, '숫자만 입력 가능합니다')
    .optional()
    .default('1800000'), // 30분 (밀리초)

  // 🔔 알림 설정
  IS_TEST_SERVER: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  // 🍎 Apple OAuth 설정
  APPLE_APP_BUNDLE_ID: z
    .string()
    .min(1, 'Apple App Bundle ID가 필요합니다')
    .optional(),
});

// 🔍 환경변수 검증 및 파싱 (즉시 실행)
const validateEnv = () => {
  logger.info('\n🔧 환경변수 검증 중...');

  try {
    const parsed = envSchema.parse(process.env);

    // 🚨 프로덕션 환경 추가 검증
    if (parsed.NODE_ENV === 'production') {
      const productionErrors: string[] = [];

      // PORT 검증

      // FRONTEND_URL 검증
      if (parsed.FRONTEND_URL.includes('localhost')) {
        productionErrors.push(
          'FRONTEND_URL: 프로덕션 환경에서는 localhost를 사용할 수 없습니다',
        );
      }

      // CORS_ALLOWED_ORIGINS 검증
      const hasLocalhostOrigin = parsed.CORS_ALLOWED_ORIGINS.some((origin) =>
        origin.includes('localhost'),
      );
      if (hasLocalhostOrigin) {
        productionErrors.push(
          'CORS_ALLOWED_ORIGINS: 프로덕션 환경에서는 localhost를 사용할 수 없습니다',
        );
      }

      // COOKIE_DOMAIN 검증
      if (!parsed.COOKIE_DOMAIN) {
        productionErrors.push(
          'COOKIE_DOMAIN: 프로덕션 환경에서는 쿠키 도메인 설정이 필수입니다',
        );
      }

      // SameSite 검증
      if (parsed.COOKIE_SAMESITE === 'none') {
        logger.warn(
          '⚠️ COOKIE_SAMESITE가 "none"으로 설정되었습니다. HTTPS와 Secure 플래그가 필수입니다.',
        );
      }

      if (productionErrors.length > 0) {
        logger.error('❌ 프로덕션 환경 검증 실패:');
        productionErrors.forEach((error) => {
          logger.error(`   ${error}`);
        });
        logger.error(
          '\n🚨 프로덕션 환경에서는 모든 환경변수를 명시적으로 설정해야 합니다.',
        );
        process.exit(1);
      }
    }

    // ✅ 성공 로그
    logger.info(`📧 EMAIL_USER: ✅ ${parsed.EMAIL_USER}`);
    logger.info(`🔄 REDIS_URL: ✅ 설정됨`);
    logger.info(`🗄️  MONGO_URI: ✅ 설정됨`);
    logger.info(`👑 관리자 계정 개수: ${parsed.ADMIN_EMAILS.length}`);
    logger.info(`🌍 환경: ${parsed.NODE_ENV}`);
    logger.info(`🚪 포트: ${parsed.PORT}`);
    logger.info(`📊 로그 레벨: ${parsed.LOG_LEVEL}`);
    logger.info('\n🔐 플랫폼별 세션 만료시간:');
    logger.info(
      `  📱 APP (X-Platform: app): ${Math.floor(parseInt(parsed.SESSION_MAX_AGE_APP) / 1000 / 60 / 60 / 24)}일`,
    );
    logger.info(
      `  💻 WEB (X-Platform: web): ${Math.floor(parseInt(parsed.SESSION_MAX_AGE_WEB) / 1000 / 60 / 60)}시간`,
    );
    logger.info(`  🔢 세션 정책: 플랫폼별 1개씩 유지 (총 최대 2개)`);
    logger.info(
      `🛡️ 브루트포스 보호 - 최대 시도 횟수: ${parsed.BRUTE_FORCE_MAX_ATTEMPTS}`,
    );
    logger.info(
      `🛡️ 브루트포스 보호 - 차단 기간: ${Math.floor(parseInt(parsed.BRUTE_FORCE_BLOCK_DURATION) / 60)}분`,
    );
    logger.info(`🍪 쿠키 도메인: ${parsed.COOKIE_DOMAIN || '설정되지 않음'}`);
    logger.info(`🍪 SameSite 정책: ${parsed.COOKIE_SAMESITE}`);
    logger.info(
      `🔐 CORS 허용 도메인 개수: ${parsed.CORS_ALLOWED_ORIGINS.length}`,
    );
    logger.info('');

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ 환경변수 검증 실패:');
      error.issues.forEach((issue: z.ZodIssue) => {
        logger.error(`   ${issue.path.join('.')}: ${issue.message}`);
      });
      logger.error('\n📋 필수 환경변수 목록:');
      logger.error(
        '   MONGO_URI - MongoDB 연결 문자열 (예: mongodb://localhost:27017/livelink)',
      );
      logger.error(
        '   REDIS_URL - Redis 연결 문자열 (예: redis://localhost:6379)',
      );
      logger.error('   SESSION_SECRET - 세션 암호화 키 (32자 이상)');
      logger.error('   EMAIL_USER - 이메일 발송용 계정');
      logger.error('   ADMIN_EMAILS - 관리자 이메일 목록 (쉼표로 구분)');
      logger.error('');
    } else {
      logger.error('❌ 환경변수 검증 중 예상치 못한 오류:', error);
    }

    // 🚨 검증 실패 시 즉시 프로세스 종료
    logger.error('🚨 환경변수 검증 실패로 서버를 시작할 수 없습니다.');
    process.exit(1);
  }
};

// 🔧 환경변수 검증 및 내보내기 (모듈 로드 시 즉시 실행)
export const env = validateEnv();

// 🎯 타입 정의 (TypeScript 지원)
export type Environment = z.infer<typeof envSchema>;

// 🔍 특정 환경변수 검증 헬퍼 함수들
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';
export const isTest = () => env.NODE_ENV === 'test';

// 📧 관리자 이메일 확인 헬퍼
export const isAdminEmail = (email: string): boolean => {
  return env.ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === email.trim().toLowerCase(),
  );
};

// 📱 플랫폼별 세션 만료 시간 가져오기
export const getSessionMaxAge = (platform: string): number => {
  switch (platform.toLowerCase()) {
    case 'app':
      return parseInt(env.SESSION_MAX_AGE_APP); // 30일
    case 'web':
    default:
      return parseInt(env.SESSION_MAX_AGE_WEB); // 1일
  }
};
