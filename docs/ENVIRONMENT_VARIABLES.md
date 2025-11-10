# Environment Variables Guide

## 📋 환경변수 목록

### 필수 환경변수 (Required)

#### 🗄️ Database
| 변수명 | 설명 | 예시 | 기본값 |
|--------|------|------|--------|
| `MONGO_URI` | MongoDB 연결 문자열 | `mongodb://localhost:27017/livelink` | - |
| `REDIS_URL` | Redis 연결 문자열 | `redis://localhost:6379` | - |

#### 🔐 Security
| 변수명 | 설명 | 예시 | 기본값 |
|--------|------|------|--------|
| `SESSION_SECRET` | 세션 암호화 키 (32자 이상) | `your-super-secret-key-min-32-chars` | - |

#### 📧 Email
| 변수명 | 설명 | 예시 | 기본값 |
|--------|------|------|--------|
| `EMAIL_USER` | 이메일 발송 계정 | `noreply@yourdomain.com` | - |
| `EMAIL_PASS` | 이메일 계정 비밀번호 | `app-specific-password` | - |

#### 👑 Admin
| 변수명 | 설명 | 예시 | 기본값 |
|--------|------|------|--------|
| `ADMIN_EMAILS` | 관리자 이메일 목록 (쉼표 구분) | `admin@domain.com,admin2@domain.com` | - |

---

### 선택 환경변수 (Optional)

#### 🌐 Server
| 변수명 | 설명 | 예시 | 기본값 |
|--------|------|------|--------|
| `NODE_ENV` | 실행 환경 | `development` \| `production` \| `test` | `development` |
| `PORT` | 서버 포트 | `3000` | `3000` |
| `FRONTEND_URL` | 프론트엔드 URL (CORS) | `https://yourdomain.com` | `http://localhost:3000` |

#### 🔐 Session & Cookie
| 변수명 | 설명 | 예시 | 기본값 |
|--------|------|------|--------|
| `SESSION_MAX_AGE` | 세션 만료 시간 (밀리초) | `86400000` (24시간) | `86400000` |
| `COOKIE_DOMAIN` | 쿠키 도메인 | `.yourdomain.com` | undefined |
| `COOKIE_SAMESITE` | SameSite 정책 | `lax` \| `strict` \| `none` | `lax` |

#### 🛡️ Brute Force Protection
| 변수명 | 설명 | 예시 | 기본값 |
|--------|------|------|--------|
| `BRUTE_FORCE_MAX_ATTEMPTS` | 최대 로그인 시도 횟수 | `5` | `10` |
| `BRUTE_FORCE_BLOCK_DURATION` | 차단 기간 (초) | `1800` (30분) | `1800` |

#### 🚦 Rate Limiting
| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `API_LIMIT_DEFAULT_WINDOW_MS` | 기본 Rate Limit 윈도우 (밀리초) | `60000` (1분) |
| `API_LIMIT_DEFAULT_MAX` | 기본 Rate Limit 최대 요청 수 | `100` |
| `API_LIMIT_STRICT_WINDOW_MS` | 엄격한 Rate Limit 윈도우 | `60000` |
| `API_LIMIT_STRICT_MAX` | 엄격한 Rate Limit 최대 요청 수 | `20` |
| `API_LIMIT_RELAXED_WINDOW_MS` | 완화된 Rate Limit 윈도우 | `60000` |
| `API_LIMIT_RELAXED_MAX` | 완화된 Rate Limit 최대 요청 수 | `200` |

**참고:** `NODE_ENV=development`일 때는 모든 Rate Limiting이 자동으로 비활성화됩니다.

#### 🕐 Scheduler
| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `CONCERT_STATUS_CHECK_INTERVAL` | 콘서트 상태 체크 간격 (밀리초) | `1800000` (30분) |

#### 📊 Logging
| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `LOG_LEVEL` | 로그 레벨 | `info` |

**로그 레벨 옵션:**
- `error`: 에러만
- `warn`: 경고 이상
- `info`: 정보 이상 (권장)
- `verbose`: 상세 로그
- `debug`: 디버그 로그

#### 🔧 Development
| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `SKIP_AUTH` | 인증 스킵 여부 (개발용) | `false` |

---

## 📝 환경변수 파일 예시

### Development (`.env`)

```env
# 🗄️ Database
MONGO_URI=mongodb://localhost:27017/livelink
REDIS_URL=redis://localhost:6379

# 🔐 Security
SESSION_SECRET=your-super-secret-key-at-least-32-characters-long
SESSION_MAX_AGE=86400000

# 📧 Email (개발용 - Gmail App Password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# 👑 Admin
ADMIN_EMAILS=admin@yourdomain.com

# 🌐 Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# 🔐 Cookie (개발용)
COOKIE_DOMAIN=
COOKIE_SAMESITE=lax

# 🛡️ Brute Force Protection
BRUTE_FORCE_MAX_ATTEMPTS=10
BRUTE_FORCE_BLOCK_DURATION=1800

# 🚦 Rate Limiting
API_LIMIT_DEFAULT_WINDOW_MS=60000
API_LIMIT_DEFAULT_MAX=100
API_LIMIT_STRICT_WINDOW_MS=60000
API_LIMIT_STRICT_MAX=20
API_LIMIT_RELAXED_WINDOW_MS=60000
API_LIMIT_RELAXED_MAX=200

# 🕐 Scheduler
CONCERT_STATUS_CHECK_INTERVAL=1800000

# 📊 Logging
LOG_LEVEL=debug

# 🔧 Development
SKIP_AUTH=false
```

### Production (`.env.production`)

```env
# 🗄️ Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/livelink?retryWrites=true&w=majority
REDIS_URL=redis://:password@redis-host:6379

# 🔐 Security
SESSION_SECRET=production-super-secret-key-min-32-chars-CHANGE-THIS
SESSION_MAX_AGE=86400000

# 📧 Email
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=production-email-password

# 👑 Admin
ADMIN_EMAILS=admin@yourdomain.com,admin2@yourdomain.com

# 🌐 Server
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# 🔐 Cookie (프로덕션 - SameSite=None for cross-domain)
COOKIE_DOMAIN=.yourdomain.com
COOKIE_SAMESITE=none

# 🛡️ Brute Force Protection (프로덕션 - 더 엄격하게)
BRUTE_FORCE_MAX_ATTEMPTS=5
BRUTE_FORCE_BLOCK_DURATION=1800

# 🚦 Rate Limiting (프로덕션)
API_LIMIT_DEFAULT_WINDOW_MS=60000
API_LIMIT_DEFAULT_MAX=100
API_LIMIT_STRICT_WINDOW_MS=900000
API_LIMIT_STRICT_MAX=10
API_LIMIT_RELAXED_WINDOW_MS=60000
API_LIMIT_RELAXED_MAX=200

# 🕐 Scheduler
CONCERT_STATUS_CHECK_INTERVAL=1800000

# 📊 Logging
LOG_LEVEL=info

# 🔧 Development (프로덕션에서는 false)
SKIP_AUTH=false
```

---

## 🔒 보안 주의사항

### 1. **환경변수 파일 보안**
```bash
# .gitignore에 반드시 추가
.env
.env.local
.env.development
.env.production
.env.*.local
```

### 2. **SESSION_SECRET 생성**
```bash
# 안전한 랜덤 키 생성 (최소 32자)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. **이메일 비밀번호**
- Gmail: App-specific password 사용
- SMTP: 전용 계정 사용
- 절대 개인 계정 비밀번호 사용 금지

### 4. **MongoDB URI**
프로덕션 환경:
```
mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority&authSource=admin
```

**주의사항:**
- 강력한 비밀번호 사용
- IP 화이트리스트 설정
- 읽기 전용 계정 분리

### 5. **Redis 보안**
```env
# 비밀번호 설정
REDIS_URL=redis://:strong-password@redis-host:6379

# TLS 사용 (권장)
REDIS_URL=rediss://:password@redis-host:6380
```

---

## ✅ 환경변수 검증

서버 시작 시 자동으로 환경변수를 검증합니다.

### 검증 실패 예시
```
❌ 환경변수 검증 실패:
   MONGO_URI: MongoDB URI가 필요합니다
   SESSION_SECRET: 세션 시크릿은 최소 32자 이상이어야 합니다
   EMAIL_USER: 올바른 이메일 형식이 아닙니다

📋 필수 환경변수 목록:
   MONGO_URI - MongoDB 연결 문자열
   REDIS_URL - Redis 연결 문자열
   SESSION_SECRET - 세션 암호화 키 (32자 이상)
   EMAIL_USER - 이메일 발송용 계정
   ADMIN_EMAILS - 관리자 이메일 목록

🚨 환경변수 검증 실패로 서버를 시작할 수 없습니다.
```

### 검증 성공 예시
```
🔧 환경변수 검증 중...
📧 EMAIL_USER: ✅ noreply@yourdomain.com
🔄 REDIS_URL: ✅ 설정됨
🗄️  MONGO_URI: ✅ 설정됨
👑 관리자 계정 개수: 2
🌍 환경: production
🚪 포트: 3000
📊 로그 레벨: info
🔐 세션 만료시간: 1440분
🛡️ 브루트포스 보호 - 최대 시도 횟수: 5
🛡️ 브루트포스 보호 - 차단 기간: 30분
🍪 쿠키 도메인: .yourdomain.com
🍪 SameSite 정책: none
```

---

## 🛠️ 환경변수 설정 스크립트

### 자동 설정 (권장)
```bash
# 개발 환경 설정
npm run env:setup

# 프로덕션 환경 설정
npm run env:setup:prod
```

### 검증
```bash
# .env 파일 검증
npm run env:validate

# .env.production 파일 검증
npm run env:validate:prod
```

---

## 🔄 환경별 설정 전략

### Local Development
- `.env` 파일 사용
- `SKIP_AUTH=true` 옵션 활용 (선택)
- `LOG_LEVEL=debug` 디버깅 용이

### Staging
- `.env.staging` 파일
- 프로덕션과 동일한 설정
- 테스트 계정 사용

### Production
- 환경변수 직접 설정 (Docker, K8s Secrets)
- `.env` 파일 사용하지 않음 (보안)
- 엄격한 Rate Limiting
- `LOG_LEVEL=info` 또는 `warn`

---

## 📚 참고 문서

- [Development Setup Guide](./DEVELOPMENT_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Best Practices](./architecture/README.md#-보안-기능)

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0
