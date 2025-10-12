#!/bin/bash
# develop deployment script

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting deployment..."

# Navigate to project root
cd "$PROJECT_DIR"

# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Restart with PM2
pm2 restart ecosystem.config.js --env develop

echo "✅ Deployment complete!"
