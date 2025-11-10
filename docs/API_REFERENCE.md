# API Reference

## Base URL
- Development: `http://localhost:3000`
- Production: `https://test.backend.stagelives.com`

## Authentication
대부분의 API는 세션 기반 인증을 사용합니다.
- 로그인 후 세션 쿠키 자동 설정
- 쿠키명: `app.session.id`
- HttpOnly, Secure (프로덕션)

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "작업이 성공했습니다"
}
```

### Error Response
```json
{
  "success": false,
  "error": "오류 메시지",
  "statusCode": 400
}
```

## API Endpoints

### 🔐 Authentication (`/auth`)

#### POST `/auth/register`
사용자 회원가입 (이메일/비밀번호)

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123!",
  "name": "홍길동",
  "birthDate": "1990-01-01",
  "isTermsAgreed": true,
  "termsVersion": "1.0"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "홍길동",
    "status": "pending_verification"
  }
}
```

**Rate Limit:** 1시간에 10회

---

#### POST `/auth/login`
로그인 (이메일 또는 사용자명)

**Request Body:**
```json
{
  "emailOrUsername": "john@example.com",
  "password": "securePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "로그인 성공",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "홍길동",
    "profileImage": "https://..."
  }
}
```

**Rate Limit:** 15분에 10회
**Brute Force Protection:** 5회 실패 시 30분 차단

---

#### POST `/auth/logout`
로그아웃

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "로그아웃되었습니다"
}
```

---

#### GET `/auth/google`
Google OAuth 로그인 시작

**Response:** `302 Redirect` to Google OAuth

---

#### GET `/auth/google/callback`
Google OAuth 콜백

**Response:** `302 Redirect` to Frontend

---

#### GET `/auth/apple`
Apple OAuth 로그인 시작

---

#### GET `/auth/me`
현재 로그인한 사용자 정보

**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "홍길동",
    "profileImage": "https://...",
    "likedConcerts": ["..."],
    "likedArticles": ["..."]
  }
}
```

---

#### POST `/auth/password/reset-request`
비밀번호 재설정 요청 (이메일 찾기)

**Request Body:**
```json
{
  "name": "홍길동",
  "birthDate": "1990-01-01"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "emails": ["j***@example.com"],
  "message": "일치하는 계정의 이메일입니다"
}
```

---

#### POST `/auth/password/reset`
비밀번호 재설정 실행

**Request Body:**
```json
{
  "email": "john@example.com",
  "newPassword": "newSecurePassword123!"
}
```

**Response:** `200 OK`

---

### 🎵 Concert (`/concert`)

#### GET `/concert`
콘서트 목록 조회

**Query Parameters:**
- `page` (number, default: 1): 페이지 번호
- `limit` (number, default: 20, max: 100): 페이지당 항목 수
- `status` (string): upcoming | ongoing | completed | cancelled
- `category` (string): 카테고리 필터
- `artist` (string): 아티스트 검색
- `location` (string): 지역 필터

**Response:** `200 OK`
```json
{
  "concerts": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "uid": "CONCERT_20251010_001",
      "title": "2025 Concert Tour",
      "artist": ["Artist Name"],
      "location": ["Seoul", "Busan"],
      "datetime": ["2025-12-01T19:00:00Z"],
      "price": [
        {"tier": "VIP", "amount": 150000},
        {"tier": "R", "amount": 120000}
      ],
      "category": ["K-POP"],
      "status": "upcoming",
      "likesCount": 1234,
      "posterImage": "https://...",
      "ticketLink": [
        {"platform": "Interpark", "url": "https://..."}
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Cache:** 5분 (Redis)

---

#### GET `/concert/:id`
콘서트 상세 조회

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "uid": "CONCERT_20251010_001",
  "title": "2025 Concert Tour",
  "description": "상세 설명...",
  "infoImages": ["https://...", "https://..."],
  ...
}
```

---

#### POST `/concert`
콘서트 생성

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "title": "2025 Concert Tour",
  "artist": ["Artist Name"],
  "location": ["Seoul"],
  "datetime": ["2025-12-01T19:00:00Z"],
  "price": [{"tier": "VIP", "amount": 150000}],
  "category": ["K-POP"],
  "description": "...",
  "ticketOpenDate": "2025-11-01T10:00:00Z"
}
```

**Response:** `201 Created`

---

#### PUT `/concert/:id`
콘서트 수정

**Auth Required:** Yes (Admin only)

---

#### DELETE `/concert/:id`
콘서트 삭제

**Auth Required:** Yes (Admin only)

---

#### POST `/concert/:id/like`
콘서트 좋아요/취소

**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "liked": true,
  "likesCount": 1235
}
```

---

#### GET `/concert/search`
콘서트 검색

**Query Parameters:**
- `q` (string, required): 검색어
- `page`, `limit`: 페이지네이션

**Response:** `200 OK` (목록 형식 동일)

---

### 📝 Article (`/article`)

#### GET `/article`
게시글 목록 조회

**Query Parameters:**
- `page`, `limit`: 페이지네이션
- `category` (string): 카테고리 ID
- `author` (string): 작성자 ID

**Response:** `200 OK`
```json
{
  "articles": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "게시글 제목",
      "content_url": "https://content-url.com/article.md",
      "author_id": "507f...",
      "category_id": "507f...",
      "is_published": true,
      "published_at": "2025-10-10T10:00:00Z",
      "views": 1234,
      "likes_count": 56,
      "created_at": "2025-10-09T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### GET `/article/:id`
게시글 상세 조회 (조회수 자동 증가)

**Response:** `200 OK`

---

#### POST `/article`
게시글 작성

**Auth Required:** Yes

**Request Body:**
```json
{
  "title": "게시글 제목",
  "content_url": "https://content-url.com/article.md",
  "category_id": "507f1f77bcf86cd799439011",
  "is_published": true
}
```

**Response:** `201 Created`

---

#### PUT `/article/:id`
게시글 수정

**Auth Required:** Yes (작성자 또는 Admin)

---

#### DELETE `/article/:id`
게시글 삭제

**Auth Required:** Yes (작성자 또는 Admin)

---

#### POST `/article/:id/like`
게시글 좋아요/취소

**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "liked": true,
  "likesCount": 57
}
```

---

#### GET `/article/search`
게시글 검색 (텍스트 검색)

**Query Parameters:**
- `q` (string, required): 검색어

---

### 💬 Chat (`/chat`)

#### GET `/chat/rooms`
채팅방 목록 조회

**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "rooms": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "채팅방 이름",
      "description": "설명",
      "isPrivate": false,
      "participants": ["userId1", "userId2"],
      "createdBy": "userId1",
      "lastActivity": "2025-10-10T15:30:00Z",
      "messageCount": 150
    }
  ]
}
```

---

#### POST `/chat/rooms`
채팅방 생성

**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "채팅방 이름",
  "description": "설명 (선택)",
  "isPrivate": false,
  "participants": ["userId1", "userId2"]
}
```

**Response:** `201 Created`

---

#### GET `/chat/rooms/:roomId`
채팅방 상세 조회

**Auth Required:** Yes

---

#### GET `/chat/rooms/:roomId/messages`
채팅방 메시지 목록

**Auth Required:** Yes

**Query Parameters:**
- `limit` (number, default: 50): 메시지 개수
- `skip` (number, default: 0): 건너뛸 메시지 수

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "_id": "507f...",
      "chatRoomId": "507f...",
      "senderId": "507f...",
      "content": "메시지 내용",
      "messageType": "text",
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2025-10-10T15:30:00Z"
    }
  ]
}
```

---

#### POST `/chat/rooms/:roomId/join`
채팅방 참여

**Auth Required:** Yes

---

#### POST `/chat/rooms/:roomId/leave`
채팅방 나가기

**Auth Required:** Yes

---

#### DELETE `/chat/rooms/:roomId`
채팅방 삭제

**Auth Required:** Yes (방장만)

---

### 🩺 Health Check (`/health`)

#### GET `/health/liveness`
서버 생존 확인 (K8s Liveness Probe)

**Response:** `200 OK`
```json
{
  "status": "alive",
  "timestamp": "2025-10-10T15:30:00Z",
  "uptime": 12345
}
```

---

#### GET `/health/readiness`
서비스 준비 상태 확인 (K8s Readiness Probe)

**Response:** `200 OK` or `503 Service Unavailable`
```json
{
  "status": "ready",
  "timestamp": "2025-10-10T15:30:00Z",
  "services": {
    "userDB": true,
    "concertDB": true,
    "articleDB": true,
    "chatDB": true,
    "redis": true
  }
}
```

---

#### GET `/health`
전체 상태 정보

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "uptime": 12345,
  "version": "1.0.0",
  "environment": "production",
  "services": { ... }
}
```

---

### 📊 Monitoring (`/metrics`)

#### GET `/metrics`
Prometheus 메트릭

**Response:** `200 OK` (Prometheus Format)
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/concert",status="200"} 1234

# HELP http_request_duration_seconds Duration of HTTP requests
# TYPE http_request_duration_seconds histogram
...
```

---

### 📚 Documentation

#### GET `/api-docs`
Swagger UI - Interactive API Documentation

#### GET `/swagger-json`
Swagger JSON Specification

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - 요청 성공 |
| 201 | Created - 리소스 생성 성공 |
| 204 | No Content - 성공했지만 반환할 내용 없음 |
| 400 | Bad Request - 잘못된 요청 |
| 401 | Unauthorized - 인증 필요 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스를 찾을 수 없음 |
| 409 | Conflict - 중복된 리소스 |
| 429 | Too Many Requests - Rate Limit 초과 |
| 500 | Internal Server Error - 서버 오류 |
| 503 | Service Unavailable - 서비스 이용 불가 |

## Rate Limiting

### 개발 환경
- **`NODE_ENV=development`일 때:** 모든 Rate Limiting이 자동으로 비활성화됩니다.
- 개발 중 제한 없이 API 테스트 가능

### 프로덕션 환경

#### Default Rate Limit
- **Window:** 60초
- **Max Requests:** 100회

#### Strict Rate Limit (로그인, 회원가입)
- **Window:** 15분 (로그인) / 60분 (회원가입)
- **Max Requests:** 10회

#### Brute Force Protection
- **Max Failed Attempts:** 5회
- **Block Duration:** 30분

## GraphQL API

### Endpoint
```
POST /graphql
```

### Example Query
```graphql
query {
  reports {
    _id
    title
    description
    category
    status
    createdAt
  }
}
```

### Example Mutation
```graphql
mutation {
  createReport(input: {
    title: "버그 제보"
    description: "설명..."
    category: "bug"
  }) {
    _id
    title
  }
}
```

## WebSocket (Socket.IO)

### Connection
```javascript
const socket = io('http://localhost:3000', {
  withCredentials: true
});
```

### Events
See [Socket.IO Events Documentation](./SOCKET_IO_EVENTS.md)

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0
