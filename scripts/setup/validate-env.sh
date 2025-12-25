#!/bin/bash

# .env 파일 검증 스크립트
# 사용법: ./scripts/validate-env.sh [.env 파일 경로]

set -e

ENV_FILE="${1:-.env}"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 .env 파일 검증 시작..."
echo "대상 파일: $ENV_FILE"
echo ""

# 파일 존재 확인
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ $ENV_FILE 파일을 찾을 수 없습니다.${NC}"
    echo "   ./scripts/setup-env.sh 를 실행하여 파일을 생성하세요."
    exit 1
fi

# 필수 환경 변수 목록
REQUIRED_VARS=(
    "NODE_ENV"
    "PORT"
    "FRONTEND_URL"
    "SESSION_SECRET"
    "SESSION_MAX_AGE"
    "MONGO_URI"
    "REDIS_URL"
    "EMAIL_USER"
    "EMAIL_PASS"
    "ADMIN_EMAILS"
)

# 검증 통과 여부
ALL_VALID=true
WARNINGS=()

# .env 파일 로드 (export 없이)
set -a
source "$ENV_FILE" 2>/dev/null || true
set +a

echo "=== 필수 환경 변수 검증 ==="
echo ""

for var in "${REQUIRED_VARS[@]}"; do
    value="${!var}"

    if [ -z "$value" ]; then
        echo -e "${RED}❌ $var: 값이 설정되지 않았습니다${NC}"
        ALL_VALID=false
    else
        # 민감한 정보는 마스킹
        if [[ "$var" =~ (SECRET|PASS|PASSWORD|KEY|TOKEN) ]]; then
            echo -e "${GREEN}✅ $var: ***MASKED***${NC}"
        else
            echo -e "${GREEN}✅ $var: $value${NC}"
        fi

        # 특정 값에 대한 추가 검증
        case $var in
            SESSION_SECRET)
                if [ ${#value} -lt 32 ]; then
                    WARNINGS+=("⚠️  SESSION_SECRET는 최소 32자 이상을 권장합니다 (현재: ${#value}자)")
                fi
                if [[ "$value" == *"your"* ]] || [[ "$value" == *"change"* ]] || [[ "$value" == *"example"* ]]; then
                    echo -e "${RED}   ⚠️  기본값을 사용 중입니다. 반드시 변경하세요!${NC}"
                    ALL_VALID=false
                fi
                ;;

            PORT)
                if ! [[ "$value" =~ ^[0-9]+$ ]]; then
                    echo -e "${RED}   ❌ PORT는 숫자여야 합니다${NC}"
                    ALL_VALID=false
                fi
                ;;

            FRONTEND_URL)
                if [[ "$value" != http* ]]; then
                    echo -e "${YELLOW}   ⚠️  FRONTEND_URL은 http:// 또는 https://로 시작해야 합니다${NC}"
                    WARNINGS+=("FRONTEND_URL 형식 확인 필요")
                fi
                ;;

            EMAIL_USER)
                if [[ "$value" != *"@"* ]]; then
                    echo -e "${RED}   ❌ EMAIL_USER는 유효한 이메일 형식이어야 합니다${NC}"
                    ALL_VALID=false
                fi
                if [[ "$value" == *"your"* ]] || [[ "$value" == *"example"* ]]; then
                    echo -e "${RED}   ⚠️  기본값을 사용 중입니다. 반드시 변경하세요!${NC}"
                    ALL_VALID=false
                fi
                ;;

            ADMIN_EMAILS)
                if [[ "$value" == *"example.com"* ]]; then
                    WARNINGS+=("⚠️  ADMIN_EMAILS에 example.com이 포함되어 있습니다")
                fi
                ;;

            MONGO_URI)
                if [[ "$value" != mongodb* ]]; then
                    echo -e "${RED}   ❌ MONGO_URI는 mongodb:// 또는 mongodb+srv://로 시작해야 합니다${NC}"
                    ALL_VALID=false
                fi
                ;;

            REDIS_URL)
                if [[ "$value" != redis* ]]; then
                    echo -e "${RED}   ❌ REDIS_URL은 redis://로 시작해야 합니다${NC}"
                    ALL_VALID=false
                fi
                ;;
        esac
    fi
done

# 선택적 변수 검증
echo ""
echo "=== 선택적 환경 변수 검증 ==="
echo ""

OPTIONAL_VARS=(
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "APPLE_CLIENT_ID"
    "APPLE_TEAM_ID"
    "APPLE_KEY_ID"
    "APPLE_PRIVATE_KEY"
    "GRAFANA_ADMIN_USER"
    "GRAFANA_ADMIN_PASSWORD"
)

OAUTH_CONFIGURED=false

for var in "${OPTIONAL_VARS[@]}"; do
    value="${!var}"

    if [ -n "$value" ]; then
        if [[ "$var" =~ (SECRET|PASS|PASSWORD|KEY|TOKEN) ]]; then
            echo -e "${GREEN}✅ $var: ***CONFIGURED***${NC}"
        else
            echo -e "${GREEN}✅ $var: $value${NC}"
        fi

        # OAuth 설정 확인
        if [[ "$var" == "GOOGLE_CLIENT_ID" ]] || [[ "$var" == "APPLE_CLIENT_ID" ]]; then
            OAUTH_CONFIGURED=true
        fi
    else
        echo -e "${YELLOW}⚠️  $var: 설정되지 않음 (선택사항)${NC}"
    fi
done

# 보안 검증
echo ""
echo "=== 보안 검증 ==="
echo ""

# .env 파일 권한 확인
PERMS=$(stat -f "%Lp" "$ENV_FILE" 2>/dev/null || stat -c "%a" "$ENV_FILE" 2>/dev/null)
if [ "$PERMS" != "600" ] && [ "$PERMS" != "400" ]; then
    echo -e "${YELLOW}⚠️  파일 권한: $PERMS (권장: 600)${NC}"
    WARNINGS+=("chmod 600 $ENV_FILE 실행을 권장합니다")
else
    echo -e "${GREEN}✅ 파일 권한: $PERMS${NC}"
fi

# .gitignore 확인
if [ -f ".gitignore" ]; then
    if grep -q "^\.env$" .gitignore && grep -q "^\.env\.production$" .gitignore; then
        echo -e "${GREEN}✅ .gitignore: .env 파일들이 등록되어 있습니다${NC}"
    else
        echo -e "${RED}❌ .gitignore: .env 파일이 등록되어 있지 않습니다!${NC}"
        WARNINGS+=(".env 파일을 .gitignore에 추가하세요")
        ALL_VALID=false
    fi
else
    echo -e "${YELLOW}⚠️  .gitignore 파일을 찾을 수 없습니다${NC}"
fi

# 프로덕션 환경 추가 검증
if [ "$NODE_ENV" = "production" ]; then
    echo ""
    echo "=== 프로덕션 환경 추가 검증 ==="
    echo ""

    if [ "$FRONTEND_URL" = "http://localhost"* ]; then
        echo -e "${RED}❌ 프로덕션에서 localhost URL 사용 불가${NC}"
        ALL_VALID=false
    fi

    if [ "$COOKIE_SAMESITE" = "none" ] && [[ "$FRONTEND_URL" != "https://"* ]]; then
        echo -e "${YELLOW}⚠️  COOKIE_SAMESITE=none은 HTTPS 환경에서만 작동합니다${NC}"
        WARNINGS+=("HTTPS 설정 확인 필요")
    fi

    if [ ${#SESSION_SECRET} -lt 64 ]; then
        WARNINGS+=("⚠️  프로덕션에서는 SESSION_SECRET를 64자 이상 권장합니다")
    fi
fi

# OAuth 설정 일관성 확인
if [ -n "$GOOGLE_CLIENT_ID" ] && [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo -e "${RED}❌ GOOGLE_CLIENT_ID는 있지만 GOOGLE_CLIENT_SECRET가 없습니다${NC}"
    ALL_VALID=false
fi

if [ -n "$APPLE_CLIENT_ID" ] && ([ -z "$APPLE_TEAM_ID" ] || [ -z "$APPLE_KEY_ID" ] || [ -z "$APPLE_PRIVATE_KEY" ]); then
    echo -e "${RED}❌ Apple OAuth 설정이 불완전합니다${NC}"
    ALL_VALID=false
fi

# 경고 메시지 출력
if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "=== 경고 사항 ==="
    echo ""
    for warning in "${WARNINGS[@]}"; do
        echo -e "${YELLOW}$warning${NC}"
    done
fi

# 최종 결과
echo ""
echo "======================================"
if [ "$ALL_VALID" = true ]; then
    echo -e "${GREEN}✅ 검증 완료! 모든 필수 환경 변수가 올바르게 설정되었습니다.${NC}"

    if [ ${#WARNINGS[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  ${#WARNINGS[@]}개의 경고가 있습니다. 확인해주세요.${NC}"
    fi

    echo "======================================"
    exit 0
else
    echo -e "${RED}❌ 검증 실패! 위의 오류를 수정하세요.${NC}"
    echo "======================================"
    exit 1
fi
