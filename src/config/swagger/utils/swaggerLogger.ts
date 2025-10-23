import { logger } from '../../../utils';
import { SwaggerDefinition } from 'swagger-jsdoc';

export function logSwaggerInfo(swaggerSpec: SwaggerDefinition) {
  if (process.env.NODE_ENV === 'production') return;

  try {
    const pathCount = Object.keys(swaggerSpec.paths || {}).length;
    const serverUrl =
      process.env.PRODUCTION_URL ||
      `http://localhost:${process.env.PORT || 3000}`;

    logger.info(`
🎵 Stagelives API Swagger Documentation`);
    logger.info(`📚 발견된 API 경로: ${pathCount}개`);
    logger.info(`🌍 서버 URL: ${serverUrl}`);

    if (pathCount === 0) {
      logger.warn('⚠️  API가 감지되지 않음 - @swagger 주석 확인 필요');
    } else {
      logger.info('✅ Swagger 문서 생성 완료');
      logger.info('🎨 동적 UI 테마 (다크/라이트 모드) 적용');
      logger.info('🔍 향상된 검색 기능 활성화');
      logger.info('📖 포함된 API: Auth, Concert, Article, Admin');
      logger.info('🔑 인증 방식: Session-based (Redis)');
    }
  } catch (error) {
    logger.error('⚠️  Swagger 정보 로깅 중 오류 발생:', { error });
  }
}
