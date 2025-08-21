import swaggerJSDoc from "swagger-jsdoc";
import * as swaggerUi from "swagger-ui-express";
import { swaggerOptions } from "./swaggerOptions";
import { swaggerUiOptions } from "./swaggerUiOptions";

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
export { swaggerUi, swaggerUiOptions };

// 개발환경 디버깅
import { logger } from "../../utils";

// ... (기존 코드)

if (process.env.NODE_ENV !== "production") {
  try {
    const pathCount = Object.keys((swaggerSpec as any).paths || {}).length;
    logger.info(`\n🎵 LiveLink API Swagger Documentation`);
    logger.info(`📚 발견된 API 경로: ${pathCount}개`);
    logger.info(
      `🌍 서버 URL: ${process.env.PRODUCTION_URL || `http://localhost:${process.env.PORT || 3000}`}`
    );

    if (pathCount === 0) {
      logger.warn("⚠️  API가 감지되지 않음 - @swagger 주석 확인 필요");
    } else {
      logger.info("✅ Swagger 문서 생성 완료");
      logger.info("화려한 UI 테마 적용");
      logger.info("다크 모드 지원");
      logger.info("대소문자 구분 없는 검색 기능 활성화");
      logger.info("📖 포함된 API: Auth, Concert, Article, Admin");
      logger.info("인증 방식: Session-based (Redis)");
    }
  } catch (error) {
    logger.error("⚠️  Swagger 초기화 오류:", { error });
  }
}
