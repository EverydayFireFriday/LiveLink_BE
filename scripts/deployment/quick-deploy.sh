#!/bin/bash
# Quick deployment script - 빠른 배포 (테스트 및 백업 생략)

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV="${1:-development}"

echo -e "${BLUE}⚡ Quick deployment for $ENV...${NC}"

cd "$PROJECT_DIR"

# Pull, build, restart
git pull origin main && \
npm ci && \
npm run build && \
pm2 reload ecosystem.config.js --env "$ENV"

echo -e "${GREEN}✅ Quick deployment complete!${NC}"
pm2 status
