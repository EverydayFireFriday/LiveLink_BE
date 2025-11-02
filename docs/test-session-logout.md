# 세션 로그아웃 테스트 가이드

## 📋 테스트 시나리오

### 시나리오 1: 웹에서 재로그인
1. **첫 번째 로그인 (웹)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -H "X-Platform: web" \
     -c cookies1.txt \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

   **응답 확인:**
   - `warning` 필드가 없어야 함 (첫 로그인이므로)
   - `sessionId`를 메모해두기

2. **활성 세션 조회**
   ```bash
   curl -X GET http://localhost:3000/api/v1/auth/sessions \
     -H "X-Platform: web" \
     -b cookies1.txt
   ```

   **응답 확인:**
   - `totalSessions: 1`
   - 웹 세션 1개만 존재

3. **두 번째 로그인 (같은 플랫폼 - 웹)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -H "X-Platform: web" \
     -c cookies2.txt \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

   **응답 확인:**
   ```json
   {
     "message": "로그인 성공",
     "user": { ... },
     "sessionId": "새로운_세션_ID",
     "warning": {
       "previousSessionTerminated": true,
       "message": "이전에 로그인된 웹 세션이 로그아웃되었습니다.",
       "terminatedDevice": "이전_기기명"
     }
   }
   ```

4. **첫 번째 쿠키로 API 호출 (로그아웃되었는지 확인)**
   ```bash
   curl -X GET http://localhost:3000/api/v1/auth/session \
     -b cookies1.txt
   ```

   **예상 응답:**
   ```json
   {
     "loggedIn": false
   }
   ```
   → **첫 번째 세션이 실제로 로그아웃됨!**

5. **두 번째 쿠키로 API 호출 (정상 작동 확인)**
   ```bash
   curl -X GET http://localhost:3000/api/v1/auth/session \
     -b cookies2.txt
   ```

   **예상 응답:**
   ```json
   {
     "loggedIn": true,
     "user": { ... }
   }
   ```

---

### 시나리오 2: 웹 + 앱 동시 로그인
1. **웹에서 로그인**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -H "X-Platform: web" \
     -c cookies_web.txt \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

2. **앱에서 로그인**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -H "X-Platform: app" \
     -c cookies_app.txt \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

   **응답 확인:**
   - `warning` 필드 없음 (다른 플랫폼이므로)

3. **활성 세션 조회**
   ```bash
   curl -X GET http://localhost:3000/api/v1/auth/sessions \
     -b cookies_web.txt
   ```

   **응답 확인:**
   ```json
   {
     "totalSessions": 2,
     "sessions": [
       { "platform": "web", ... },
       { "platform": "app", ... }
     ]
   }
   ```
   → **웹 1개 + 앱 1개 = 총 2개 세션 유지됨!**

4. **웹에서 재로그인**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -H "X-Platform: web" \
     -c cookies_web2.txt \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

   **응답 확인:**
   ```json
   {
     "warning": {
       "previousSessionTerminated": true,
       "message": "이전에 로그인된 웹 세션이 로그아웃되었습니다."
     }
   }
   ```

5. **이전 웹 세션 확인 (로그아웃됨)**
   ```bash
   curl -X GET http://localhost:3000/api/v1/auth/session \
     -b cookies_web.txt
   ```
   **예상 결과:** `loggedIn: false`

6. **앱 세션 확인 (여전히 유효함)**
   ```bash
   curl -X GET http://localhost:3000/api/v1/auth/session \
     -b cookies_app.txt
   ```
   **예상 결과:** `loggedIn: true`
   → **앱 세션은 영향받지 않음!**

---

## 🔍 MongoDB에서 직접 확인

```bash
# MongoDB 컨테이너 접속
docker exec -it livelink-mongo mongosh -u admin -p changeme

# LiveLink DB로 전환
use livelink

# 사용자의 활성 세션 조회
db.user_sessions.find({
  userId: ObjectId("사용자_ID")
}).pretty()

# 플랫폼별 세션 개수 확인
db.user_sessions.aggregate([
  {
    $match: {
      userId: ObjectId("사용자_ID"),
      expiresAt: { $gt: new Date() }
    }
  },
  {
    $group: {
      _id: "$deviceInfo.platform",
      count: { $sum: 1 }
    }
  }
])
```

**예상 결과:**
```json
[
  { "_id": "web", "count": 1 },
  { "_id": "app", "count": 1 }
]
```

---

## 🔧 Redis에서 세션 확인

```bash
# Redis 컨테이너 접속
docker exec -it livelink-redis redis-cli -a changeme

# 모든 세션 키 조회
KEYS "app:sess:*"

# 특정 세션 내용 확인
GET "app:sess:세션ID"

# 세션 개수 확인
KEYS app:sess:* | wc -l
```

---

## ✅ 정상 작동 체크리스트

- [ ] 같은 플랫폼에서 재로그인 시 이전 세션이 무효화됨
- [ ] 재로그인 시 `warning` 필드에 경고 메시지가 포함됨
- [ ] 이전 쿠키로 API 호출 시 `loggedIn: false` 응답
- [ ] MongoDB에서 플랫폼별 세션이 1개씩만 존재
- [ ] Redis에서 이전 세션 키가 삭제됨
- [ ] 다른 플랫폼의 세션은 영향받지 않음
