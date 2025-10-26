#!/bin/bash
# Deployment script with environment support (development, staging, production)

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

# Environment (default: development)
ENV="${1:-development}"
BRANCH="${2:-main}"

# Validate environment
if [[ ! "$ENV" =~ ^(development|staging|production)$ ]]; then
  echo -e "${RED}❌ Invalid environment: $ENV${NC}"
  echo "Usage: $0 [development|staging|production] [branch]"
  exit 1
fi

echo -e "${BLUE}🚀 Starting deployment for ${YELLOW}$ENV${BLUE} environment...${NC}"

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

# 2. Backup (production only)
if [ "$ENV" = "production" ]; then
  BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
  echo -e "${BLUE}💾 Creating backup...${NC}"
  mkdir -p "$BACKUP_DIR"
  cp -r dist "$BACKUP_DIR/" 2>/dev/null || true
  echo -e "${GREEN}✓ Backup created at $BACKUP_DIR${NC}"
fi

# 3. Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci --production=false

# 4. Run linter
echo -e "${BLUE}🔍 Running linter...${NC}"
npm run lint || {
  echo -e "${YELLOW}⚠️  Linter warnings found, but continuing...${NC}"
}

# 5. Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build

# Check if build succeeded
if [ ! -f "dist/app.js" ]; then
  echo -e "${RED}❌ Build failed! dist/app.js not found${NC}"
  exit 1
fi

# 6. Environment setup
if [ -f ".env.$ENV" ]; then
  echo -e "${BLUE}🔧 Loading environment from .env.$ENV${NC}"
  cp ".env.$ENV" ".env"
elif [ "$ENV" != "development" ]; then
  echo -e "${YELLOW}⚠️  .env.$ENV not found, using existing .env${NC}"
fi

# 7. Database migration (production only)
if [ "$ENV" = "production" ]; then
  echo -e "${BLUE}🗃️  Running database migrations...${NC}"
  npm run migrate:up || {
    echo -e "${YELLOW}⚠️  Migration warnings, but continuing...${NC}"
  }
fi

# 8. PM2 deployment
echo -e "${BLUE}🔄 Deploying with PM2...${NC}"

if pm2 describe livelink-backend > /dev/null 2>&1; then
  echo -e "${BLUE}   Reloading existing PM2 process...${NC}"
  pm2 reload ecosystem.config.js --env "$ENV" --update-env
else
  echo -e "${BLUE}   Starting new PM2 process...${NC}"
  pm2 start ecosystem.config.js --env "$ENV"
fi

# 9. Save PM2 process list
pm2 save

# 10. Show status
echo -e "\n${GREEN}✅ Deployment complete!${NC}\n"
pm2 status
pm2 logs livelink-backend --lines 20 --nostream

# 11. Health check
echo -e "\n${BLUE}🏥 Running health check...${NC}"
sleep 3

if curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}❌ Health check failed${NC}"
  echo -e "${YELLOW}⚠️  Please check logs: pm2 logs livelink-backend${NC}"
  exit 1
fi

echo -e "\n${GREEN}🎉 Deployment successful!${NC}"
echo -e "${BLUE}Environment: ${YELLOW}$ENV${NC}"
echo -e "${BLUE}Commit: ${YELLOW}$CURRENT_COMMIT${NC}"
echo -e "${BLUE}Time: ${YELLOW}$(date)${NC}\n"
