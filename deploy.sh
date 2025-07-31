#!/bin/bash
set -e

BRANCH=${1:-main}
echo "🚀 $BRANCH 브랜치를 배포합니다..."

# 변경사항 스태시
git stash push -m "Deploy stash $(date)"

# 특정 브랜치 체크아웃
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# 의존성 설치 및 빌드
npm ci --production
npm run build

# PM2 재시작
pm2 restart livelink-backend

echo "✅ $BRANCH 배포 완료!"
