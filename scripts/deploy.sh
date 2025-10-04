#!/bin/bash
# Production deployment script

echo "🚀 Starting deployment..."

# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Restart with PM2
pm2 restart ../ecosystem.config.js --env devlop

echo "✅ Deployment complete!"
