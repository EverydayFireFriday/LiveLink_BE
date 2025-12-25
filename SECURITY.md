# Security Policy

## 🛡️ 보안 정책

LiveLink 프로젝트의 보안을 유지하는 것은 우리의 최우선 과제입니다. 보안 취약점을 발견하셨다면, 이 문서의 지침에 따라 책임감 있게 신고해주시기 바랍니다.

---

## 📋 목차

- [지원되는 버전](#-지원되는-버전)
- [보안 취약점 신고](#-보안-취약점-신고)
- [신고 프로세스](#-신고-프로세스)
- [보안 모범 사례](#-보안-모범-사례)
- [보안 체크리스트](#-보안-체크리스트)

---

## 🔖 지원되는 버전

다음 버전에 대해 보안 업데이트를 제공합니다:

| Version | Supported          |
| ------- | ------------------ |
| 0.9.x   | :white_check_mark: |
| < 0.9   | :x:                |

**참고**: 최신 버전으로 업데이트하는 것을 권장합니다.

---

## 🚨 보안 취약점 신고

### ⚠️ 중요: 공개적으로 신고하지 마세요

보안 취약점을 발견하셨다면, **절대 GitHub Issues에 공개적으로 올리지 마세요**. 대신 다음 방법으로 신고해주세요.

### 신고 방법

#### 1. 이메일 (권장)

```
📧 이메일: stagelives2.0@gmail.com
제목: [SECURITY] 보안 취약점 신고
```

#### 2. GitHub Security Advisories

1. 저장소의 **Security** 탭으로 이동
2. **Report a vulnerability** 클릭
3. 양식 작성 후 제출

---

## 📝 신고 프로세스

### 1. 신고 시 포함할 정보

보안 취약점을 신고할 때 다음 정보를 포함해주세요:

```markdown
### 취약점 유형
- [ ] SQL Injection
- [ ] XSS (Cross-Site Scripting)
- [ ] CSRF (Cross-Site Request Forgery)
- [ ] Authentication/Authorization Bypass
- [ ] Sensitive Data Exposure
- [ ] Security Misconfiguration
- [ ] 기타: ___________

### 영향도
- [ ] Critical (즉시 조치 필요)
- [ ] High (빠른 조치 필요)
- [ ] Medium (중간 우선순위)
- [ ] Low (낮은 우선순위)

### 상세 설명
취약점에 대한 명확하고 상세한 설명

### 재현 단계
1. 단계 1
2. 단계 2
3. ...

### 영향 범위
이 취약점이 미치는 영향

### 개념 증명 (PoC)
가능하다면 재현 가능한 코드나 스크립트 첨부

### 제안 해결 방법
가능하다면 수정 방법 제안

### 환경 정보
- OS:
- Node.js 버전:
- 영향받는 버전:
```

### 2. 대응 타임라인

보안 취약점 신고 후 예상되는 프로세스:

| 단계 | 기간 | 설명 |
|------|------|------|
| **접수 확인** | 24시간 이내 | 신고 접수 확인 이메일 발송 |
| **초기 평가** | 72시간 이내 | 취약점 심각도 평가 및 분류 |
| **상세 분석** | 1주일 이내 | 상세 분석 및 수정 방안 검토 |
| **수정 작업** | 심각도에 따라 다름 | - Critical: 즉시<br>- High: 1주일<br>- Medium: 2주일<br>- Low: 4주일 |
| **패치 배포** | 수정 완료 후 | 보안 패치 배포 및 공지 |
| **공개** | 패치 배포 후 30일 | 취약점 상세 내용 공개 (신고자 동의 시) |

### 3. 보상 프로그램

현재 공식적인 버그 바운티 프로그램은 운영하지 않습니다. 하지만 중대한 보안 취약점을 발견하고 신고해주신 분들께는 다음과 같은 감사를 표합니다:

- 🏆 **Hall of Fame**에 이름 등재 (원하시는 경우)
- 💌 **감사 편지** 및 공식 인정
- 📢 릴리스 노트에서 **기여자로 명시**

---

## 🔐 보안 모범 사례

### 애플리케이션 배포 시

#### 1. 환경 변수 관리

```bash
# ✅ 올바른 방법
# GitHub Secrets, AWS Secrets Manager, HashiCorp Vault 등 사용
export SESSION_SECRET=$(aws secretsmanager get-secret-value ...)

# ❌ 잘못된 방법
# .env 파일을 Git에 커밋하지 마세요
git add .env  # NEVER DO THIS!
```

#### 2. 데이터베이스 보안

```javascript
// ✅ 올바른 방법 - Parameterized Queries
await User.findOne({ email: userInput });

// ❌ 잘못된 방법 - String Concatenation
await db.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

#### 3. 세션 보안

```javascript
// ✅ 올바른 방법
app.use(session({
  secret: process.env.SESSION_SECRET, // 환경 변수 사용
  cookie: {
    httpOnly: true,    // XSS 방지
    secure: true,      // HTTPS only
    sameSite: 'strict' // CSRF 방지
  }
}));

// ❌ 잘못된 방법
app.use(session({
  secret: 'hardcoded-secret', // 하드코딩된 비밀키
  cookie: {
    httpOnly: false,
    secure: false
  }
}));
```

#### 4. Rate Limiting

```javascript
// ✅ API 요청 제한 설정
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100 요청
});

app.use('/api/', limiter);
```

#### 5. 입력 검증

```javascript
// ✅ 올바른 방법 - 입력 검증
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const validated = userSchema.parse(input);

// ❌ 잘못된 방법 - 검증 없음
const { email, password } = req.body;
```

---

## ✅ 보안 체크리스트

### 배포 전 확인사항

- [ ] **환경 변수**
  - [ ] 모든 비밀키가 환경 변수로 관리되는가?
  - [ ] `.env` 파일이 `.gitignore`에 포함되어 있는가?
  - [ ] 프로덕션 환경에서 강력한 비밀번호를 사용하는가?

- [ ] **데이터베이스**
  - [ ] MongoDB/Redis 인증이 활성화되어 있는가?
  - [ ] 데이터베이스 접근이 방화벽으로 제한되어 있는가?
  - [ ] 정기 백업이 설정되어 있는가?

- [ ] **네트워크**
  - [ ] HTTPS/TLS가 활성화되어 있는가?
  - [ ] CORS 정책이 올바르게 설정되어 있는가?
  - [ ] Rate Limiting이 적용되어 있는가?

- [ ] **인증/인가**
  - [ ] 세션 관리가 안전하게 구현되어 있는가?
  - [ ] 비밀번호가 bcrypt로 해싱되는가?
  - [ ] 브루트포스 공격 방지가 활성화되어 있는가?

- [ ] **로깅**
  - [ ] 민감한 정보가 로그에 기록되지 않는가?
  - [ ] 보안 이벤트가 로깅되는가?
  - [ ] 로그 파일이 안전하게 저장되는가?

- [ ] **의존성**
  - [ ] `npm audit`로 취약점 검사를 했는가?
  - [ ] 의존성이 최신 버전인가?
  - [ ] Dependabot이 활성화되어 있는가?

### 정기 보안 점검

#### 월간

```bash
# 의존성 취약점 검사
npm audit

# 자동 수정 시도
npm audit fix

# 중대한 취약점 수동 검토
npm audit --production
```

#### 분기별

- [ ] 보안 정책 문서 검토
- [ ] 접근 권한 검토
- [ ] 로그 분석 및 이상 징후 확인
- [ ] 침투 테스트 수행 (가능한 경우)

---

## 🔍 알려진 취약점

현재 알려진 보안 취약점은 없습니다.

과거 취약점 및 패치 내역은 [Security Advisories](https://github.com/EverydayFireFriday/LiveLink_BE/security/advisories)에서 확인할 수 있습니다.

---

## 📚 보안 관련 문서

- [환경 변수 관리](./docs/operations/ENV_MANAGEMENT.md)
- [배포 가이드](./docs/deployment/DEPLOYMENT_GUIDE.md)
- [모니터링 가이드](./docs/operations/MONITORING_GUIDE.md)

---

## 🆘 긴급 연락처

심각한 보안 사고 발생 시:

```
📧 긴급 이메일: security@yourdomain.com
📞 긴급 연락처: [비공개 - 팀원에게 문의]
```

---

## 🙏 감사의 말

보안 취약점을 책임감 있게 신고해주신 모든 분들께 감사드립니다.

### Hall of Fame

현재까지 보안 취약점을 신고해주신 분들:

- *아직 없음*

---

## 📄 법적 고지

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 보안 연구 목적의 테스트는 다음 조건에서 허용됩니다:

- 테스트는 로컬 환경 또는 명시적으로 허가된 환경에서만 수행
- 발견된 취약점은 즉시 신고
- 취약점 정보는 패치 배포 전까지 비공개 유지
- 서비스 가용성을 해치는 테스트 금지 (DoS 등)

---

**마지막 업데이트**: 2024-12-26

Made with ❤️ by EverydayFireFriday Team
