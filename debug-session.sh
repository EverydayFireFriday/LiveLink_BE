#!/bin/bash
# 세션 디버깅 스크립트

echo "=== 세션 디버깅 정보 ==="
echo ""

# 1. MongoDB 세션 확인
echo "📊 MongoDB 세션:"
docker exec livelink-mongo mongosh -u admin -p changeme --quiet --eval "
  use livelink;
  db.user_sessions.find({}, {
    sessionId: 1,
    'deviceInfo.platform': 1,
    'deviceInfo.name': 1,
    createdAt: 1
  }).forEach(s => print(
    'SessionID: ' + s.sessionId.substring(0, 20) + '... | ' +
    'Platform: ' + s.deviceInfo.platform + ' | ' +
    'Device: ' + s.deviceInfo.name
  ));
  print('Total: ' + db.user_sessions.countDocuments());
"

echo ""

# 2. Redis 세션 확인
echo "📊 Redis 세션:"
sessions=$(docker exec livelink-redis redis-cli -a changeme KEYS "app:sess:*" 2>/dev/null)
count=$(echo "$sessions" | grep -c "app:sess:" || echo "0")
echo "Total: $count"
if [ "$count" -gt "0" ]; then
  echo "$sessions" | while read key; do
    if [ ! -z "$key" ]; then
      echo "  $key"
    fi
  done
fi

echo ""
echo "=== 비교 결과 ==="
echo "MongoDB와 Redis의 sessionId가 일치하는지 확인하세요."
