import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import sanitizeHtml from 'sanitize-html';
import hpp from 'hpp';
import { env, isProduction } from '../env/env';
import logger from '../../utils/logger/logger';
import { BadRequestError } from '../../utils/errors/customErrors';
import { ErrorCodes } from '../../utils/errors/errorCodes';

/**
 * Configure Helmet security headers
 */
export const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Apollo Playground might use inline scripts
          'https://cdn.jsdelivr.net',
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // UI 라이브러리 호환성을 위해 임시 허용, Apollo Playground도 필요
          'https://cdn.jsdelivr.net',
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://appleid.apple.com',
          'https://accounts.google.com',
          'https://oauth2.googleapis.com',
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        frameAncestors: ["'self'"], // 클릭재킹 방지
        objectSrc: ["'none'"], // 플러그인 로드 차단
        // Only upgrade in production; omit in dev to prevent local HTTP breakage
        ...(isProduction() ? { upgradeInsecureRequests: [] } : {}),
        reportUri: isProduction() ? ['/csp-report'] : [], // Add CSP reporting endpoint
      },
    },
    strictTransportSecurity: isProduction()
      ? {
          maxAge: 31536000, // 1년
          includeSubDomains: true,
          preload: true,
        }
      : false,
    // Prefer CSP's frame-ancestors. If you need XFO, keep it consistent with CSP:
    frameguard: { action: 'sameorigin' },
  });
};

/**
 * Configure CORS
 */
export const configureCors = () => {
  return cors({
    origin: (origin, callback) => {
      // 프로덕션: FRONTEND_URL만 허용
      // 개발: CORS_ALLOWED_ORIGINS 목록의 도메인만 허용
      const allowedOrigins = isProduction()
        ? [env.FRONTEND_URL]
        : env.CORS_ALLOWED_ORIGINS;

      // Origin이 없는 경우 (서버 간 통신, Postman 등)
      if (!origin) {
        return callback(null, true);
      }

      // 허용된 도메인인지 확인
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`🚫 CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // 항상 credentials 활성화
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400, // Preflight 캐시 24시간
  });
};

/**
 * XSS 방어를 위한 입력값 sanitization
 */
const sanitizeInput = (input: unknown): unknown => {
  if (typeof input === 'string') {
    return sanitizeHtml(input, {
      allowedTags: [], // 모든 HTML 태그 제거
      allowedAttributes: {}, // 모든 HTML 속성 제거
    });
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item));
  }
  if (typeof input === 'object' && input !== null) {
    const sanitizedObject: { [key: string]: unknown } = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        sanitizedObject[key] = sanitizeInput(
          (input as Record<string, unknown>)[key],
        );
      }
    }
    return sanitizedObject;
  }
  return input;
};

/**
 * XSS 방어 미들웨어
 */
export const xssProtectionMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  // req.query, req.params 등도 필요에 따라 sanitizeInput 적용 가능
  next();
};

/**
 * Configure JSON parsing with verification
 */
export const configureJsonParsing = () => {
  return express.json({
    limit: '10mb',
    verify: (req: express.Request, res: express.Response, buf: Buffer) => {
      try {
        JSON.parse(buf.toString());
      } catch {
        throw new BadRequestError(
          '잘못된 JSON 형식입니다.',
          ErrorCodes.VAL_INVALID_FORMAT,
        );
      }
    },
  });
};

/**
 * Apply all security middlewares to Express app
 */
export const applySecurityMiddlewares = (app: express.Application) => {
  // 프록시 신뢰 설정 (프로덕션 환경에서 로드밸런서/프록시 뒤에 있을 때)
  app.set('trust proxy', 1);

  // 보안 헤더 설정
  app.use(configureHelmet());

  // CORS 설정
  app.use(configureCors());

  // JSON 파싱 미들웨어
  app.use(configureJsonParsing());
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 보안 미들웨어 적용
  app.use(mongoSanitize());
  app.use(xssProtectionMiddleware);
  app.use(hpp());
};
