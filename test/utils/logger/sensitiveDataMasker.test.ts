/**
 * 민감 정보 마스킹 테스트 및 사용 예제
 *
 * 실제 테스트를 실행하려면:
 * npx ts-node test/utils/logger/sensitiveDataMasker.test.ts
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { maskSensitiveData } from '../../../src/utils/logger/sensitiveDataMasker';

/**
 * 테스트 예제들
 * 실제로 로거를 사용할 때 어떻게 마스킹되는지 보여줍니다.
 */

console.log('='.repeat(80));
console.log('민감 정보 자동 마스킹 테스트');
console.log('='.repeat(80));

// ========================================
// 1. 객체 내 민감 정보 마스킹
// ========================================
console.log('\n[테스트 1] 객체 내 민감 정보 마스킹');
console.log('-'.repeat(80));

const sensitiveObject = {
  username: 'john_doe',
  password: 'super_secret_password_123',
  email: 'john@example.com',
  apiKey: 'EXAMPLE_API_KEY_abcdefghijklmnopqrstuvwxyz1234567890',
  accessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
  settings: {
    theme: 'dark',
    privateKey: 'EXAMPLE_PRIVATE_KEY_abcdefghijklmnopqrstuvwxyz',
  },
};

console.log('원본:');
console.log(JSON.stringify(sensitiveObject, null, 2));

const [masked] = maskSensitiveData(sensitiveObject);
console.log('\n마스킹 후:');
console.log(JSON.stringify(masked, null, 2));

// ========================================
// 2. 로그인 요청 데이터 마스킹
// ========================================
console.log('\n\n[테스트 2] 로그인 요청 데이터 마스킹');
console.log('-'.repeat(80));

const loginRequest = {
  email: 'user@example.com',
  password: 'MyP@ssw0rd!',
  rememberMe: true,
};

console.log('원본 로그인 요청:');
console.log(JSON.stringify(loginRequest, null, 2));

const [maskedLogin] = maskSensitiveData(loginRequest);
console.log('\n마스킹 후:');
console.log(JSON.stringify(maskedLogin, null, 2));

// ========================================
// 3. API 응답 데이터 마스킹
// ========================================
console.log('\n\n[테스트 3] API 응답 데이터 마스킹');
console.log('-'.repeat(80));

const apiResponse = {
  success: true,
  data: {
    user: {
      id: '12345',
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
    tokens: {
      accessToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      refreshToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWZyZXNoIjp0cnVlfQ.x4s8Z9mPL0QJ6dE2fZvKYlo2C8qfKj9',
    },
    session: {
      id: 'sess_abcdef123456',
      expiresAt: '2024-12-31T23:59:59Z',
    },
  },
};

console.log('원본 API 응답:');
console.log(JSON.stringify(apiResponse, null, 2));

const [maskedResponse] = maskSensitiveData(apiResponse);
console.log('\n마스킹 후:');
console.log(JSON.stringify(maskedResponse, null, 2));

// ========================================
// 4. 문자열 내 Bearer 토큰 마스킹
// ========================================
console.log('\n\n[테스트 4] 문자열 내 Bearer 토큰 마스킹');
console.log('-'.repeat(80));

const logMessage =
  'User authenticated with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

console.log('원본 로그 메시지:');
console.log(logMessage);

const [maskedMessage] = maskSensitiveData(logMessage);
console.log('\n마스킹 후:');
console.log(maskedMessage);

// ========================================
// 5. 배열 내 민감 정보 마스킹
// ========================================
console.log('\n\n[테스트 5] 배열 내 민감 정보 마스킹');
console.log('-'.repeat(80));

const users = [
  {
    id: 1,
    username: 'alice',
    password: 'alice_password',
    apiKey: 'key_alice_123456789',
  },
  {
    id: 2,
    username: 'bob',
    password: 'bob_password',
    apiKey: 'key_bob_987654321',
  },
];

console.log('원본 사용자 배열:');
console.log(JSON.stringify(users, null, 2));

const [maskedUsers] = maskSensitiveData(users);
console.log('\n마스킹 후:');
console.log(JSON.stringify(maskedUsers, null, 2));

// ========================================
// 6. 환경 변수 로깅 시 마스킹
// ========================================
console.log('\n\n[테스트 6] 환경 변수 로깅 시 마스킹');
console.log('-'.repeat(80));

const envVars = {
  NODE_ENV: 'production',
  PORT: '3000',
  DATABASE_URL: 'mongodb://localhost:27017/mydb',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'my_super_secret_jwt_key_that_should_not_be_logged',
  API_KEY: 'EXAMPLE_API_KEY_abcdef1234567890xyz',
  SESSION_SECRET: 'another_secret_key_for_sessions',
};

console.log('원본 환경 변수:');
console.log(JSON.stringify(envVars, null, 2));

const [maskedEnv] = maskSensitiveData(envVars);
console.log('\n마스킹 후:');
console.log(JSON.stringify(maskedEnv, null, 2));

// ========================================
// 7. 에러 객체와 함께 민감 정보 마스킹
// ========================================
console.log('\n\n[테스트 7] 에러 객체와 함께 민감 정보 마스킹');
console.log('-'.repeat(80));

const errorContext = {
  error: 'Authentication failed',
  details: {
    username: 'hacker@evil.com',
    password: 'wrong_password_attempt',
    attemptedToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.token',
  },
  timestamp: new Date().toISOString(),
};

console.log('원본 에러 컨텍스트:');
console.log(JSON.stringify(errorContext, null, 2));

const [maskedError] = maskSensitiveData(errorContext);
console.log('\n마스킹 후:');
console.log(JSON.stringify(maskedError, null, 2));

// ========================================
// 8. 중첩된 객체 내 민감 정보 마스킹
// ========================================
console.log('\n\n[테스트 8] 깊게 중첩된 객체 내 민감 정보 마스킹');
console.log('-'.repeat(80));

const deeplyNested = {
  level1: {
    level2: {
      level3: {
        level4: {
          username: 'deep_user',
          password: 'deep_password',
          apiKey: 'deep_api_key_12345',
        },
      },
    },
  },
};

console.log('원본 중첩 객체:');
console.log(JSON.stringify(deeplyNested, null, 2));

const [maskedDeep] = maskSensitiveData(deeplyNested);
console.log('\n마스킹 후:');
console.log(JSON.stringify(maskedDeep, null, 2));

console.log('\n' + '='.repeat(80));
console.log('테스트 완료!');
console.log('='.repeat(80));

/**
 * 실제 로거 사용 예제
 */
console.log('\n\n[실제 사용 예제] 로거와 함께 사용하기');
console.log('-'.repeat(80));
console.log(`
// 기존 코드 (민감 정보 노출 위험)
logger.info('User logged in', {
  email: 'user@example.com',
  password: 'secret123'
});

// 새로운 코드 (자동 마스킹 적용)
// 아무것도 바꿀 필요 없음! 로거가 자동으로 마스킹합니다.
logger.info('User logged in', {
  email: 'user@example.com',
  password: 'secret123'  // 자동으로 "pa********************"로 마스킹됨
});

// 출력: [2024-01-01 12:00:00] info: User logged in {
//   email: 'us***@example.com',
//   password: 'se********************'
// }
`);

console.log('민감 정보가 포함된 키워드:');
console.log('- password, passwd, pwd');
console.log('- token, accessToken, refreshToken, access_token, refresh_token');
console.log('- secret, apiKey, api_key, private_key, privateKey');
console.log('- authorization, auth, cookie, session, sessionId, session_id');
console.log(
  '- credentials, credit_card, creditcard, cvv, ssn, social_security',
);
console.log('- bearer, jwt');
