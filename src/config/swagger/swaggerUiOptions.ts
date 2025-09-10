import { customStyles } from './styles';

// Type definition for Swagger operation objects
interface SwaggerOperation {
  get(key: string): string;
}

export const swaggerUiOptions = {
  explorer: true,
  customCss: customStyles,
  customJs: '/swagger-assets/theme-initializer.js',
  customSiteTitle: 'stagelives API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    tagsSorter: 'alpha',
    operationsSorter: (a: SwaggerOperation, b: SwaggerOperation) => {
      const order = ['get', 'post', 'put', 'patch', 'delete'];
      const methodA = a.get('method');
      const methodB = b.get('method');
      const indexA = order.indexOf(methodA);
      const indexB = order.indexOf(methodB);

      // 둘 다 순서 목록에 없는 경우, 알파벳 순으로 정렬
      if (indexA === -1 && indexB === -1) {
        return methodA.localeCompare(methodB);
      }
      // a만 순서 목록에 없는 경우, a를 뒤로 보냄
      if (indexA === -1) return 1;
      // b만 순서 목록에 없는 경우, b를 뒤로 보냄
      if (indexB === -1) return -1;

      // 둘 다 순서 목록에 있는 경우, 순서에 따라 정렬
      return indexA - indexB;
    },
  },
};
