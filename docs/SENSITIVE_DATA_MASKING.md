# 민감 정보 자동 마스킹 가이드

## 📋 개요

로그에서 `password`, `token`, `secret`, `apiKey` 등 민감한 정보를 자동으로 감지하여 마스킹하는 기능입니다.

## 🎯 주요 기능

### 1. 자동 마스킹 키워드

다음 키워드가 포함된 필드는 자동으로 마스킹됩니다:

- **비밀번호**: `password`, `passwd`, `pwd`
- **토큰**: `token`, `accessToken`, `refreshToken`, `access_token`, `refresh_token`, `bearer`, `jwt`
- **시크릿**: `secret`, `apiKey`, `api_key`, `private_key`, `privateKey`
- **인증**: `authorization`, `auth`, `cookie`, `session`, `sessionId`, `session_id`, `credentials`
- **금융**: `credit_card`, `creditcard`, `cvv`, `ssn`, `social_security`

### 2. 패턴 기반 자동 감지

문자열 내에서 다음 패턴을 자동으로 감지하여 마스킹:

- **Bearer 토큰**: `Bearer eyJhbGci...` → `Bearer ***TOKEN_MASKED***`
- **JWT 토큰**: `eyJhbGci.eyJzdWI.doz...` → `***JWT_MASKED***`
- **API 키**: 32자 이상의 긴 문자열 → `***API_KEY_MASKED***`
- **이메일**: `test@example.com` → `t***@example.com`

### 3. 재귀적 객체 탐색

중첩된 객체와 배열도 자동으로 탐색하여 마스킹합니다.

## 🚀 사용 방법

### 기본 사용

기존 코드를 **전혀 수정할 필요 없습니다**! 로거가 자동으로 마스킹합니다.

```typescript
import logger from './utils/logger/logger';

// 민감 정보가 포함된 객체 로깅
logger.info('User logged in', {
  username: 'john_doe',
  password: 'super_secret_password',  // 자동 마스킹됨
  email: 'john@example.com',          // 자동 마스킹됨
  apiKey: 'sk_live_abc123...',        // 자동 마스킹됨
});

// 출력:
// [2024-01-01 12:00:00] info: User logged in {
//   username: 'john_doe',
//   password: 'su********************',
//   email: 'j***@example.com',
//   apiKey: 'sk********************'
// }
```

### 로그인 요청 로깅

```typescript
// POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // 민감 정보가 포함되어 있어도 안전하게 로깅 가능
  logger.info('Login attempt', { email, password });
  // → password는 자동으로 마스킹됨

  // 인증 로직...
});
```

### API 응답 로깅

```typescript
// 토큰 발급 시
const tokens = {
  accessToken: 'eyJhbGciOiJIUzI1NiIs...',
  refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
};

logger.info('Tokens issued', tokens);
// → accessToken, refreshToken 모두 자동 마스킹됨
```

### 에러 로깅

```typescript
try {
  await authenticateUser(credentials);
} catch (error) {
  // 에러 컨텍스트에 민감 정보가 있어도 안전
  logger.error('Authentication failed', {
    error: error.message,
    credentials,  // password 등이 자동 마스킹됨
    timestamp: Date.now(),
  });
}
```

### 환경 변수 로깅 (서버 시작 시)

```typescript
// 서버 시작 시 환경 설정 로깅
logger.info('Server configuration', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,      // 자동 마스킹됨
  API_KEY: process.env.API_KEY,            // 자동 마스킹됨
  SESSION_SECRET: process.env.SESSION_SECRET, // 자동 마스킹됨
});
```

## 🔧 고급 사용법

### 추가 민감 키워드 등록

프로젝트에 특화된 민감 키워드를 추가할 수 있습니다:

```typescript
import { addSensitiveKeys } from './utils/logger/sensitiveDataMasker';

// 추가 키워드 등록
addSensitiveKeys('internalToken', 'companySecret', 'privateData');

// 이제 이 키워드들도 자동 마스킹됨
logger.info('Data', {
  internalToken: 'abc123',  // 자동 마스킹
  companySecret: 'xyz789',  // 자동 마스킹
});
```

### 커스텀 패턴 추가

특정 패턴을 추가로 마스킹할 수 있습니다:

```typescript
import { addSensitivePattern } from './utils/logger/sensitiveDataMasker';

// 주민등번호 패턴 추가
addSensitivePattern(
  /\d{6}-\d{7}/g,
  '******-*******'
);

// 신용카드 번호 패턴 추가
addSensitivePattern(
  /\d{4}-\d{4}-\d{4}-\d{4}/g,
  '****-****-****-****'
);
```

### 원본 로거 접근 (마스킹 비활성화)

특수한 경우 마스킹 없이 원본 로거를 사용하려면:

```typescript
import logger from './utils/logger/logger';

// 마스킹이 적용된 일반 로거 (권장)
logger.info('Masked log', { password: '123' });

// 마스킹 없는 원본 로거 (디버깅 전용, 절대 프로덕션에서 사용 금지)
logger.raw.info('Raw log', { password: '123' });
```

⚠️ **경고**: `logger.raw`는 디버깅 목적으로만 사용하고, 프로덕션 코드에서는 절대 사용하지 마세요!

## 📊 마스킹 예제

### 예제 1: 로그인 요청

```typescript
// 입력
logger.info('Login request', {
  email: 'user@example.com',
  password: 'MyP@ssw0rd123!',
  rememberMe: true,
});

// 출력
[2024-01-01 12:00:00] info: Login request {
  email: 'u***@example.com',
  password: 'My********************',
  rememberMe: true
}
```

### 예제 2: API 토큰 발급

```typescript
// 입력
logger.info('Token issued', {
  userId: '12345',
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.token',
  expiresIn: 3600,
});

// 출력
[2024-01-01 12:00:00] info: Token issued {
  userId: '12345',
  accessToken: 'ey********************',
  refreshToken: 'ey********************',
  expiresIn: 3600
}
```

### 예제 3: 환경 변수

```typescript
// 입력
logger.info('Environment loaded', {
  NODE_ENV: 'production',
  PORT: 3000,
  DATABASE_URL: 'mongodb://localhost:27017/mydb',
  JWT_SECRET: 'super_secret_jwt_key_do_not_expose',
  API_KEY: 'EXAMPLE_API_KEY_1234567890abcdef',
});

// 출력
[2024-01-01 12:00:00] info: Environment loaded {
  NODE_ENV: 'production',
  PORT: 3000,
  DATABASE_URL: 'mongodb://localhost:27017/mydb',
  JWT_SECRET: 'su********************',
  API_KEY: 'EX********************'
}
```

### 예제 4: Bearer 토큰 (문자열 내)

```typescript
// 입력
logger.info('Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.here');

// 출력
[2024-01-01 12:00:00] info: Authorization header: Bearer ***TOKEN_MASKED***
```

## 🧪 테스트

테스트 파일을 실행하여 마스킹이 올바르게 작동하는지 확인:

```bash
# TypeScript 실행
npx ts-node test/utils/logger/sensitiveDataMasker.test.ts

# 또는 Jest로 실행
npm test
```

## ✅ 베스트 프랙티스

1. **항상 마스킹된 로거 사용**: `logger.raw` 대신 일반 `logger` 사용
2. **로그 전에 민감 정보 제거하지 않아도 됨**: 로거가 자동으로 처리
3. **환경 변수 로깅 시 주의**: 시작 시 한 번만 로깅하고, 민감한 값은 마스킹됨
4. **디버깅 시에도 안전**: 개발 환경에서도 민감 정보가 콘솔에 노출되지 않음
5. **추가 키워드 등록**: 프로젝트 특화 민감 정보는 `addSensitiveKeys`로 등록

## 🔒 보안 고려사항

- ✅ 모든 로그는 자동으로 민감 정보가 마스킹됩니다
- ✅ 파일 로그와 콘솔 로그 모두 마스킹 적용됩니다
- ✅ 중첩된 객체와 배열도 재귀적으로 마스킹됩니다
- ✅ JWT 토큰, API 키 등 패턴 기반 자동 감지
- ⚠️ 100% 완벽한 보안은 보장되지 않으므로, 가능한 민감 정보는 로깅하지 마세요
- ⚠️ `logger.raw`는 절대 프로덕션 코드에서 사용 금지

## 📚 참고

- 소스 코드: `src/utils/logger/sensitiveDataMasker.ts`
- 로거 래퍼: `src/utils/logger/logger.ts`
- 테스트 파일: `test/utils/logger/sensitiveDataMasker.test.ts`
- 문서: `docs/SENSITIVE_DATA_MASKING.md`

## 🙋 FAQ

**Q: 기존 코드를 수정해야 하나요?**
A: 아니요! 기존 코드를 전혀 수정할 필요 없습니다. 모든 `logger.info()`, `logger.error()` 등이 자동으로 마스킹됩니다.

**Q: 성능에 영향이 있나요?**
A: 최소한의 영향만 있습니다. 로깅은 원래 I/O 작업이므로 마스킹 오버헤드는 무시할 수 있는 수준입니다.

**Q: 특정 로그만 마스킹 비활성화할 수 있나요?**
A: `logger.raw`를 사용하면 되지만, 프로덕션에서는 절대 사용하지 마세요.

**Q: 프로덕션 로그에서도 작동하나요?**
A: 네! 개발/프로덕션 모든 환경에서 자동으로 작동합니다.

**Q: 로그 파일도 마스킹되나요?**
A: 네! 콘솔 로그와 파일 로그 모두 마스킹됩니다.
