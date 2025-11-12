# 🚀 배포 가이드

## 목차
1. [배포 환경 구성](#배포-환경-구성)
2. [GitHub Secrets 설정](#github-secrets-설정)
3. [브랜치 보호 규칙 설정](#브랜치-보호-규칙-설정)
4. [자동 배포 워크플로우](#자동-배포-워크플로우)
5. [수동 배포](#수동-배포)

---

## 배포 환경 구성

### 환경별 매핑
| 브랜치 | 배포 환경 | MongoDB | Redis | 자동 배포 |
|--------|-----------|---------|-------|-----------|
| `main` | Production (LIVE) | `livelink_live` | Redis LIVE | ✅ (승인 후) |
| `develop` | Staging (TEST) | `livelink_test` | Redis TEST | ✅ (자동) |
| `feature/*` | 로컬 개발 | localhost | localhost | ❌ |

---

## GitHub Secrets 설정

### 1. Repository Secrets 추가
`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

#### Production 서버 (LIVE)
```
PROD_SERVER_HOST=your-production-server.com
PROD_SERVER_USERNAME=deploy
PROD_SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
PROD_SERVER_PORT=22
PROD_DEPLOY_PATH=/var/www/livelink-backend
```

#### Staging 서버 (TEST)
```
STAGING_SERVER_HOST=your-staging-server.com
STAGING_SERVER_USERNAME=deploy
STAGING_SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
STAGING_SERVER_PORT=22
STAGING_DEPLOY_PATH=/var/www/livelink-backend-staging
```

### 2. SSH 키 생성 (서버에서 실행)
```bash
# 배포용 SSH 키 생성
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# 공개 키를 authorized_keys에 추가
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Private Key를 GitHub Secrets에 추가
cat ~/.ssh/github_deploy
```

---

## 브랜치 보호 규칙 설정

### 1. Main 브랜치 보호
`Settings` → `Branches` → `Add branch protection rule`

#### Branch name pattern: `main`
- ✅ **Require a pull request before merging**
  - Required approvals: `1`
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Status checks:
    - `test` (CI 워크플로우)
    - `build` (CI 워크플로우)
    - `security-check` (CI 워크플로우)
- ✅ **Require conversation resolution before merging**
- ✅ **Do not allow bypassing the above settings** (관리자도 규칙 준수)
- ❌ Allow force pushes (절대 허용 안 함)
- ❌ Allow deletions (절대 허용 안 함)

### 2. Develop 브랜치 보호
`Settings` → `Branches` → `Add branch protection rule`

#### Branch name pattern: `develop`
- ✅ **Require a pull request before merging**
  - Required approvals: `1`
- ✅ **Require status checks to pass before merging**
  - Status checks:
    - `test` (CI 워크플로우)
    - `build` (CI 워크플로우)
- ✅ **Require conversation resolution before merging**
- ❌ Do not allow bypassing (관리자는 예외 허용 가능)
- ❌ Allow force pushes (신중하게 허용 가능)
- ❌ Allow deletions (절대 허용 안 함)

---

## 자동 배포 워크플로우

### CI/CD 파이프라인 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      PR 생성 or Push                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CI Workflow (ci.yml)                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐            │
│  │   Test   │→ │  Build   │→ │ Security Check │            │
│  └──────────┘  └──────────┘  └────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                              ↓
                  ✅ All checks passed
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   CD Workflow (cd.yml)                       │
│  ┌─────────────────────────────────────────────┐            │
│  │         Docker Build & Push to GHCR         │            │
│  └─────────────────────────────────────────────┘            │
│                       ↓                                      │
│    ┌──────────────┐             ┌──────────────┐           │
│    │   main push  │             │ develop push │           │
│    └──────────────┘             └──────────────┘           │
│           ↓                              ↓                  │
│  ┌───────────────────┐       ┌───────────────────┐         │
│  │ Deploy Production │       │  Deploy Staging   │         │
│  │  (승인 필요)       │       │    (자동 배포)    │         │
│  └───────────────────┘       └───────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 트리거

#### CI Workflow (ci.yml)
- Pull Request → `main`, `develop`
- Push → `main`, `develop`
- 실행 내용: 테스트, 빌드, 보안 체크

#### CD Workflow (cd.yml)
- Push → `main`: Docker 빌드 + Production 배포
- Push → `develop`: Docker 빌드 + Staging 배포
- 실행 내용: Docker 이미지 빌드/푸시, SSH를 통한 서버 배포

### GitHub Environments 설정
`Settings` → `Environments` → `New environment`

#### Production 환경
- Name: `production`
- ✅ **Required reviewers**: 승인자 1명 이상 지정
- ✅ **Wait timer**: 0 minutes (선택사항)
- Environment URL: `https://api.stagelives.com`

#### Staging 환경
- Name: `staging`
- Environment URL: `https://test-api.stagelives.com`

---

## 수동 배포

서버에 SSH로 접속하여 수동으로 배포할 수 있습니다.

### Production 배포
```bash
ssh deploy@your-production-server.com
cd /var/www/livelink-backend

# Production 배포 스크립트 실행
./scripts/deploy-production.sh
```

**특징:**
- main 브랜치에서만 pull
- .env 파일 검증
- 백업 자동 생성
- DB 마이그레이션 실행
- PM2 무중단 배포
- Health check 실행

### Staging 배포
```bash
ssh deploy@your-staging-server.com
cd /var/www/livelink-backend-staging

# Develop 배포 스크립트 실행
./scripts/deploy-develop.sh
```

**특징:**
- develop 브랜치에서만 pull
- .env 파일 사용
- PM2 무중단 배포
- Health check 실행 (실패 시 경고만)

---

## 배포 프로세스

### Production 배포 프로세스
1. `feature/*` 브랜치에서 개발
2. `develop` 브랜치로 PR 생성
3. CI 체크 통과 + 리뷰 승인 → `develop`에 머지
4. Staging 서버에 자동 배포
5. Staging 테스트 완료 후, `develop` → `main` PR 생성
6. CI 체크 통과 + 리뷰 승인 → `main`에 머지
7. **승인 대기** (GitHub Environment 설정)
8. 승인 후 Production 서버에 자동 배포

### Staging 배포 프로세스
1. `feature/*` 브랜치에서 개발
2. `develop` 브랜치로 PR 생성
3. CI 체크 통과 + 리뷰 승인 → `develop`에 머지
4. Staging 서버에 **즉시 자동 배포**

---

## 배포 롤백

### 자동 백업 복구 (Production만)
```bash
ssh deploy@your-production-server.com
cd /var/www/livelink-backend

# 백업 목록 확인
ls -lt backups/

# 롤백 스크립트 실행
./scripts/rollback.sh
```

### Git 기반 롤백
```bash
# 이전 커밋으로 되돌리기
git checkout <previous-commit-hash>
./scripts/deploy-production.sh
```

---

## 모니터링

### PM2 모니터링
```bash
# 프로세스 상태 확인
pm2 status

# 로그 확인
pm2 logs livelink-backend

# 실시간 모니터링
pm2 monit
```

### Health Check
```bash
# Liveness 체크
curl http://localhost:3000/health/liveness

# Readiness 체크
curl http://localhost:3000/health/readiness

# 전체 헬스 체크
curl http://localhost:3000/health
```

---

## 트러블슈팅

### 배포 실패 시
1. GitHub Actions 로그 확인
2. 서버 SSH 접속 후 로그 확인: `pm2 logs livelink-backend`
3. Health check 실행: `curl http://localhost:3000/health`
4. 필요시 롤백: `./scripts/rollback.sh`

### CI 체크 실패 시
1. 로컬에서 테스트 실행: `npm test`
2. 로컬에서 빌드 실행: `npm run build`
3. Lint 에러 수정: `npm run lint:fix`

---

## 참고 자료
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [PM2 문서](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Docker 문서](https://docs.docker.com/)
