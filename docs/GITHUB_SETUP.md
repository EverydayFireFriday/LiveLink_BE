# GitHub CI/CD 설정 가이드

## 1️⃣ GitHub Secrets 설정

### Repository Secrets 추가 방법
1. GitHub 저장소 페이지로 이동
2. `Settings` → `Secrets and variables` → `Actions`
3. `New repository secret` 클릭
4. 아래 Secret들을 추가

### 필수 Secrets

#### Production 서버 설정
| Secret 이름 | 설명 | 예시 |
|-------------|------|------|
| `PROD_SERVER_HOST` | 프로덕션 서버 호스트 | `api.stagelives.com` |
| `PROD_SERVER_USERNAME` | SSH 사용자명 | `deploy` |
| `PROD_SSH_PRIVATE_KEY` | SSH Private Key (전체 내용) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PROD_SERVER_PORT` | SSH 포트 (기본 22) | `22` |
| `PROD_DEPLOY_PATH` | 배포 경로 | `/var/www/livelink-backend` |

#### Staging 서버 설정
| Secret 이름 | 설명 | 예시 |
|-------------|------|------|
| `STAGING_SERVER_HOST` | 스테이징 서버 호스트 | `test-api.stagelives.com` |
| `STAGING_SERVER_USERNAME` | SSH 사용자명 | `deploy` |
| `STAGING_SSH_PRIVATE_KEY` | SSH Private Key (전체 내용) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `STAGING_SERVER_PORT` | SSH 포트 (기본 22) | `22` |
| `STAGING_DEPLOY_PATH` | 배포 경로 | `/var/www/livelink-backend-staging` |

---

## 2️⃣ SSH 키 생성 및 설정

### 서버에서 SSH 키 생성
```bash
# 배포 서버에 SSH 접속
ssh your-user@your-server.com

# 배포용 SSH 키 생성
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# 공개 키를 authorized_keys에 추가
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# 권한 설정
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Private Key 출력 (이 내용을 GitHub Secrets에 추가)
cat ~/.ssh/github_deploy
```

### Private Key를 GitHub Secrets에 추가
1. 위에서 출력된 Private Key 전체를 복사
2. GitHub Repository → Settings → Secrets → New repository secret
3. Name: `PROD_SSH_PRIVATE_KEY` (또는 `STAGING_SSH_PRIVATE_KEY`)
4. Value: Private Key 전체 내용 붙여넣기

---

## 3️⃣ 브랜치 보호 규칙 설정

### Main 브랜치 보호 (Production)
1. GitHub Repository → `Settings` → `Branches`
2. `Add branch protection rule` 클릭
3. Branch name pattern: `main`
4. 다음 옵션들을 설정:

#### 필수 설정
- ✅ **Require a pull request before merging**
  - Required number of approvals before merging: `1`
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - 필수 status checks:
    - `test`
    - `build`
    - `security-check`

- ✅ **Require conversation resolution before merging**

- ✅ **Do not allow bypassing the above settings**
  (관리자도 규칙을 따라야 함)

- ❌ **Allow force pushes** (체크 해제 - 절대 허용 안 함)

- ❌ **Allow deletions** (체크 해제 - 절대 허용 안 함)

5. `Create` 버튼 클릭

### Develop 브랜치 보호 (Staging)
1. `Add branch protection rule` 클릭
2. Branch name pattern: `develop`
3. 다음 옵션들을 설정:

#### 필수 설정
- ✅ **Require a pull request before merging**
  - Required number of approvals before merging: `1`

- ✅ **Require status checks to pass before merging**
  - 필수 status checks:
    - `test`
    - `build`

- ✅ **Require conversation resolution before merging**

- ❌ **Do not allow bypassing the above settings** (체크 해제)
  (관리자는 예외 허용 가능)

4. `Create` 버튼 클릭

---

## 4️⃣ GitHub Environments 설정

### Production 환경 설정
1. GitHub Repository → `Settings` → `Environments`
2. `New environment` 클릭
3. Name: `production`
4. 설정:
   - ✅ **Required reviewers**: 승인자 1명 이상 추가
   - Environment protection rules:
     - Deployment branches: `Selected branches` → `main`
   - Environment URL: `https://api.stagelives.com`
5. `Save protection rules` 클릭

### Staging 환경 설정
1. `New environment` 클릭
2. Name: `staging`
3. 설정:
   - Deployment branches: `Selected branches` → `develop`
   - Environment URL: `https://test-api.stagelives.com`
4. `Save protection rules` 클릭

---

## 5️⃣ 설정 확인

### CI/CD 워크플로우 확인
1. 코드를 수정하고 `develop` 브랜치에 push
2. GitHub Repository → `Actions` 탭으로 이동
3. CI 워크플로우가 자동으로 실행되는지 확인
4. 모든 체크가 통과하면 CD 워크플로우도 실행됨

### 테스트 배포
```bash
# develop 브랜치에서 테스트
git checkout develop
git pull origin develop
echo "test" >> README.md
git add README.md
git commit -m "test: CI/CD 테스트"
git push origin develop
```

GitHub Actions에서:
1. CI 워크플로우 실행 (test, build, security-check)
2. CD 워크플로우 실행 (Docker build + Staging 배포)
3. Staging 서버 자동 배포 완료

---

## 6️⃣ 트러블슈팅

### SSH 연결 실패
```bash
# 로컬에서 SSH 연결 테스트
ssh -i ~/.ssh/github_deploy deploy@your-server.com

# 연결이 안 되면 권한 확인
ls -la ~/.ssh/
# authorized_keys: -rw------- (600)
# github_deploy: -rw------- (600)
```

### CI 체크 실패
- GitHub Actions 로그 확인
- 로컬에서 테스트 실행: `npm test && npm run build`

### 배포 실패
- SSH 키가 올바르게 설정되었는지 확인
- 서버 경로가 올바른지 확인 (`PROD_DEPLOY_PATH`)
- 배포 스크립트에 실행 권한이 있는지 확인: `chmod +x scripts/deploy-*.sh`

---

## 참고사항

### SSH 키 vs Personal Access Token
- **SSH 키 (권장)**: 서버 배포에 안전하고 효율적
- **PAT**: GitHub API 접근 시 사용 (Docker 이미지 push 등)

### Secrets 보안
- Secrets는 GitHub Actions 로그에 마스킹됨
- Secrets는 암호화되어 저장됨
- 절대 소스 코드에 직접 입력하지 말 것

### 배포 승인 프로세스
- Production 배포는 승인이 필요함 (GitHub Environment 설정)
- Staging 배포는 자동으로 진행됨
- 승인자는 GitHub Repository Settings에서 지정
