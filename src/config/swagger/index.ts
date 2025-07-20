import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { swaggerOptions } from "./swaggerOptions";
import { swaggerUiOptions } from "./swaggerUiOptions";

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
export { swaggerUi, swaggerUiOptions };

// 개발환경 디버깅
if (process.env.NODE_ENV !== "production") {
  try {
    const pathCount = Object.keys((swaggerSpec as any).paths || {}).length;
    console.log(`\n🎵 LiveLink API Swagger Documentation`);
    console.log(`📚 발견된 API 경로: ${pathCount}개`);
    console.log(
      `🌍 서버 URL: ${process.env.PRODUCTION_URL || `http://localhost:${process.env.PORT || 3000}`}`
    );

    if (pathCount === 0) {
      console.log("⚠️  API가 감지되지 않음 - @swagger 주석 확인 필요");
    } else {
      console.log("✅ Swagger 문서 생성 완료");
      console.log("화려한 UI 테마 적용");
      console.log("다크 모드 지원");
      console.log("대소문자 구분 없는 검색 기능 활성화");
      console.log("📖 포함된 API: Auth, Concert, Article, Admin");
      console.log("인증 방식: Session-based (Redis)");
    }
  } catch (error) {
    console.log("⚠️  Swagger 초기화 오류:", error);
  }
}
