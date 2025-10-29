#!/bin/bash
# 로그 모니터링 스크립트 - 색상과 필터링 지원

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 옵션
FILTER="${1:-all}"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       LiveLink Backend Log Viewer     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}\n"

case $FILTER in
  error|errors)
    echo -e "${RED}Watching ERROR logs only...${NC}\n"
    pm2 logs livelink-backend --raw | grep --color=always -E "error|Error|ERROR|❌|Failed"
    ;;
  auth)
    echo -e "${YELLOW}Watching AUTH logs only...${NC}\n"
    pm2 logs livelink-backend --raw | grep --color=always -E "Auth|login|BruteForce|Session"
    ;;
  fcm|notification|push)
    echo -e "${MAGENTA}Watching FCM/Notification logs only...${NC}\n"
    pm2 logs livelink-backend --raw | grep --color=always -E "FCM|notification|APNS|push"
    ;;
  concert)
    echo -e "${BLUE}Watching Concert logs only...${NC}\n"
    pm2 logs livelink-backend --raw | grep --color=always -E "Concert|concert|공연"
    ;;
  api|requests)
    echo -e "${GREEN}Watching API requests only...${NC}\n"
    pm2 logs livelink-backend --raw | grep --color=always -E "GET|POST|PUT|DELETE|PATCH"
    ;;
  all|*)
    echo -e "${CYAN}Watching ALL logs...${NC}\n"
    echo -e "${YELLOW}Available filters:${NC}"
    echo -e "  ${GREEN}./scripts/watch-logs.sh error${NC}        - Only errors"
    echo -e "  ${GREEN}./scripts/watch-logs.sh auth${NC}         - Only auth logs"
    echo -e "  ${GREEN}./scripts/watch-logs.sh fcm${NC}          - Only FCM/push logs"
    echo -e "  ${GREEN}./scripts/watch-logs.sh concert${NC}      - Only concert logs"
    echo -e "  ${GREEN}./scripts/watch-logs.sh api${NC}          - Only API requests"
    echo ""
    pm2 logs livelink-backend --raw
    ;;
esac
