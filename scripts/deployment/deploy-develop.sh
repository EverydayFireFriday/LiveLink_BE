#!/bin/bash
# Develop (Staging) Deployment Script

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Fixed environment and branch
ENV="staging"
BRANCH="develop"

echo -e "${BLUE}🚀 Starting deployment for ${YELLOW}DEVELOP${BLUE} (Staging) environment...${NC}"
echo -e "${BLUE}Branch: ${YELLOW}$BRANCH${NC}\n"

# Navigate to project root
cd "$PROJECT_DIR"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo -e "${RED}❌ PM2 is not installed. Please install it: npm install -g pm2${NC}"
  exit 1
fi

# 1. Git operations
echo -e "${BLUE}📦 Pulling latest changes from ${YELLOW}$BRANCH${BLUE} branch...${NC}"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Show current commit
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo -e "${GREEN}✓ Current commit: $CURRENT_COMMIT${NC}"

# 2. Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci --production=false

# 3. Run linter
echo -e "${BLUE}🔍 Running linter...${NC}"
npm run lint || {
  echo -e "${YELLOW}⚠️  Linter warnings found, but continuing...${NC}"
}

# 4. Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build

# Check if build succeeded
if [ ! -f "dist/app.js" ]; then
  echo -e "${RED}❌ Build failed! dist/app.js not found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Build completed successfully${NC}"

# 5. Environment setup
if [ -f ".env.staging" ]; then
  echo -e "${BLUE}🔧 Loading environment from .env.staging${NC}"
  cp ".env.staging" ".env"
elif [ -f ".env.development" ]; then
  echo -e "${BLUE}🔧 Loading environment from .env.development${NC}"
  cp ".env.development" ".env"
else
  echo -e "${YELLOW}⚠️  .env.staging or .env.development not found, using existing .env${NC}"
fi

# 6. PM2 deployment
echo -e "${BLUE}🔄 Deploying with PM2...${NC}"

if pm2 describe livelink-backend > /dev/null 2>&1; then
  echo -e "${BLUE}   Reloading existing PM2 process...${NC}"
  pm2 reload ecosystem.config.js --env staging --update-env
else
  echo -e "${BLUE}   Starting new PM2 process...${NC}"
  pm2 start ecosystem.config.js --env staging
fi

# 7. Save PM2 process list
pm2 save

# 8. Show status
echo -e "\n${GREEN}✅ Deployment complete!${NC}\n"
pm2 status
pm2 logs livelink-backend --lines 20 --nostream

# 9. Health check
echo -e "\n${BLUE}🏥 Running health check...${NC}"
sleep 3

PORT="${PORT:-3000}"
if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${YELLOW}⚠️  Health check failed (this may be normal for staging)${NC}"
  echo -e "${YELLOW}   Check logs: pm2 logs livelink-backend${NC}"
fi

# Success message
echo -e "\n${GREEN}🎉 DEVELOP (Staging) Deployment successful!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Environment: ${YELLOW}STAGING${NC}"
echo -e "${BLUE}Commit: ${YELLOW}$CURRENT_COMMIT${NC}"
echo -e "${BLUE}Branch: ${YELLOW}$BRANCH${NC}"
echo -e "${BLUE}Time: ${YELLOW}$(date)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Show useful commands
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  pm2 logs livelink-backend     - View logs"
echo -e "  pm2 monit                      - Monitor processes"
echo -e "  pm2 restart livelink-backend   - Restart application"
echo -e "  pm2 stop livelink-backend      - Stop application\n"
