/**
 * 민감 정보 자동 마스킹 유틸리티
 *
 * 로그에서 password, token, secret, apiKey 등 민감 정보를 자동으로 마스킹합니다.
 */

/**
 * 민감 정보로 간주되는 키워드 목록
 * 대소문자 구분 없이 매칭됩니다.
 */
const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'accesstoken',
  'refreshtoken',
  'access_token',
  'refresh_token',
  'secret',
  'apikey',
  'api_key',
  'private_key',
  'privatekey',
  'authorization',
  'auth',
  'cookie',
  'session',
  'sessionid',
  'session_id',
  'credentials',
  'credit_card',
  'creditcard',
  'cvv',
  'ssn',
  'social_security',
  'api-key',
  'bearer',
  'jwt',
];

/**
 * 문자열에서 민감 정보 패턴을 찾아 마스킹하는 정규식 패턴들
 */
const SENSITIVE_PATTERNS = [
  // Bearer 토큰 패턴 (예: Bearer eyJhbGciOiJIUzI1NiIs...)
  {
    pattern: /Bearer\s+([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)/gi,
    replacement: 'Bearer ***TOKEN_MASKED***',
  },
  // JWT 토큰 패턴 (점으로 구분된 3개 파트)
  {
    pattern: /\b[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g,
    replacement: '***JWT_MASKED***',
    // URL이나 다른 것과 혼동될 수 있으므로 JWT 키워드가 근처에 있을 때만 적용
    contextCheck: (fullText: string, _match: string) => {
      const lowerText = fullText.toLowerCase();
      return (
        lowerText.includes('jwt') ||
        lowerText.includes('token') ||
        lowerText.includes('authorization')
      );
    },
  },
  // API 키 패턴 (32자 이상의 알파벳+숫자 조합)
  {
    pattern: /\b[A-Za-z0-9]{32,}\b/g,
    replacement: '***API_KEY_MASKED***',
    contextCheck: (fullText: string) => {
      const lowerText = fullText.toLowerCase();
      return lowerText.includes('key') || lowerText.includes('api');
    },
  },
  // 이메일 주소 부분 마스킹 (예: test@example.com -> t***@example.com)
  {
    pattern:
      /\b([a-zA-Z0-9])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    replacement: (_match: string, firstChar: string, domain: string) =>
      `${firstChar}***@${domain}`,
  },
];

/**
 * 마스킹할 문자 개수를 계산
 * 짧은 값은 전체 마스킹, 긴 값은 앞 2자리만 보여주고 나머지 마스킹
 */
const getMaskedValue = (value: string): string => {
  if (typeof value !== 'string') return '***MASKED***';

  const length = value.length;

  // 4자 이하는 완전 마스킹
  if (length <= 4) {
    return '***';
  }

  // 5자 이상은 앞 2자리만 보여주고 나머지 마스킹
  return `${value.substring(0, 2)}${'*'.repeat(Math.min(length - 2, 20))}`;
};

/**
 * 주어진 키가 민감 정보 키인지 확인
 */
const isSensitiveKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitiveKey) => lowerKey.includes(sensitiveKey));
};

/**
 * 객체를 재귀적으로 탐색하여 민감 정보를 마스킹
 */
const maskObjectRecursively = (
  obj: unknown,
  depth = 0,
  maxDepth = 10,
): unknown => {
  // 순환 참조 방지 및 깊이 제한
  if (depth > maxDepth) return '[Max Depth Reached]';

  // null 또는 undefined
  if (obj === null || obj === undefined) return obj;

  // 원시 타입
  if (typeof obj !== 'object') return obj;

  // Date 객체
  if (obj instanceof Date) return obj;

  // Error 객체
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
  }

  // 배열 처리
  if (Array.isArray(obj)) {
    return obj.map((item: unknown) =>
      maskObjectRecursively(item, depth + 1, maxDepth),
    );
  }

  // 객체 처리
  const masked: Record<string, unknown> = {};
  const objRecord = obj as Record<string, unknown>;

  for (const key in objRecord) {
    if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
      const value = objRecord[key];

      // 민감한 키인 경우 값 마스킹
      if (isSensitiveKey(key)) {
        if (typeof value === 'string') {
          masked[key] = getMaskedValue(value);
        } else if (typeof value === 'object' && value !== null) {
          // 객체나 배열인 경우에도 마스킹 적용
          masked[key] = '***MASKED_OBJECT***';
        } else {
          masked[key] = '***MASKED***';
        }
      } else {
        // 민감한 키가 아닌 경우 재귀적으로 처리
        if (typeof value === 'object' && value !== null) {
          masked[key] = maskObjectRecursively(value, depth + 1, maxDepth);
        } else if (typeof value === 'string') {
          // 문자열 값에서 패턴 매칭으로 민감 정보 찾기
          masked[key] = maskSensitivePatterns(value);
        } else {
          masked[key] = value;
        }
      }
    }
  }

  return masked;
};

/**
 * 문자열에서 민감 정보 패턴을 찾아 마스킹
 */
const maskSensitivePatterns = (text: string): string => {
  if (typeof text !== 'string' || text.length === 0) return text;

  let maskedText = text;

  for (const { pattern, replacement, contextCheck } of SENSITIVE_PATTERNS) {
    // contextCheck가 있는 경우 먼저 컨텍스트 확인
    if (contextCheck && !contextCheck(text, '')) {
      continue;
    }

    if (typeof replacement === 'function') {
      maskedText = maskedText.replace(pattern, replacement);
    } else {
      maskedText = maskedText.replace(pattern, replacement);
    }
  }

  return maskedText;
};

/**
 * 로그 메시지에서 민감 정보를 자동으로 마스킹
 *
 * @param message - 로그 메시지 (문자열, 객체, 배열 등)
 * @param additionalData - 추가 데이터 객체
 * @returns 마스킹된 로그 데이터
 */
export const maskSensitiveData = (
  message: unknown,
  ...additionalData: unknown[]
): unknown[] => {
  const maskedMessage =
    typeof message === 'string'
      ? maskSensitivePatterns(message)
      : typeof message === 'object' && message !== null
        ? maskObjectRecursively(message)
        : message;

  const maskedAdditionalData = additionalData.map((data: unknown) => {
    if (typeof data === 'string') {
      return maskSensitivePatterns(data);
    } else if (typeof data === 'object' && data !== null) {
      return maskObjectRecursively(data);
    }
    return data;
  });

  return [maskedMessage, ...maskedAdditionalData];
};

/**
 * 특정 키를 민감 정보 키 목록에 추가
 *
 * @param keys - 추가할 키워드 배열
 */
export const addSensitiveKeys = (...keys: string[]): void => {
  SENSITIVE_KEYS.push(...keys.map((k) => k.toLowerCase()));
};

/**
 * 민감 정보 패턴 추가
 *
 * @param pattern - 정규식 패턴
 * @param replacement - 대체할 문자열
 */
export const addSensitivePattern = (
  pattern: RegExp,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replacement: string | ((...args: any[]) => string),
  contextCheck?: (fullText: string, match: string) => boolean,
): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SENSITIVE_PATTERNS.push({ pattern, replacement, contextCheck } as any);
};

export default {
  maskSensitiveData,
  addSensitiveKeys,
  addSensitivePattern,
};
