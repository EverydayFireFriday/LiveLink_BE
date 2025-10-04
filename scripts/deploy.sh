#!/bin/bash
# Production deployment script

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (parent of scripts/)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting deployment..."

# Change to project root
cd "$PROJECT_ROOT"

# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Restart with PM2
pm2 restart "$PROJECT_ROOT/config/ecosystem.config.js" --env production

echo "✅ Deployment complete!"
