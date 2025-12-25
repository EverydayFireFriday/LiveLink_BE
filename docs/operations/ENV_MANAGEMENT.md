# 🔐 환경 변수 관리 가이드

## 개요

이 문서는 프로젝트의 환경 변수(.env 파일)를 효율적이고 안전하게 관리하는 방법을 설명합니다.

## 📁 환경 파일 구조

```
.
├── .env                    # 로컬 개발 환경 (git 무시)
├── .env.example            # 환경 변수 템플릿 (git 추적)
├── .env.production         # 프로덕션 환경 (git 무시)
└── scripts/
    ├── setup-env.sh        # .env 파일 생성 도구
    ├── validate-env.sh     # .env 파일 검증 도구
    └── sync-env.sh         # GitHub Secrets 동기화 도구
```

## 🚀 빠른 시작

### 1. 로컬 개발 환경 설정

```bash
# 대화형 모드로 .env 생성
./scripts/setup-env.sh

# 또는 빠른 모드
./scripts/setup-env.sh development

# .env 파일 검증
./scripts/validate-env.sh
```

### 2. 프로덕션 환경 설정

```bash
# .env.production 생성
./scripts/setup-env.sh production

# 검증
./scripts/validate-env.sh .env.production

# GitHub Secrets로 동기화
./scripts/sync-env.sh to-github .env.production
```

## 🛠️ 스크립트 상세 가이드

### setup-env.sh - 환경 변수 파일 생성

**사용법:**
```bash
./scripts/setup-env.sh [환경] [옵션]
```

**환경 타입:**
- `development` (기본값): `.env` 파일 생성
- `production`: `.env.production` 파일 생성

**설정 모드:**

#### 1. 대화형 모드 (권장)
모든 환경 변수를 단계별로 입력합니다.
```bash
./scripts/setup-env.sh
# 모드 선택: 1
```

**특징:**
- ✅ 각 변수에 대한 설명 제공
- ✅ 기본값 자동 제안
- ✅ SESSION_SECRET 등 자동 생성
- ✅ OAuth, Grafana 등 선택적 설정

**예시:**
```
프론트엔드 URL: https://myapp.com
관리자 이메일: admin@myapp.com
이메일 계정: noreply@myapp.com
이메일 비밀번호: ****
```

#### 2. 빠른 모드
필수 값만 입력하고 나머지는 기본값을 사용합니다.
```bash
./scripts/setup-env.sh
# 모드 선택: 2
```

**특징:**
- ⚡ 빠른 설정
- 📝 필수 값만 입력
- 🔄 .env.example 기반

#### 3. 복사 모드
.env.example을 복사하여 수동으로 편집합니다.
```bash
./scripts/setup-env.sh
# 모드 선택: 3
```

**특징:**
- 📋 템플릿 복사
- ✏️ 수동 편집 필요
- 🎯 완전한 제어

### validate-env.sh - 환경 변수 검증

**사용법:**
```bash
./scripts/validate-env.sh [파일경로]
```

**검증 항목:**

1. **필수 변수 확인**
   - 모든 필수 환경 변수 존재 여부
   - 값의 유효성 검증

2. **형식 검증**
   - `PORT`: 숫자 확인
   - `EMAIL_USER`: 이메일 형식
   - `MONGO_URI`: MongoDB URI 형식
   - `REDIS_URL`: Redis URL 형식
   - `FRONTEND_URL`: URL 형식

3. **보안 검증**
   - `SESSION_SECRET` 길이 (최소 32자)
   - 기본값 사용 여부 체크
   - 파일 권한 확인 (600 권장)

4. **일관성 검증**
   - OAuth 설정 완전성
   - 프로덕션 환경 추가 검증

**예시:**
```bash
$ ./scripts/validate-env.sh

🔍 .env 파일 검증 시작...
대상 파일: .env

=== 필수 환경 변수 검증 ===

✅ NODE_ENV: development
✅ PORT: 3000
✅ FRONTEND_URL: http://localhost:5173
✅ SESSION_SECRET: ***MASKED***
✅ EMAIL_USER: test@gmail.com
✅ MONGO_URI: mongodb://localhost:27017/livelink
✅ REDIS_URL: redis://localhost:6379

=== 보안 검증 ===

✅ 파일 권한: 600
✅ .gitignore: .env 파일들이 등록되어 있습니다

======================================
✅ 검증 완료! 모든 필수 환경 변수가 올바르게 설정되었습니다.
======================================
```

### sync-env.sh - GitHub Secrets 동기화

**사용법:**
```bash
# 로컬 → GitHub
./scripts/sync-env.sh to-github [.env 파일]

# GitHub → 로컬 (템플릿)
./scripts/sync-env.sh from-github [출력 파일]
```

#### 로컬 → GitHub Secrets
프로덕션 배포를 위해 .env 파일을 GitHub Secrets로 업로드합니다.

```bash
./scripts/sync-env.sh to-github .env.production
```

**동작:**
1. GitHub CLI 로그인 확인
2. .env 파일의 모든 변수를 읽음
3. 각 변수를 GitHub Secret으로 생성/업데이트
4. 결과 리포트 출력

**예시 출력:**
```
🔄 로컬 .env → GitHub Secrets 동기화
대상 파일: .env.production

⚠️  경고: GitHub Secrets가 덮어씌워집니다!
계속하시겠습니까? (y/N): y

✅ FRONTEND_URL
✅ SESSION_SECRET: ***MASKED***
✅ EMAIL_USER
✅ EMAIL_PASS: ***MASKED***
...

======================================
✅ 15개 Secret 동기화 완료!
======================================
```

#### GitHub Secrets → 로컬
GitHub에 설정된 Secret 목록을 기반으로 .env 템플릿을 생성합니다.

```bash
./scripts/sync-env.sh from-github .env.production
```

**주의:**
- GitHub API는 Secret **값**을 읽을 수 없습니다 (보안상)
- Secret **이름** 목록만 가져와서 템플릿 생성
- 플레이스홀더 `<SET_IN_GITHUB_SECRETS>` 사용

## 📋 환경 변수 목록

### 필수 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NODE_ENV` | 실행 환경 | `development`, `production` |
| `PORT` | 서버 포트 | `3000` |
| `FRONTEND_URL` | 프론트엔드 URL | `https://myapp.com` |
| `SESSION_SECRET` | 세션 암호화 키 | (자동생성 권장) |
| `SESSION_MAX_AGE` | 세션 유효기간 (ms) | `86400000` (24시간) |
| `MONGO_URI` | MongoDB 연결 URI | `mongodb://localhost:27017/livelink` |
| `REDIS_URL` | Redis 연결 URL | `redis://localhost:6379` |
| `EMAIL_USER` | 이메일 계정 | `noreply@myapp.com` |
| `EMAIL_PASS` | 이메일 앱 비밀번호 | (Gmail 앱 비밀번호) |
| `ADMIN_EMAILS` | 관리자 이메일 목록 | `admin1@myapp.com,admin2@myapp.com` |

### 선택적 변수

#### 쿠키 설정
```env
COOKIE_DOMAIN=.myapp.com
COOKIE_SAMESITE=lax
```

#### Google OAuth
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

#### Apple OAuth
```env
APPLE_CLIENT_ID=your-client-id
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

#### Grafana
```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-password
```

#### API Rate Limiting
```env
API_LIMIT_DEFAULT_WINDOW_MS=60000
API_LIMIT_DEFAULT_MAX=100
API_LIMIT_STRICT_WINDOW_MS=60000
API_LIMIT_STRICT_MAX=20
```

## 🔒 보안 모범 사례

### 1. 절대 하지 말아야 할 것

❌ `.env` 파일을 Git에 커밋
❌ 민감한 정보를 코드에 하드코딩
❌ `.env` 파일을 Slack/이메일로 전송
❌ 프로덕션 환경변수를 개발 환경에 사용

### 2. 반드시 해야 할 것

✅ `.env`를 `.gitignore`에 추가
✅ `.env.example`만 Git에 추가
✅ `SESSION_SECRET` 등은 자동 생성 사용
✅ 파일 권한을 600으로 설정
✅ 정기적으로 비밀번호 교체
✅ 프로덕션에서는 강력한 비밀번호 사용

### 3. 파일 권한 설정

```bash
# .env 파일 권한 설정 (소유자만 읽기/쓰기)
chmod 600 .env
chmod 600 .env.production

# 확인
ls -la .env*
# -rw------- 1 user user 1234 Jan 01 12:00 .env
```

### 4. SESSION_SECRET 생성

```bash
# 강력한 랜덤 문자열 생성 (32바이트 = 256비트)
openssl rand -base64 32

# 또는 64바이트 (512비트, 프로덕션 권장)
openssl rand -base64 64
```

### 5. Gmail 앱 비밀번호 생성

1. Google 계정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. 생성된 16자리 비밀번호를 `EMAIL_PASS`에 사용

## 🔄 워크플로우

### 개발자 온보딩
```bash
# 1. 저장소 클론
git clone <repository-url>
cd LiveLink_BE

# 2. .env 파일 생성
./scripts/setup-env.sh

# 3. 검증
./scripts/validate-env.sh

# 4. 서버 시작
npm run dev
```

### 프로덕션 배포
```bash
# 1. .env.production 생성
./scripts/setup-env.sh production

# 2. 검증
./scripts/validate-env.sh .env.production

# 3. GitHub Secrets 동기화
./scripts/sync-env.sh to-github .env.production

# 4. Git push (CI/CD 자동 배포)
git push origin main
```

### 환경 변수 업데이트
```bash
# 1. 로컬 .env 수정
vim .env.production

# 2. 검증
./scripts/validate-env.sh .env.production

# 3. GitHub Secrets 재동기화
./scripts/sync-env.sh to-github .env.production
```

## 🐛 트러블슈팅

### 문제: "파일을 찾을 수 없습니다"
```bash
# .env.example이 있는지 확인
ls -la .env.example

# 없다면 Git에서 복원
git checkout .env.example
```

### 문제: "권한이 거부되었습니다"
```bash
# 스크립트 실행 권한 부여
chmod +x scripts/*.sh
```

### 문제: GitHub Secrets 동기화 실패
```bash
# GitHub CLI 재인증
gh auth logout
gh auth login

# 저장소 권한 확인
gh auth status
```

### 문제: 검증 실패
```bash
# 상세 오류 확인
./scripts/validate-env.sh .env

# 각 변수 수동 확인
cat .env | grep -v "^#" | grep -v "^$"
```

## 📚 추가 리소스

### npm 스크립트 추가 (선택사항)

`package.json`에 다음 스크립트를 추가할 수 있습니다:

```json
{
  "scripts": {
    "env:setup": "./scripts/setup-env.sh",
    "env:validate": "./scripts/validate-env.sh",
    "env:sync": "./scripts/sync-env.sh to-github .env.production",
    "predev": "./scripts/validate-env.sh || echo '⚠️  .env 검증 실패. 계속하려면 Ctrl+C 취소 후 수정하세요.'"
  }
}
```

사용법:
```bash
npm run env:setup
npm run env:validate
npm run env:sync
```

### .env 파일 자동 검증 (Git Hook)

`.husky/pre-commit`에 추가:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# .env 파일이 스테이징되어 있는지 확인
if git diff --cached --name-only | grep -E "^\.env"; then
    echo "❌ .env 파일을 커밋할 수 없습니다!"
    exit 1
fi

# .env 검증 (있는 경우)
if [ -f .env ]; then
    ./scripts/validate-env.sh || exit 1
fi
```

## ✅ 체크리스트

프로젝트 설정 시:
- [ ] `.env.example` 파일이 최신 상태인지 확인
- [ ] `.gitignore`에 `.env*` 추가 (`.env.example` 제외)
- [ ] 모든 스크립트에 실행 권한 부여
- [ ] 로컬 `.env` 파일 생성 및 검증
- [ ] 프로덕션 `.env.production` 파일 생성

배포 전:
- [ ] `.env.production` 검증 통과
- [ ] GitHub Secrets 동기화 완료
- [ ] 민감한 정보가 Git에 없는지 확인
- [ ] 프로덕션 URL/도메인 확인
- [ ] SESSION_SECRET가 강력한 랜덤 문자열인지 확인

## 🆘 도움이 필요한가요?

- 환경 변수 관련 이슈: [GitHub Issues](https://github.com/your-repo/issues)
- CI/CD 설정: `docs/CICD_SETUP.md` 참고
- 모니터링 설정: `docs/MONITORING_GUIDE.md` 참고
