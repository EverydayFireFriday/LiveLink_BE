#!/bin/bash
# Redis 세션 키 확인 스크립트

echo "=== Redis 세션 키 확인 ==="
echo ""

# Redis 컨테이너가 실행 중인지 확인
if ! docker ps | grep -q livelink-redis; then
    echo "❌ Redis 컨테이너가 실행 중이 아닙니다."
    exit 1
fi

# 모든 세션 키 조회
echo "📋 현재 저장된 세션 키 목록:"
docker exec livelink-redis redis-cli -a changeme KEYS "app:sess:*" 2>/dev/null

echo ""
echo "📊 세션 개수:"
docker exec livelink-redis redis-cli -a changeme KEYS "app:sess:*" 2>/dev/null | wc -l

echo ""
echo "🔍 세션 상세 정보:"
for key in $(docker exec livelink-redis redis-cli -a changeme KEYS "app:sess:*" 2>/dev/null); do
    echo "  Key: $key"
    docker exec livelink-redis redis-cli -a changeme GET "$key" 2>/dev/null | head -c 200
    echo "..."
    echo ""
done
