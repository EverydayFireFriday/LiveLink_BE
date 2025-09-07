import { z } from "zod";
import logger from "../utils/logger";

// 🔧 환경변수 스키마 정의
const envSchema = z.object({
  // 🗄️ 데이터베이스 관련
  MONGO_URI: z.string().min(1, "MongoDB URI가 필요합니다"),
  REDIS_URL: z.string().min(1, "Redis URL이 필요합니다"),

  // 🔐 보안 관련
  SESSION_SECRET: z
    .string()
    .min(32, "세션 시크릿은 최소 32자 이상이어야 합니다"),
  SESSION_MAX_AGE: z
    .string()
    .regex(/^\d+$/, "숫자만 입력 가능합니다")
    .optional()
    .default("86400000"),
  BRUTE_FORCE_MAX_ATTEMPTS: z
    .string()
    .regex(/^\d+$/, "숫자만 입력 가능합니다")
    .optional()
    .default("10"),
  BRUTE_FORCE_BLOCK_DURATION: z
    .string()
    .regex(/^\d+$/, "숫자만 입력 가능합니다")
    .optional()
    .default("1800"),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).optional().default("lax"),

  // 🌐 서버 환경
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .regex(/^\d+$/, "포트는 숫자여야 합니다")
    .optional()
    .default("3000"),
  FRONTEND_URL: z
    .string()
    .url("올바른 URL 형식이 아닙니다")
    .optional()
    .default("http://localhost:3000"),

  // 📧 이메일 관련
  EMAIL_USER: z.string().email("올바른 이메일 형식이 아닙니다"),
  EMAIL_PASS: z.string().min(1, "이메일 비밀번호가 필요합니다").optional(),

  // 👑 관리자 관련
  ADMIN_EMAILS: z
    .string()
    .min(1, "최소 하나의 관리자 이메일이 필요합니다")
    .transform((val) => val.split(",").map((email) => email.trim()))
    .refine(
      (emails) =>
        emails.every((email) => z.string().email().safeParse(email).success),
      "모든 관리자 이메일이 올바른 형식이어야 합니다"
    ),

  // 🔧 개발/테스트 관련
  SKIP_AUTH: z
    .string()
    .optional()
    .transform((val) => val === "true")
    .default(false),

  // 🗃️ 기타 옵션
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "verbose", "debug"])
    .optional()
    .default("info"),
});

// 🔍 환경변수 검증 및 파싱 (즉시 실행)
const validateEnv = () => {
  logger.info("\n🔧 환경변수 검증 중...");

  try {
    const parsed = envSchema.parse(process.env);

    // ✅ 성공 로그
    logger.info(`📧 EMAIL_USER: ✅ ${parsed.EMAIL_USER}`);
    logger.info(`🔄 REDIS_URL: ✅ 설정됨`);
    logger.info(`🗄️  MONGO_URI: ✅ 설정됨`);
    logger.info(`👑 관리자 계정 개수: ${parsed.ADMIN_EMAILS.length}`);
    logger.info(`🌍 환경: ${parsed.NODE_ENV}`);
    logger.info(`🚪 포트: ${parsed.PORT}`);
    logger.info(`📊 로그 레벨: ${parsed.LOG_LEVEL}`);
    logger.info(
      `🔐 세션 만료시간: ${Math.floor(parseInt(parsed.SESSION_MAX_AGE) / 1000 / 60)}분`
    );
    logger.info(`🛡️ 브루트포스 보호 - 최대 시도 횟수: ${parsed.BRUTE_FORCE_MAX_ATTEMPTS}`);
    logger.info(`🛡️ 브루트포스 보호 - 차단 기간: ${Math.floor(parseInt(parsed.BRUTE_FORCE_BLOCK_DURATION) / 60)}분`);
    logger.info(`🍪 쿠키 도메인: ${parsed.COOKIE_DOMAIN || '설정되지 않음'}`);
    logger.info(`🍪 SameSite 정책: ${parsed.COOKIE_SAMESITE}`);

    // 🔧 조건부 인증 설정 로그
    logger.info("\n🔧 조건부 인증 미들웨어 설정:");
    logger.info(`  - NODE_ENV: ${parsed.NODE_ENV}`);
    logger.info(`  - SKIP_AUTH: ${parsed.SKIP_AUTH}`);
    logger.info(
      `  - 개발환경 인증 스킵: ${parsed.NODE_ENV === "development" || parsed.SKIP_AUTH ? "✅ 활성화됨" : "❌ 비활성화됨"}`
    );
    logger.info(
      "  - 세션 구조: email, userId, username, profileImage?, loginTime"
    );
    logger.info("");

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("❌ 환경변수 검증 실패:");
      error.issues.forEach((issue: z.ZodIssue) => {
        logger.error(`   ${issue.path.join(".")}: ${issue.message}`);
      });
      logger.error("\n📋 필수 환경변수 목록:");
      logger.error(
        "   MONGO_URI - MongoDB 연결 문자열 (예: mongodb://localhost:27017/livelink)"
      );
      logger.error(
        "   REDIS_URL - Redis 연결 문자열 (예: redis://localhost:6379)"
      );
      logger.error("   SESSION_SECRET - 세션 암호화 키 (32자 이상)");
      logger.error("   EMAIL_USER - 이메일 발송용 계정");
      logger.error("   ADMIN_EMAILS - 관리자 이메일 목록 (쉼표로 구분)");
      logger.error("");
    } else {
      logger.error("❌ 환경변수 검증 중 예상치 못한 오류:", error);
    }

    // 🚨 검증 실패 시 즉시 프로세스 종료
    logger.error("🚨 환경변수 검증 실패로 서버를 시작할 수 없습니다.");
    process.exit(1);
  }
};

// 🔧 환경변수 검증 및 내보내기 (모듈 로드 시 즉시 실행)
export const env = validateEnv();

// 🎯 타입 정의 (TypeScript 지원)
export type Environment = z.infer<typeof envSchema>;

// 🔍 특정 환경변수 검증 헬퍼 함수들
export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";

// 📧 관리자 이메일 확인 헬퍼
export const isAdminEmail = (email: string): boolean => {
  return env.ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === email.trim().toLowerCase()
  );
};

// 🔐 인증 스킵 여부 확인
export const shouldSkipAuth = (): boolean => {
  return isDevelopment() || env.SKIP_AUTH;
};
