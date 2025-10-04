#!/bin/bash

# .env 파일 설정 스크립트
# 사용법: ./scripts/setup-env.sh [development|production]

set -e

ENV_TYPE="${1:-development}"

echo "🔧 .env 파일 설정 시작..."
echo "환경: $ENV_TYPE"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 환경별 파일 이름
if [ "$ENV_TYPE" = "production" ]; then
    ENV_FILE=".env.production"
    EXAMPLE_FILE=".env.example"
else
    ENV_FILE=".env"
    EXAMPLE_FILE=".env.example"
fi

# .env.example 파일 확인
if [ ! -f "$EXAMPLE_FILE" ]; then
    echo -e "${RED}❌ $EXAMPLE_FILE 파일을 찾을 수 없습니다.${NC}"
    exit 1
fi

# 백업
if [ -f "$ENV_FILE" ]; then
    BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ 기존 파일 백업: $BACKUP_FILE${NC}"
fi

# 대화형 모드 선택
echo ""
echo "설정 모드를 선택하세요:"
echo "1) 대화형 모드 (각 값 입력)"
echo "2) 빠른 모드 (필수 값만 입력)"
echo "3) .env.example 복사 (수동 편집)"
read -p "선택 (1-3): " MODE

case $MODE in
    1)
        # 대화형 모드
        echo ""
        echo "=== 대화형 모드 ==="
        echo "각 환경 변수 값을 입력하세요 (Enter: 기본값 사용)"
        echo ""

        # Application
        echo -e "${YELLOW}[애플리케이션 설정]${NC}"
        read -p "NODE_ENV ($ENV_TYPE): " NODE_ENV
        NODE_ENV=${NODE_ENV:-$ENV_TYPE}

        read -p "PORT (3000): " PORT
        PORT=${PORT:-3000}

        read -p "프론트엔드 URL: " FRONTEND_URL
        FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}

        # Session
        echo ""
        echo -e "${YELLOW}[세션 설정]${NC}"
        read -sp "SESSION_SECRET (Enter=자동생성): " SESSION_SECRET
        echo ""
        if [ -z "$SESSION_SECRET" ]; then
            SESSION_SECRET=$(openssl rand -base64 32)
            echo -e "${GREEN}✅ SESSION_SECRET 자동 생성${NC}"
        fi

        read -p "SESSION_MAX_AGE (86400000=24시간): " SESSION_MAX_AGE
        SESSION_MAX_AGE=${SESSION_MAX_AGE:-86400000}

        read -p "COOKIE_DOMAIN (Enter=미설정): " COOKIE_DOMAIN

        read -p "COOKIE_SAMESITE (lax/strict/none, 기본=lax): " COOKIE_SAMESITE
        COOKIE_SAMESITE=${COOKIE_SAMESITE:-lax}

        # Database
        echo ""
        echo -e "${YELLOW}[데이터베이스 설정]${NC}"
        read -p "MONGO_URI (mongodb://localhost:27017/livelink): " MONGO_URI
        MONGO_URI=${MONGO_URI:-mongodb://localhost:27017/livelink}

        read -p "REDIS_URL (redis://localhost:6379): " REDIS_URL
        REDIS_URL=${REDIS_URL:-redis://localhost:6379}

        # Email
        echo ""
        echo -e "${YELLOW}[이메일 설정]${NC}"
        read -p "EMAIL_SERVICE (gmail): " EMAIL_SERVICE
        EMAIL_SERVICE=${EMAIL_SERVICE:-gmail}

        read -p "EMAIL_USER: " EMAIL_USER
        read -sp "EMAIL_PASS: " EMAIL_PASS
        echo ""

        # Admin
        echo ""
        echo -e "${YELLOW}[관리자 설정]${NC}"
        read -p "ADMIN_EMAILS (쉼표로 구분): " ADMIN_EMAILS

        # Logging
        echo ""
        echo -e "${YELLOW}[로깅 설정]${NC}"
        read -p "LOG_LEVEL (info): " LOG_LEVEL
        LOG_LEVEL=${LOG_LEVEL:-info}

        # OAuth
        echo ""
        read -p "Google OAuth 설정? (y/N): " SETUP_GOOGLE
        if [[ "$SETUP_GOOGLE" =~ ^[Yy]$ ]]; then
            read -p "GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
            read -sp "GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
            echo ""
        else
            GOOGLE_CLIENT_ID=""
            GOOGLE_CLIENT_SECRET=""
        fi

        read -p "Apple OAuth 설정? (y/N): " SETUP_APPLE
        if [[ "$SETUP_APPLE" =~ ^[Yy]$ ]]; then
            read -p "APPLE_CLIENT_ID: " APPLE_CLIENT_ID
            read -p "APPLE_TEAM_ID: " APPLE_TEAM_ID
            read -p "APPLE_KEY_ID: " APPLE_KEY_ID
            read -p "APPLE_PRIVATE_KEY: " APPLE_PRIVATE_KEY
        else
            APPLE_CLIENT_ID=""
            APPLE_TEAM_ID=""
            APPLE_KEY_ID=""
            APPLE_PRIVATE_KEY=""
        fi

        # Rate Limiting
        echo ""
        echo -e "${YELLOW}[Rate Limiting 설정]${NC}"
        read -p "기본 제한 (1분당, 기본=100): " API_LIMIT_DEFAULT_MAX
        API_LIMIT_DEFAULT_MAX=${API_LIMIT_DEFAULT_MAX:-100}

        # Grafana
        echo ""
        read -p "Grafana 설정? (y/N): " SETUP_GRAFANA
        if [[ "$SETUP_GRAFANA" =~ ^[Yy]$ ]]; then
            read -p "GRAFANA_ADMIN_USER (admin): " GRAFANA_ADMIN_USER
            GRAFANA_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
            read -sp "GRAFANA_ADMIN_PASSWORD (Enter=자동생성): " GRAFANA_ADMIN_PASSWORD
            echo ""
            if [ -z "$GRAFANA_ADMIN_PASSWORD" ]; then
                GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 16)
                echo -e "${GREEN}✅ GRAFANA_ADMIN_PASSWORD 자동 생성: $GRAFANA_ADMIN_PASSWORD${NC}"
            fi
        else
            GRAFANA_ADMIN_USER=""
            GRAFANA_ADMIN_PASSWORD=""
        fi

        # .env 파일 생성
        cat > "$ENV_FILE" << EOF
# Application
NODE_ENV=$NODE_ENV
PORT=$PORT
FRONTEND_URL=$FRONTEND_URL

# Session and Cookie
SESSION_SECRET=$SESSION_SECRET
SESSION_MAX_AGE=$SESSION_MAX_AGE
COOKIE_DOMAIN=$COOKIE_DOMAIN
COOKIE_SAMESITE=$COOKIE_SAMESITE

# Brute-force Protection
BRUTE_FORCE_MAX_ATTEMPTS=10
BRUTE_FORCE_BLOCK_DURATION=1800

# MongoDB
MONGO_URI=$MONGO_URI

# Redis
REDIS_URL=$REDIS_URL

# Email Service
EMAIL_SERVICE=$EMAIL_SERVICE
EMAIL_USER=$EMAIL_USER
EMAIL_PASS=$EMAIL_PASS

# Admin Users
ADMIN_EMAILS=$ADMIN_EMAILS

# Logging
LOG_LEVEL=$LOG_LEVEL

# Google OAuth
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET

# Apple OAuth
APPLE_CLIENT_ID=$APPLE_CLIENT_ID
APPLE_TEAM_ID=$APPLE_TEAM_ID
APPLE_KEY_ID=$APPLE_KEY_ID
APPLE_PRIVATE_KEY=$APPLE_PRIVATE_KEY

# API Rate Limiting
API_LIMIT_DEFAULT_WINDOW_MS=60000
API_LIMIT_DEFAULT_MAX=$API_LIMIT_DEFAULT_MAX
API_LIMIT_STRICT_WINDOW_MS=60000
API_LIMIT_STRICT_MAX=20
API_LIMIT_RELAXED_WINDOW_MS=60000
API_LIMIT_RELAXED_MAX=200

# Grafana
GRAFANA_ADMIN_USER=$GRAFANA_ADMIN_USER
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
EOF
        ;;

    2)
        # 빠른 모드
        echo ""
        echo "=== 빠른 모드 ==="
        echo "필수 값만 입력하세요"
        echo ""

        read -p "프론트엔드 URL: " FRONTEND_URL
        read -p "관리자 이메일 (쉼표로 구분): " ADMIN_EMAILS
        read -p "이메일 계정: " EMAIL_USER
        read -sp "이메일 비밀번호: " EMAIL_PASS
        echo ""

        SESSION_SECRET=$(openssl rand -base64 32)

        cp "$EXAMPLE_FILE" "$ENV_FILE"

        # sed를 사용하여 값 교체
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|" "$ENV_FILE"
            sed -i '' "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" "$ENV_FILE"
            sed -i '' "s|EMAIL_USER=.*|EMAIL_USER=$EMAIL_USER|" "$ENV_FILE"
            sed -i '' "s|EMAIL_PASS=.*|EMAIL_PASS=$EMAIL_PASS|" "$ENV_FILE"
            sed -i '' "s|ADMIN_EMAILS=.*|ADMIN_EMAILS=$ADMIN_EMAILS|" "$ENV_FILE"
        else
            # Linux
            sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|" "$ENV_FILE"
            sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" "$ENV_FILE"
            sed -i "s|EMAIL_USER=.*|EMAIL_USER=$EMAIL_USER|" "$ENV_FILE"
            sed -i "s|EMAIL_PASS=.*|EMAIL_PASS=$EMAIL_USER|" "$ENV_FILE"
            sed -i "s|ADMIN_EMAILS=.*|ADMIN_EMAILS=$ADMIN_EMAILS|" "$ENV_FILE"
        fi

        echo -e "${GREEN}✅ SESSION_SECRET 자동 생성${NC}"
        ;;

    3)
        # .env.example 복사
        cp "$EXAMPLE_FILE" "$ENV_FILE"
        echo -e "${GREEN}✅ $EXAMPLE_FILE을(를) $ENV_FILE(으)로 복사했습니다.${NC}"
        echo -e "${YELLOW}⚠️  파일을 직접 편집하여 값을 설정하세요.${NC}"
        ;;

    *)
        echo -e "${RED}❌ 잘못된 선택${NC}"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo -e "${GREEN}✅ $ENV_FILE 생성 완료!${NC}"
echo "======================================"

# 파일 권한 설정
chmod 600 "$ENV_FILE"
echo -e "${GREEN}✅ 파일 권한 설정 (600)${NC}"

# 검증
echo ""
echo "생성된 환경 변수 확인 (민감한 값은 마스킹됨):"
echo ""

# 키만 추출하여 표시
grep -v '^#' "$ENV_FILE" | grep -v '^$' | while IFS='=' read -r key value; do
    if [[ "$key" =~ (SECRET|PASS|PASSWORD|KEY|TOKEN) ]]; then
        echo "  $key=***MASKED***"
    else
        echo "  $key=$value"
    fi
done

echo ""
echo "📌 다음 단계:"
echo "1. $ENV_FILE 파일 확인 및 수정 (필요시)"
echo "2. 민감한 정보가 .gitignore에 포함되어 있는지 확인"
echo "3. npm run dev 또는 docker-compose up으로 서버 시작"

if [ "$ENV_TYPE" = "production" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  프로덕션 환경 주의사항:${NC}"
    echo "  - SESSION_SECRET는 반드시 강력한 랜덤 문자열을 사용하세요"
    echo "  - 데이터베이스 접속 정보를 실제 프로덕션 서버로 변경하세요"
    echo "  - .env.production 파일은 절대 Git에 커밋하지 마세요"
fi
