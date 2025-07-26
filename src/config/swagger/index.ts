import swaggerJSDoc from 'swagger-jsdoc';
import { swaggerOptions } from './swaggerOptions';
import { swaggerUiOptions } from './swaggerUiOptions';

// Swagger JSDoc 설정
const specs = swaggerJSDoc(swaggerOptions);

// 개발 환경에서 추가 정보 포함
if (process.env.NODE_ENV === 'development') {
  specs.info.description += '\n\n**개발 환경에서 실행 중입니다.**\n- 모든 API 엔드포인트가 활성화되어 있습니다.\n- 디버깅 정보가 포함됩니다.';
}

export { specs, swaggerUiOptions };

// 타입 정의
export interface SwaggerConfig {
  specs: object;
  uiOptions: typeof swaggerUiOptions;
}

// 설정 검증 함수
export const validateSwaggerConfig = (): boolean => {
  try {
    if (!specs || !specs.info) {
      console.error('Swagger specs 설정이 올바르지 않습니다.');
      return false;
    }
    
    if (!swaggerUiOptions.swaggerOptions) {
      console.error('Swagger UI 옵션이 올바르지 않습니다.');
      return false;
    }
    
    console.log('✅ Swagger 설정이 성공적으로 검증되었습니다.');
    return true;
  } catch (error) {
    console.error('❌ Swagger 설정 검증 중 오류:', error);
    return false;
  }
};

// 기본 내보내기
export default {
  specs,
  uiOptions: swaggerUiOptions,
  validate: validateSwaggerConfig,
};
