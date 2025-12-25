#!/bin/bash
# Docker build and push script

echo "🐳 Building Docker image..."

# Build image
docker-compose build

# Tag for registry
docker tag livelink_be:latest ghcr.io/everydayfirefriday/livelink_be:latest

# Push to registry (requires authentication)
docker push ghcr.io/everydayfirefriday/livelink_be:latest

echo "✅ Docker build and push complete!"
