#!/bin/bash

# GitHub Secrets와 로컬 .env 동기화 스크립트
# 사용법:
#   로컬 → GitHub: ./scripts/sync-env.sh to-github [.env 파일]
#   GitHub → 로컬: ./scripts/sync-env.sh from-github [출력 파일]

set -e

MODE="${1}"
ENV_FILE="${2:-.env.production}"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# GitHub CLI 확인
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI가 설치되어 있지 않습니다.${NC}"
        echo "   설치: https://cli.github.com/"
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        echo -e "${RED}❌ GitHub에 로그인되어 있지 않습니다.${NC}"
        gh auth login
    fi
}

# .env → GitHub Secrets
sync_to_github() {
    echo "🔄 로컬 .env → GitHub Secrets 동기화"
    echo "대상 파일: $ENV_FILE"
    echo ""

    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ $ENV_FILE 파일을 찾을 수 없습니다.${NC}"
        exit 1
    fi

    check_gh_cli

    # 확인
    echo -e "${YELLOW}⚠️  경고: GitHub Secrets가 덮어씌워집니다!${NC}"
    read -p "계속하시겠습니까? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "취소되었습니다."
        exit 0
    fi

    echo ""
    echo "동기화 시작..."
    echo ""

    # .env 파일에서 환경 변수 추출 및 업로드
    COUNT=0
    while IFS='=' read -r key value; do
        # 주석과 빈 줄 건너뛰기
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue

        # 값의 앞뒤 공백 제거 및 따옴표 제거
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

        # 빈 값은 건너뛰기
        if [ -z "$value" ]; then
            echo -e "${YELLOW}⚠️  $key: 값이 비어있어 건너뜁니다${NC}"
            continue
        fi

        # GitHub Secret 생성/업데이트
        if gh secret set "$key" --body "$value" 2>/dev/null; then
            if [[ "$key" =~ (SECRET|PASS|PASSWORD|KEY|TOKEN) ]]; then
                echo -e "${GREEN}✅ $key: ***MASKED***${NC}"
            else
                echo -e "${GREEN}✅ $key${NC}"
            fi
            ((COUNT++))
        else
            echo -e "${RED}❌ $key: 업로드 실패${NC}"
        fi
    done < "$ENV_FILE"

    echo ""
    echo "======================================"
    echo -e "${GREEN}✅ $COUNT개 Secret 동기화 완료!${NC}"
    echo "======================================"
}

# GitHub Secrets → .env
sync_from_github() {
    echo "🔄 GitHub Secrets → 로컬 .env 동기화"
    echo "출력 파일: $ENV_FILE"
    echo ""

    check_gh_cli

    # 백업
    if [ -f "$ENV_FILE" ]; then
        BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$ENV_FILE" "$BACKUP_FILE"
        echo -e "${GREEN}✅ 기존 파일 백업: $BACKUP_FILE${NC}"
    fi

    echo "GitHub Secrets 가져오는 중..."
    echo ""

    # Secret 목록 가져오기
    SECRETS=$(gh secret list --json name -q '.[].name')

    if [ -z "$SECRETS" ]; then
        echo -e "${YELLOW}⚠️  설정된 Secret이 없습니다.${NC}"
        exit 0
    fi

    # .env 파일 헤더
    cat > "$ENV_FILE" << 'EOF'
# Generated from GitHub Secrets
# Generated at:
EOF
    date >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"

    # 카테고리별로 Secret 그룹화
    declare -A CATEGORIES=(
        ["APP"]="NODE_ENV PORT FRONTEND_URL"
        ["SESSION"]="SESSION_SECRET SESSION_MAX_AGE COOKIE_DOMAIN COOKIE_SAMESITE"
        ["DATABASE"]="MONGO_URI REDIS_URL"
        ["EMAIL"]="EMAIL_SERVICE EMAIL_USER EMAIL_PASS"
        ["ADMIN"]="ADMIN_EMAILS"
        ["OAUTH_GOOGLE"]="GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET"
        ["OAUTH_APPLE"]="APPLE_CLIENT_ID APPLE_TEAM_ID APPLE_KEY_ID APPLE_PRIVATE_KEY"
        ["RATE_LIMIT"]="API_LIMIT_DEFAULT_WINDOW_MS API_LIMIT_DEFAULT_MAX API_LIMIT_STRICT_WINDOW_MS API_LIMIT_STRICT_MAX API_LIMIT_RELAXED_WINDOW_MS API_LIMIT_RELAXED_MAX"
        ["GRAFANA"]="GRAFANA_ADMIN_USER GRAFANA_ADMIN_PASSWORD"
        ["DEPLOY"]="SERVER_HOST SERVER_USERNAME SERVER_PORT DEPLOY_PATH"
    )

    # 각 카테고리별로 처리
    for category in "${!CATEGORIES[@]}"; do
        FOUND=false
        TEMP_OUTPUT=""

        for key in ${CATEGORIES[$category]}; do
            if echo "$SECRETS" | grep -q "^${key}$"; then
                if [ "$FOUND" = false ]; then
                    TEMP_OUTPUT+="# $category\n"
                    FOUND=true
                fi

                # Secret은 직접 가져올 수 없으므로 플레이스홀더 사용
                TEMP_OUTPUT+="${key}=<SET_IN_GITHUB_SECRETS>\n"
                echo -e "${GREEN}✅ $key${NC}"
            fi
        done

        if [ "$FOUND" = true ]; then
            echo -e "$TEMP_OUTPUT" >> "$ENV_FILE"
            echo "" >> "$ENV_FILE"
        fi
    done

    # 카테고리에 없는 나머지 Secret 처리
    echo "# OTHER" >> "$ENV_FILE"
    while IFS= read -r key; do
        # 이미 처리된 Secret인지 확인
        PROCESSED=false
        for category_keys in "${CATEGORIES[@]}"; do
            if echo "$category_keys" | grep -wq "$key"; then
                PROCESSED=true
                break
            fi
        done

        if [ "$PROCESSED" = false ]; then
            echo "${key}=<SET_IN_GITHUB_SECRETS>" >> "$ENV_FILE"
            echo -e "${GREEN}✅ $key${NC}"
        fi
    done <<< "$SECRETS"

    # 파일 권한 설정
    chmod 600 "$ENV_FILE"

    echo ""
    echo "======================================"
    echo -e "${GREEN}✅ Secret 목록 동기화 완료!${NC}"
    echo "======================================"
    echo ""
    echo -e "${YELLOW}⚠️  주의: Secret 값은 보안상 GitHub에서 직접 가져올 수 없습니다.${NC}"
    echo "   파일에 플레이스홀더가 삽입되었습니다."
    echo "   실제 값은 GitHub Secrets 페이지에서 확인하세요."
}

# 도움말
show_help() {
    echo "사용법:"
    echo "  $0 to-github [.env 파일]     # 로컬 .env → GitHub Secrets"
    echo "  $0 from-github [출력 파일]   # GitHub Secrets → 로컬 .env (템플릿)"
    echo ""
    echo "예시:"
    echo "  $0 to-github .env.production"
    echo "  $0 from-github .env.production"
}

# 메인
case "$MODE" in
    to-github)
        sync_to_github
        ;;
    from-github)
        sync_from_github
        ;;
    *)
        echo -e "${RED}❌ 잘못된 모드: $MODE${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
