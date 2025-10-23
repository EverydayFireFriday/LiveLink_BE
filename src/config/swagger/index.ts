import swaggerJSDoc from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';
import { swaggerOptions } from './swaggerOptions';
import { swaggerUiOptions } from './swaggerUiOptions';
import { logSwaggerInfo } from './utils/swaggerLogger';

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
export { swaggerUi, swaggerUiOptions };

// 개발 환경에서 Swagger 정보 로깅
logSwaggerInfo(swaggerSpec);
