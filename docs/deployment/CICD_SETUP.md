# 🚀 CI/CD 설정 가이드

## 개요

이 프로젝트는 GitHub Actions를 사용하여 자동화된 CI/CD 파이프라인을 구축합니다.

## 워크플로우 구성

### 1. CI (Continuous Integration) - `.github/workflows/ci.yml`
- **트리거**: Pull Request, Push to main
- **작업**:
  - 코드 린팅
  - 테스트 실행
  - 빌드 검증

### 2. CD (Continuous Deployment) - `.github/workflows/cd.yml`
- **트리거**: Push to main, Version tags (v*.*.*)
- **작업**:
  1. Docker 이미지 빌드 및 GitHub Container Registry에 푸시
  2. `.env.production` 파일 생성 (GitHub Secrets 사용)
  3. 서버 배포 (SSH)

## 🔐 GitHub Secrets 설정

### 필수 Secrets

GitHub 저장소의 `Settings` → `Secrets and variables` → `Actions`에서 다음 Secrets를 추가하세요:

#### 애플리케이션 기본 설정
```
FRONTEND_URL=https://your-frontend-domain.com
SESSION_SECRET=your-strong-random-session-secret-at-least-32-characters
```

#### 이메일 서비스
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

#### 관리자 계정
```
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

#### Google OAuth (선택사항)
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Apple OAuth (선택사항)
```
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
your-apple-private-key-content
-----END PRIVATE KEY-----
```

#### Grafana (선택사항)
```
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password
```

### 선택적 Secrets (기본값 사용 가능)

```
COOKIE_DOMAIN=.yourdomain.com
COOKIE_SAMESITE=lax
MONGO_URI=mongodb://mongo:27017/livelink
REDIS_URL=redis://redis:6379
```

### SSH 배포 설정 (서버 배포 시 필요)

```
SERVER_HOST=your-server-ip-or-domain
SERVER_USERNAME=deploy-user
SERVER_PORT=22
SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
your-private-key-content
-----END OPENSSH PRIVATE KEY-----
DEPLOY_PATH=/opt/livelink
```

## 📝 Secrets 설정 방법

### 1. GitHub UI를 통한 설정

1. GitHub 저장소 페이지로 이동
2. `Settings` → `Secrets and variables` → `Actions` 클릭
3. `New repository secret` 버튼 클릭
4. Secret 이름과 값을 입력
5. `Add secret` 클릭

### 2. GitHub CLI를 통한 설정

```bash
# GitHub CLI 설치 (https://cli.github.com/)

# 로그인
gh auth login

# Secret 추가
gh secret set SESSION_SECRET --body "your-strong-random-session-secret"
gh secret set FRONTEND_URL --body "https://your-frontend.com"
gh secret set EMAIL_USER --body "your-email@gmail.com"
gh secret set EMAIL_PASS --body "your-gmail-app-password"

# 파일에서 Secret 추가 (멀티라인 값)
gh secret set APPLE_PRIVATE_KEY < apple-private-key.pem
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_rsa

# 모든 Secret 확인
gh secret list
```

### 3. 일괄 설정 스크립트

```bash
#!/bin/bash
# setup-secrets.sh

# 사용법: ./setup-secrets.sh

# 필수 Secrets
gh secret set FRONTEND_URL --body "https://your-frontend.com"
gh secret set SESSION_SECRET --body "$(openssl rand -base64 32)"
gh secret set EMAIL_USER --body "your-email@gmail.com"
gh secret set EMAIL_PASS --body "your-gmail-app-password"
gh secret set ADMIN_EMAILS --body "admin@example.com"

# OAuth Secrets (필요시)
# gh secret set GOOGLE_CLIENT_ID --body "your-google-client-id"
# gh secret set GOOGLE_CLIENT_SECRET --body "your-google-client-secret"

# Grafana Secrets (선택사항)
gh secret set GRAFANA_ADMIN_USER --body "admin"
gh secret set GRAFANA_ADMIN_PASSWORD --body "$(openssl rand -base64 16)"

echo "✅ GitHub Secrets 설정 완료!"
echo "⚠️  다음 Secrets는 수동으로 추가하세요:"
echo "   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (Google OAuth 사용 시)"
echo "   - APPLE_* (Apple OAuth 사용 시)"
echo "   - SERVER_* (SSH 배포 사용 시)"
```

## 🔧 배포 활성화

### SSH 배포 활성화 방법

1. `.github/workflows/cd.yml` 파일 수정:
   ```yaml
   - name: Deploy to server via SSH
     uses: appleboy/ssh-action@v1.0.0
     if: true  # false에서 true로 변경
   ```

2. 필수 SSH Secrets 추가:
   - `SERVER_HOST`
   - `SERVER_USERNAME`
   - `SSH_PRIVATE_KEY`

3. 서버에서 준비 작업:
   ```bash
   # 배포 디렉토리 생성
   sudo mkdir -p /opt/livelink
   sudo chown $USER:$USER /opt/livelink

   # 저장소 파일 복사
   cd /opt/livelink
   # docker-compose.yml 파일 업로드
   ```

## 🏗️ 배포 프로세스

### 자동 배포 플로우

1. **코드 푸시** (main 브랜치)
   ```bash
   git push origin main
   ```

2. **GitHub Actions 실행**
   - Docker 이미지 빌드
   - GitHub Container Registry에 푸시
   - `.env.production` 파일 생성
   - SSH로 서버 접속
   - 서버에서 컨테이너 재시작

3. **헬스체크**
   - 자동으로 `/health/liveness` 엔드포인트 확인
   - 실패 시 배포 롤백

### 수동 배포

```bash
# 서버에 SSH 접속
ssh user@your-server

# 배포 디렉토리로 이동
cd /opt/livelink

# 최신 이미지 가져오기
docker-compose pull app

# 서비스 재시작
docker-compose up -d --force-recreate app

# 로그 확인
docker-compose logs -f app
```

## 🔍 배포 확인

### 1. GitHub Actions 로그 확인
- GitHub 저장소 → `Actions` 탭
- 최근 워크플로우 실행 확인

### 2. 서버 상태 확인
```bash
# 헬스체크
curl http://localhost:3000/health/liveness

# 컨테이너 상태
docker-compose ps

# 로그 확인
docker-compose logs --tail=100 app
```

### 3. 모니터링 대시보드
- Grafana: http://your-server:3001
- Prometheus: http://your-server:9090

## 🔒 보안 모범 사례

### 1. Secrets 관리
- ✅ 절대 코드에 Secrets를 하드코딩하지 마세요
- ✅ `.env` 파일을 `.gitignore`에 추가
- ✅ 정기적으로 Secrets 교체
- ✅ 최소 권한 원칙 적용

### 2. SSH 키 관리
```bash
# 배포 전용 SSH 키 생성
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# 공개 키를 서버에 추가
ssh-copy-id -i ~/.ssh/github_deploy.pub user@your-server

# GitHub Secret으로 개인 키 추가
gh secret set SSH_PRIVATE_KEY < ~/.ssh/github_deploy
```

### 3. 환경 변수 검증
```bash
# 서버에서 .env.production 파일 확인
cat /opt/livelink/.env.production

# 환경 변수 로드 테스트
docker-compose config
```

## 🚨 트러블슈팅

### Secrets가 적용되지 않을 때
```bash
# Secrets 확인
gh secret list

# 워크플로우 재실행
gh run rerun <run-id>
```

### SSH 연결 실패
```bash
# SSH 연결 테스트
ssh -i ~/.ssh/github_deploy user@your-server

# SSH 키 권한 확인
chmod 600 ~/.ssh/github_deploy
```

### Docker 이미지 Pull 실패
```bash
# GitHub Container Registry 로그인
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 이미지 수동 Pull
docker pull ghcr.io/your-org/livelink_be:latest
```

## 📚 추가 리소스

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [GitHub Secrets 가이드](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

## 📋 체크리스트

배포 전 확인사항:

- [ ] 모든 필수 GitHub Secrets 설정 완료
- [ ] `.env.example` 파일과 Secrets 목록 동기화
- [ ] SSH 키 설정 및 서버 접근 권한 확인
- [ ] 서버에 Docker 및 Docker Compose 설치
- [ ] 배포 디렉토리 생성 및 권한 설정
- [ ] `docker-compose.yml` 파일 서버에 업로드
- [ ] 헬스체크 엔드포인트 정상 작동 확인
- [ ] Grafana/Prometheus 접근 권한 설정
- [ ] SSL/TLS 인증서 설정 (프로덕션 환경)
- [ ] 방화벽 규칙 설정 (필요한 포트만 개방)
