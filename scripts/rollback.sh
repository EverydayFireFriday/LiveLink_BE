#!/bin/bash
# Rollback script - 이전 버전으로 롤백

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

cd "$PROJECT_DIR"

echo -e "${BLUE}🔄 Starting rollback...${NC}\n"

# List available backups
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR)" ]; then
  echo -e "${RED}❌ No backups found in $BACKUP_DIR${NC}"
  exit 1
fi

echo -e "${BLUE}Available backups:${NC}"
BACKUPS=($(ls -1 "$BACKUP_DIR" | sort -r))
for i in "${!BACKUPS[@]}"; do
  echo -e "${YELLOW}$((i+1)). ${BACKUPS[$i]}${NC}"
done

# Select backup
echo -e "\n${BLUE}Enter backup number to restore (or 'q' to quit):${NC} "
read -r selection

if [ "$selection" = "q" ]; then
  echo -e "${YELLOW}Rollback cancelled${NC}"
  exit 0
fi

if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt "${#BACKUPS[@]}" ]; then
  echo -e "${RED}❌ Invalid selection${NC}"
  exit 1
fi

SELECTED_BACKUP="${BACKUPS[$((selection-1))]}"
BACKUP_PATH="$BACKUP_DIR/$SELECTED_BACKUP"

echo -e "${BLUE}📦 Rolling back to: ${YELLOW}$SELECTED_BACKUP${NC}"

# Confirm
echo -e "${YELLOW}⚠️  This will replace the current dist directory. Continue? (y/N):${NC} "
read -r confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo -e "${YELLOW}Rollback cancelled${NC}"
  exit 0
fi

# Backup current version before rollback
CURRENT_BACKUP="$BACKUP_DIR/pre_rollback_$(date +%Y%m%d_%H%M%S)"
echo -e "${BLUE}💾 Backing up current version to $CURRENT_BACKUP${NC}"
mkdir -p "$CURRENT_BACKUP"
cp -r dist "$CURRENT_BACKUP/" 2>/dev/null || true

# Restore backup
echo -e "${BLUE}📦 Restoring backup...${NC}"
rm -rf dist
cp -r "$BACKUP_PATH/dist" .

# Restart PM2
echo -e "${BLUE}🔄 Restarting PM2...${NC}"
pm2 restart ecosystem.config.js

# Show status
echo -e "\n${GREEN}✅ Rollback complete!${NC}\n"
pm2 status

echo -e "${GREEN}🎉 Successfully rolled back to $SELECTED_BACKUP${NC}"
echo -e "${BLUE}Current version backed up to: ${YELLOW}$CURRENT_BACKUP${NC}\n"
