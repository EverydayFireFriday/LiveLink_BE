#!/bin/bash

# GitHub Secrets 일괄 설정 스크립트
# 사용법: ./scripts/setup-secrets.sh

set -e

echo "🔐 GitHub Secrets 설정 시작..."
echo ""

# GitHub CLI 확인
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI가 설치되어 있지 않습니다."
    echo "   설치 방법: https://cli.github.com/"
    exit 1
fi

# 로그인 확인
if ! gh auth status &> /dev/null; then
    echo "⚠️  GitHub에 로그인되어 있지 않습니다."
    echo "   로그인 중..."
    gh auth login
fi

echo "✅ GitHub CLI 준비 완료"
echo ""

# 사용자 입력 받기
read -p "프론트엔드 URL (예: https://your-frontend.com): " FRONTEND_URL
read -p "관리자 이메일 (쉼표로 구분): " ADMIN_EMAILS
read -p "이메일 계정 (Gmail): " EMAIL_USER
read -sp "이메일 앱 비밀번호: " EMAIL_PASS
echo ""

# SESSION_SECRET 자동 생성
SESSION_SECRET=$(openssl rand -base64 32)
echo "✅ SESSION_SECRET 자동 생성 완료"

# 필수 Secrets 설정
echo ""
echo "📝 필수 Secrets 설정 중..."

gh secret set FRONTEND_URL --body "$FRONTEND_URL"
gh secret set SESSION_SECRET --body "$SESSION_SECRET"
gh secret set EMAIL_USER --body "$EMAIL_USER"
gh secret set EMAIL_PASS --body "$EMAIL_PASS"
gh secret set ADMIN_EMAILS --body "$ADMIN_EMAILS"

echo "✅ 필수 Secrets 설정 완료"

# Google OAuth (선택사항)
echo ""
read -p "Google OAuth를 설정하시겠습니까? (y/N): " setup_google

if [[ "$setup_google" =~ ^[Yy]$ ]]; then
    read -p "Google Client ID: " GOOGLE_CLIENT_ID
    read -sp "Google Client Secret: " GOOGLE_CLIENT_SECRET
    echo ""

    gh secret set GOOGLE_CLIENT_ID --body "$GOOGLE_CLIENT_ID"
    gh secret set GOOGLE_CLIENT_SECRET --body "$GOOGLE_CLIENT_SECRET"
    echo "✅ Google OAuth Secrets 설정 완료"
fi

# Apple OAuth (선택사항)
echo ""
read -p "Apple OAuth를 설정하시겠습니까? (y/N): " setup_apple

if [[ "$setup_apple" =~ ^[Yy]$ ]]; then
    read -p "Apple Client ID: " APPLE_CLIENT_ID
    read -p "Apple Team ID: " APPLE_TEAM_ID
    read -p "Apple Key ID: " APPLE_KEY_ID
    read -p "Apple Private Key 파일 경로: " APPLE_KEY_FILE

    gh secret set APPLE_CLIENT_ID --body "$APPLE_CLIENT_ID"
    gh secret set APPLE_TEAM_ID --body "$APPLE_TEAM_ID"
    gh secret set APPLE_KEY_ID --body "$APPLE_KEY_ID"

    if [ -f "$APPLE_KEY_FILE" ]; then
        gh secret set APPLE_PRIVATE_KEY < "$APPLE_KEY_FILE"
        echo "✅ Apple OAuth Secrets 설정 완료"
    else
        echo "❌ Apple Private Key 파일을 찾을 수 없습니다: $APPLE_KEY_FILE"
    fi
fi

# Grafana (선택사항)
echo ""
read -p "Grafana 관리자 계정을 설정하시겠습니까? (y/N): " setup_grafana

if [[ "$setup_grafana" =~ ^[Yy]$ ]]; then
    GRAFANA_USER="admin"
    GRAFANA_PASS=$(openssl rand -base64 16)

    gh secret set GRAFANA_ADMIN_USER --body "$GRAFANA_USER"
    gh secret set GRAFANA_ADMIN_PASSWORD --body "$GRAFANA_PASS"

    echo "✅ Grafana Secrets 설정 완료"
    echo "   사용자명: $GRAFANA_USER"
    echo "   비밀번호: $GRAFANA_PASS"
    echo "   ⚠️  비밀번호를 안전한 곳에 보관하세요!"
fi

# SSH 배포 설정 (선택사항)
echo ""
read -p "SSH 배포를 설정하시겠습니까? (y/N): " setup_ssh

if [[ "$setup_ssh" =~ ^[Yy]$ ]]; then
    read -p "서버 호스트 (IP 또는 도메인): " SERVER_HOST
    read -p "서버 사용자명: " SERVER_USERNAME
    read -p "서버 포트 (기본값: 22): " SERVER_PORT
    SERVER_PORT=${SERVER_PORT:-22}
    read -p "배포 경로 (기본값: /opt/livelink): " DEPLOY_PATH
    DEPLOY_PATH=${DEPLOY_PATH:-/opt/livelink}
    read -p "SSH Private Key 파일 경로 (예: ~/.ssh/id_rsa): " SSH_KEY_FILE

    gh secret set SERVER_HOST --body "$SERVER_HOST"
    gh secret set SERVER_USERNAME --body "$SERVER_USERNAME"
    gh secret set SERVER_PORT --body "$SERVER_PORT"
    gh secret set DEPLOY_PATH --body "$DEPLOY_PATH"

    if [ -f "${SSH_KEY_FILE/#\~/$HOME}" ]; then
        gh secret set SSH_PRIVATE_KEY < "${SSH_KEY_FILE/#\~/$HOME}"
        echo "✅ SSH 배포 Secrets 설정 완료"
    else
        echo "❌ SSH Private Key 파일을 찾을 수 없습니다: $SSH_KEY_FILE"
    fi
fi

# 최종 확인
echo ""
echo "======================================"
echo "✅ GitHub Secrets 설정 완료!"
echo "======================================"
echo ""
echo "설정된 Secrets 목록:"
gh secret list

echo ""
echo "📌 다음 단계:"
echo "1. GitHub Actions 워크플로우 확인: .github/workflows/cd.yml"
echo "2. SSH 배포를 활성화하려면 cd.yml에서 'if: false'를 'if: true'로 변경"
echo "3. git push로 배포 테스트"
echo ""
echo "📚 자세한 내용은 docs/CICD_SETUP.md 참고"
