import { swaggerSchemas } from './schemas';
import { swaggerTags } from './utils/tagSorter';

const PORT = process.env.PORT || 3000;

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'stagelives API',
      version: '1.0.0',
      description:
        'Authentication & Concert Management API with Redis Session & MongoDB Native Driver',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers:
      process.env.NODE_ENV === 'production'
        ? [
            {
              url:
                process.env.PRODUCTION_URL ||
                'https://test.backend.stagelives.com',
              description: 'Production server',
            },
          ]
        : [
            {
              url: process.env.DEV_SERVER_URL || `http://localhost:${PORT}`,
              description: 'Development server',
            },
          ],
    tags: swaggerTags,
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'app.session.id',
          description: '세션 기반 인증 - 로그인 후 자동으로 설정되는 세션 쿠키',
        },
      },
      schemas: swaggerSchemas,
    },
  },
  apis: ['./dist/controllers/**/*.js', './dist/routes/**/*.js'],
};
