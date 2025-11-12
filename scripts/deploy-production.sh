#!/bin/bash
# Production Deployment Script

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
ENV="production"
BRANCH="main"

echo -e "${BLUE}🚀 Starting deployment for ${YELLOW}PRODUCTION${BLUE} environment...${NC}"
echo -e "${RED}⚠️  WARNING: This will deploy to PRODUCTION!${NC}"
echo -e "${BLUE}Branch: ${YELLOW}$BRANCH${NC}\n"

# Confirmation
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}Deployment cancelled.${NC}"
  exit 0
fi

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

# 2. Backup
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
echo -e "${BLUE}💾 Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp -r dist "$BACKUP_DIR/" 2>/dev/null || true
cp .env "$BACKUP_DIR/.env.backup" 2>/dev/null || true
echo -e "${GREEN}✓ Backup created at $BACKUP_DIR${NC}"

# 3. Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci --production=false

# 4. Validate environment file
if [ -f ".env.production" ]; then
  echo -e "${BLUE}🔍 Validating .env.production...${NC}"
  npm run env:validate:prod || {
    echo -e "${RED}❌ .env.production validation failed!${NC}"
    exit 1
  }
else
  echo -e "${RED}❌ .env.production not found!${NC}"
  exit 1
fi

# 5. Run linter
echo -e "${BLUE}🔍 Running linter...${NC}"
npm run lint || {
  echo -e "${YELLOW}⚠️  Linter warnings found, but continuing...${NC}"
}

# 6. Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build

# Check if build succeeded
if [ ! -f "dist/app.js" ]; then
  echo -e "${RED}❌ Build failed! dist/app.js not found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Build completed successfully${NC}"

# 7. Environment setup
echo -e "${BLUE}🔧 Loading environment from .env.production${NC}"
cp ".env.production" ".env"

# 8. Database migration
echo -e "${BLUE}🗃️  Running database migrations...${NC}"
npm run migrate:up || {
  echo -e "${YELLOW}⚠️  Migration warnings, but continuing...${NC}"
}

# 9. PM2 deployment
echo -e "${BLUE}🔄 Deploying with PM2...${NC}"

if pm2 describe livelink-backend > /dev/null 2>&1; then
  echo -e "${BLUE}   Reloading existing PM2 process...${NC}"
  pm2 reload ecosystem.config.js --env production --update-env
else
  echo -e "${BLUE}   Starting new PM2 process...${NC}"
  pm2 start ecosystem.config.js --env production
fi

# 10. Save PM2 process list
pm2 save

# 11. Show status
echo -e "\n${GREEN}✅ Deployment complete!${NC}\n"
pm2 status
pm2 logs livelink-backend --lines 20 --nostream

# 12. Health check
echo -e "\n${BLUE}🏥 Running health check...${NC}"
sleep 5

PORT="${PORT:-3000}"
if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}❌ Health check failed${NC}"
  echo -e "${YELLOW}⚠️  Please check logs: pm2 logs livelink-backend${NC}"
  echo -e "${YELLOW}⚠️  Rollback available at: $BACKUP_DIR${NC}"
  exit 1
fi

# Success message
echo -e "\n${GREEN}🎉 PRODUCTION Deployment successful!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Environment: ${YELLOW}PRODUCTION${NC}"
echo -e "${BLUE}Commit: ${YELLOW}$CURRENT_COMMIT${NC}"
echo -e "${BLUE}Branch: ${YELLOW}$BRANCH${NC}"
echo -e "${BLUE}Backup: ${YELLOW}$BACKUP_DIR${NC}"
echo -e "${BLUE}Time: ${YELLOW}$(date)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Show useful commands
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  pm2 logs livelink-backend     - View logs"
echo -e "  pm2 monit                      - Monitor processes"
echo -e "  pm2 restart livelink-backend   - Restart application"
echo -e "  ./scripts/rollback.sh          - Rollback deployment\n"
