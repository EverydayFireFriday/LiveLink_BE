# Sequence Diagrams - stagelives API

## 1. 사용자 회원가입 및 인증 플로우

### 1.1 이메일 회원가입

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant RateLimit as Rate Limiter
    participant Redis
    participant Validation as Validation Layer
    participant BruteForce as Brute Force Protection
    participant UserModel
    participant MongoDB
    participant Email as Email Service

    User->>Client: 회원가입 요청 (username, email, password, name, birthDate)
    Client->>API: POST /auth/register
    API->>RateLimit: 요청 제한 확인
    RateLimit->>Redis: 요청 카운트 확인
    Redis-->>RateLimit: 카운트 반환

    alt Rate Limit 초과
        RateLimit-->>API: 429 Too Many Requests
        API-->>Client: 오류 응답
    else Rate Limit 통과
        RateLimit-->>API: 통과
        API->>Validation: 입력 검증 (Joi/Zod)

        alt 유효성 검증 실패
            Validation-->>API: 400 Bad Request
            API-->>Client: 오류 응답
        else 유효성 검증 통과
            Validation-->>API: 통과
            API->>UserModel: 중복 확인 (email, username)
            UserModel->>MongoDB: findOne({email}) / findOne({username})
            MongoDB-->>UserModel: 결과 반환

            alt 중복 존재
                UserModel-->>API: 409 Conflict
                API-->>Client: 중복 오류 응답
            else 중복 없음
                UserModel-->>API: 통과
                API->>API: 비밀번호 해싱 (bcrypt)
                API->>UserModel: createUser(userData)
                UserModel->>MongoDB: insertOne(user)
                MongoDB-->>UserModel: 생성된 사용자
                UserModel-->>API: User 객체

                API->>Email: 인증 이메일 발송
                Email-->>API: 발송 완료

                API->>Redis: 세션 저장
                Redis-->>API: 세션 ID
                API-->>Client: 201 Created + 사용자 정보
                Client-->>User: 회원가입 성공
            end
        end
    end
```

### 1.2 소셜 로그인 (Google OAuth) - 다중 OAuth 지원

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Passport as Passport.js
    participant Google as Google OAuth
    participant UserModel
    participant UserSessionModel
    participant MongoDB
    participant Redis

    User->>Client: "Google로 로그인" 클릭
    Client->>API: GET /auth/google (X-Platform: app|web)
    API->>Passport: Google OAuth 전략 실행
    Passport->>Google: OAuth 인증 요청
    Google-->>User: Google 로그인 페이지
    User->>Google: 로그인 + 권한 승인
    Google->>API: GET /auth/google/callback?code=...
    API->>Passport: 콜백 처리
    Passport->>Google: 액세스 토큰 교환
    Google-->>Passport: 사용자 프로필 (email, socialId)

    Passport->>UserModel: findByOAuthProvider('google', socialId)
    UserModel->>MongoDB: findOne({oauthProviders: {$elemMatch: {provider: 'google', socialId}}})
    MongoDB-->>UserModel: 사용자 또는 null

    alt 기존 사용자 (OAuth 연동됨)
        UserModel-->>Passport: User 객체
    else 신규 사용자 OR 이메일로 기존 계정 찾기
        Passport->>UserModel: findByEmail(email)
        UserModel->>MongoDB: findOne({email})
        MongoDB-->>UserModel: 사용자 또는 null

        alt 이메일로 기존 계정 발견
            Passport->>UserModel: addOAuthProvider(userId, {provider: 'google', socialId, email, linkedAt})
            UserModel->>MongoDB: updateOne({$addToSet: {oauthProviders: {...}}})
            MongoDB-->>UserModel: 업데이트된 User
            UserModel-->>Passport: User 객체 (OAuth 추가됨)
        else 완전히 신규 사용자
            Passport->>UserModel: createUser({email, oauthProviders: [{provider: 'google', socialId, ...}], status: 'pending_registration'})
            UserModel->>MongoDB: insertOne(user)
            MongoDB-->>UserModel: 생성된 사용자
            UserModel-->>Passport: User 객체
        end
    end

    Note over Passport,UserSessionModel: 세션 생성 (UserSession 모델)
    Passport->>UserSessionModel: createSession(userId, sessionId, deviceInfo, expiresAt)
    UserSessionModel->>MongoDB: insertOne(userSession)
    MongoDB-->>UserSessionModel: 생성된 세션

    Passport->>Redis: 세션 데이터 저장 (express-session)
    Redis-->>Passport: 세션 ID

    Passport-->>API: 인증 완료
    API-->>Client: 302 Redirect to Frontend
    Client-->>User: 로그인 완료
```

## 2. 콘서트 조회 및 좋아요

### 2.1 콘서트 목록 조회 (캐싱 포함)

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Cache as Cache Manager
    participant Redis
    participant ConcertModel
    participant MongoDB

    User->>Client: 콘서트 목록 요청
    Client->>API: GET /concert?page=1&limit=20&status=upcoming
    API->>Auth: 인증 확인 (선택적)

    alt 인증 필요한 엔드포인트
        Auth->>Redis: 세션 확인
        Redis-->>Auth: 세션 데이터
        Auth-->>API: 인증 완료
    end

    API->>Cache: get('concerts:page:1:limit:20:upcoming')
    Cache->>Redis: Redis GET

    alt 캐시 HIT
        Redis-->>Cache: 캐시된 데이터
        Cache-->>API: 콘서트 목록
        API-->>Client: 200 OK + 콘서트 목록
    else 캐시 MISS
        Redis-->>Cache: null
        Cache-->>API: null
        API->>ConcertModel: findConcerts({status: 'upcoming'}, {page: 1, limit: 20})
        ConcertModel->>MongoDB: find({status: 'upcoming'}).limit(20).skip(0)
        MongoDB-->>ConcertModel: 콘서트 문서들
        ConcertModel-->>API: 콘서트 목록

        API->>Cache: set('concerts:page:1:limit:20:upcoming', data, ttl: 300)
        Cache->>Redis: Redis SET with EX 300
        Redis-->>Cache: OK

        API-->>Client: 200 OK + 콘서트 목록
    end

    Client-->>User: 콘서트 목록 표시
```

### 2.2 콘서트 좋아요

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant UserModel
    participant ConcertModel
    participant MongoDB

    User->>Client: 콘서트 좋아요 클릭
    Client->>API: POST /concert/:concertId/like
    API->>Auth: 인증 확인
    Auth->>Redis: 세션 확인
    Redis-->>Auth: 세션 데이터 + userId
    Auth-->>API: 인증된 사용자

    API->>UserModel: findById(userId)
    UserModel->>MongoDB: findOne({_id: userId})
    MongoDB-->>UserModel: User 객체
    UserModel-->>API: User with likedConcerts[]

    alt 이미 좋아요한 콘서트
        API->>UserModel: updateUser(userId, {$pull: {likedConcerts: concertId}})
        UserModel->>MongoDB: updateOne({_id: userId}, {$pull: {likedConcerts: concertId}})
        API->>ConcertModel: decrementLikesCount(concertId)
        ConcertModel->>MongoDB: updateOne({_id: concertId}, {$inc: {likesCount: -1}})
        MongoDB-->>ConcertModel: 업데이트 완료
        API-->>Client: 200 OK {liked: false}
    else 좋아요 추가
        API->>UserModel: updateUser(userId, {$addToSet: {likedConcerts: concertId}})
        UserModel->>MongoDB: updateOne({_id: userId}, {$addToSet: {likedConcerts: concertId}})
        API->>ConcertModel: incrementLikesCount(concertId)
        ConcertModel->>MongoDB: updateOne({_id: concertId}, {$inc: {likesCount: 1}})
        MongoDB-->>ConcertModel: 업데이트 완료
        API-->>Client: 200 OK {liked: true}
    end

    Client-->>User: 좋아요 상태 업데이트
```

## 3. 실시간 채팅 (Socket.IO)

### 3.1 채팅방 입장 및 메시지 전송

```mermaid
sequenceDiagram
    actor User1
    actor User2
    participant Client1 as Client (User1)
    participant Client2 as Client (User2)
    participant SocketIO as Socket.IO Server
    participant Auth as Auth Middleware
    participant Redis
    participant ChatRoomModel
    participant MessageModel
    participant MongoDB

    User1->>Client1: 채팅방 입장
    Client1->>SocketIO: socket.connect()
    SocketIO->>Auth: 세션 인증
    Auth->>Redis: 세션 확인
    Redis-->>Auth: 세션 데이터
    Auth-->>SocketIO: 인증된 사용자

    Client1->>SocketIO: emit('join-room', {roomId})
    SocketIO->>ChatRoomModel: findById(roomId)
    ChatRoomModel->>MongoDB: findOne({_id: roomId})
    MongoDB-->>ChatRoomModel: ChatRoom 객체
    ChatRoomModel-->>SocketIO: ChatRoom

    alt 참여 권한 확인
        SocketIO->>SocketIO: 사용자가 participants에 포함되어 있는지 확인
        SocketIO->>SocketIO: socket.join(roomId)
        SocketIO-->>Client1: emit('joined-room', {roomId})
    end

    Note over Client2,SocketIO: User2도 같은 방식으로 입장

    User1->>Client1: 메시지 입력 및 전송
    Client1->>SocketIO: emit('send-message', {roomId, content, messageType})
    SocketIO->>MessageModel: createMessage({chatRoomId, senderId, content, messageType})
    MessageModel->>MongoDB: insertOne(message)
    MongoDB-->>MessageModel: 생성된 Message
    MessageModel-->>SocketIO: Message 객체

    SocketIO->>ChatRoomModel: updateLastActivity(roomId)
    ChatRoomModel->>MongoDB: updateOne({_id: roomId}, {$set: {lastActivity: now}, $inc: {messageCount: 1}})

    SocketIO->>SocketIO: io.to(roomId).emit('new-message', message)
    SocketIO-->>Client1: emit('new-message', message)
    SocketIO-->>Client2: emit('new-message', message)

    Client1-->>User1: 메시지 표시
    Client2-->>User2: 메시지 표시
```

## 4. 게시글 작성 및 조회

### 4.1 게시글 작성

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant Validation as Validation Layer
    participant ArticleModel
    participant MongoDB

    User->>Client: 게시글 작성
    Client->>API: POST /article
    API->>Auth: 인증 확인
    Auth->>Redis: 세션 확인
    Redis-->>Auth: 세션 + userId
    Auth-->>API: 인증된 사용자

    API->>Validation: 입력 검증 (title, content_url, category_id)

    alt 검증 실패
        Validation-->>API: 400 Bad Request
        API-->>Client: 오류 응답
    else 검증 통과
        Validation-->>API: 통과
        API->>ArticleModel: create({title, content_url, author_id, category_id, is_published})
        ArticleModel->>MongoDB: insertOne(article)
        MongoDB-->>ArticleModel: 생성된 Article
        ArticleModel-->>API: Article 객체
        API-->>Client: 201 Created + Article
        Client-->>User: 게시글 작성 완료
    end
```

## 5. Brute Force Protection

### 5.1 로그인 시도 제한

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant BruteForce as Brute Force Service
    participant Redis
    participant UserModel
    participant MongoDB

    User->>Client: 로그인 시도
    Client->>API: POST /auth/login {email, password}
    API->>BruteForce: isBlocked(email)
    BruteForce->>Redis: GET login-block:email

    alt 차단된 사용자
        Redis-->>BruteForce: "blocked"
        BruteForce-->>API: true (차단됨)
        API-->>Client: 429 Too Many Requests (30분 대기)
    else 차단되지 않음
        Redis-->>BruteForce: null
        BruteForce-->>API: false

        API->>UserModel: findByEmail(email)
        UserModel->>MongoDB: findOne({email})
        MongoDB-->>UserModel: User 또는 null

        alt 사용자 없음 또는 비밀번호 불일치
            UserModel-->>API: null 또는 User
            API->>API: 비밀번호 검증 (bcrypt.compare)
            API->>BruteForce: increment(email)
            BruteForce->>Redis: INCR login-attempts:email
            Redis-->>BruteForce: attempts count

            alt 최대 시도 횟수 초과 (예: 5회)
                BruteForce->>Redis: SET login-block:email "blocked" EX 1800
                BruteForce-->>API: 차단됨
                API-->>Client: 429 Too Many Requests
            else 계속 시도 가능
                BruteForce-->>API: attempts count
                API-->>Client: 401 Unauthorized (남은 시도: X회)
            end
        else 로그인 성공
            UserModel-->>API: User
            API->>API: 비밀번호 검증 성공
            API->>BruteForce: reset(email)
            BruteForce->>Redis: DEL login-attempts:email, login-block:email
            API->>Redis: 세션 생성
            Redis-->>API: 세션 ID
            API-->>Client: 200 OK + 세션 쿠키
            Client-->>User: 로그인 완료
        end
    end
```

## 6. 세션 관리 (다중 디바이스)

### 6.1 활성 세션 조회

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant UserSessionModel
    participant MongoDB

    User->>Client: 활성 세션 목록 요청
    Client->>API: GET /auth/sessions
    API->>Auth: 인증 확인
    Auth->>Redis: 세션 확인
    Redis-->>Auth: 세션 데이터 + userId + sessionId
    Auth-->>API: 인증된 사용자

    API->>UserSessionModel: findByUserId(userId)
    UserSessionModel->>MongoDB: find({userId, expiresAt: {$gt: now}}).sort({lastActivityAt: -1})
    MongoDB-->>UserSessionModel: 활성 세션 목록

    UserSessionModel->>UserSessionModel: toSessionResponses(sessions, currentSessionId)
    UserSessionModel-->>API: 세션 목록 (현재 세션 표시)

    API-->>Client: 200 OK + 세션 목록
    Client-->>User: 세션 목록 표시 (플랫폼, 디바이스, 마지막 활동 시간)
```

### 6.2 특정 세션 종료

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant UserSessionModel
    participant MongoDB

    User->>Client: 특정 세션 로그아웃 요청
    Client->>API: DELETE /auth/sessions/:sessionId
    API->>Auth: 인증 확인
    Auth->>Redis: 세션 확인
    Auth-->>API: 인증된 사용자 (userId)

    API->>UserSessionModel: findBySessionId(targetSessionId)
    UserSessionModel->>MongoDB: findOne({sessionId})
    MongoDB-->>UserSessionModel: 세션 정보

    alt 세션 소유자 확인
        UserSessionModel-->>API: 세션 소유자 일치

        API->>UserSessionModel: deleteSession(targetSessionId)
        UserSessionModel->>MongoDB: deleteOne({sessionId})
        MongoDB-->>UserSessionModel: 삭제 완료

        API->>Redis: Redis DEL (해당 세션)
        Redis-->>API: 삭제 완료

        API-->>Client: 200 OK
        Client-->>User: 세션 종료 완료
    else 권한 없음
        UserSessionModel-->>API: 403 Forbidden
        API-->>Client: 권한 없음
    end
```

### 6.3 플랫폼별 세션 교체 (로그인)

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant UserModel
    participant UserSessionModel
    participant MongoDB
    participant Redis

    User->>Client: 로그인 요청 (같은 플랫폼에서 재로그인)
    Client->>API: POST /auth/login (X-Platform: web)

    Note over API: 인증 성공 후

    API->>UserSessionModel: findByUserId(userId)
    UserSessionModel->>MongoDB: find({userId, expiresAt: {$gt: now}})
    MongoDB-->>UserSessionModel: 활성 세션 목록

    UserSessionModel->>UserSessionModel: 현재 플랫폼과 동일한 세션 찾기

    alt 같은 플랫폼 세션 존재
        UserSessionModel-->>API: 기존 web 세션 발견

        Note over API: 기존 세션 종료
        API->>UserSessionModel: deleteSession(oldSessionId)
        UserSessionModel->>MongoDB: deleteOne({sessionId: oldSessionId})
        API->>Redis: DEL oldSessionId

        Note over API: 새 세션 생성
        API->>UserSessionModel: createSession(userId, newSessionId, deviceInfo, expiresAt)
        UserSessionModel->>MongoDB: insertOne(newSession)
        API->>Redis: 새 세션 저장

        API-->>Client: 200 OK + 경고 메시지
        Note over Client: "이전에 로그인된 웹 세션이 로그아웃되었습니다"
        Client-->>User: 로그인 완료 + 경고 표시
    else 같은 플랫폼 세션 없음
        Note over API: 새 세션만 생성
        API->>UserSessionModel: createSession(userId, sessionId, deviceInfo, expiresAt)
        UserSessionModel->>MongoDB: insertOne(session)
        API->>Redis: 세션 저장
        API-->>Client: 200 OK
        Client-->>User: 로그인 완료
    end
```

## 7. 알림 시스템

### 7.1 티켓 오픈 알림 예약

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant UserModel
    participant ConcertModel
    participant ScheduledNotificationModel
    participant MongoDB

    User->>Client: 콘서트 좋아요 (알림 자동 예약)
    Client->>API: POST /concert/:concertId/like

    Note over API: 좋아요 처리 후

    API->>ConcertModel: findById(concertId)
    ConcertModel->>MongoDB: findOne({_id: concertId})
    MongoDB-->>ConcertModel: Concert 정보 (ticketOpenDate[])

    API->>UserModel: findById(userId)
    UserModel->>MongoDB: findOne({_id: userId})
    MongoDB-->>UserModel: User 정보 (notificationPreference)

    loop 각 티켓 오픈 날짜
        loop 사용자 알림 설정 (예: [10, 30, 60, 1440]분 전)
            API->>API: scheduledAt = ticketOpenDate - 알림 시간
            API->>ScheduledNotificationModel: create({userId, concertId, title, message, scheduledAt, status: 'pending'})
            ScheduledNotificationModel->>MongoDB: insertOne(scheduledNotification)
        end
    end

    API-->>Client: 200 OK (좋아요 + 알림 예약 완료)
    Client-->>User: 좋아요 완료
```

### 7.2 예약 알림 전송 (크론 작업)

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant NotificationService as Notification Service
    participant ScheduledNotificationModel
    participant UserModel
    participant NotificationHistoryModel
    participant FCM as Firebase Cloud Messaging
    participant MongoDB

    Cron->>NotificationService: 매분 실행 (예약 알림 확인)

    NotificationService->>ScheduledNotificationModel: findPendingNotifications(now)
    ScheduledNotificationModel->>MongoDB: find({status: 'pending', scheduledAt: {$lte: now}})
    MongoDB-->>ScheduledNotificationModel: 전송할 알림 목록

    loop 각 알림
        NotificationService->>UserModel: findById(userId)
        UserModel->>MongoDB: findOne({_id: userId})
        MongoDB-->>UserModel: User (fcmToken)

        alt FCM 토큰 존재
            NotificationService->>FCM: send({token: fcmToken, notification: {...}})
            FCM-->>NotificationService: 전송 성공

            Note over NotificationService: 알림 상태 업데이트
            NotificationService->>ScheduledNotificationModel: update({_id}, {status: 'sent', sentAt: now})
            ScheduledNotificationModel->>MongoDB: updateOne(...)

            Note over NotificationService: 알림 이력 저장
            NotificationService->>NotificationHistoryModel: create({userId, concertId, title, message, type, isRead: false, sentAt, expiresAt})
            NotificationHistoryModel->>MongoDB: insertOne(notificationHistory)
        else FCM 토큰 없음
            NotificationService->>ScheduledNotificationModel: update({_id}, {status: 'failed', errorReason: 'No FCM token'})
        end
    end
```

## 8. Health Check & Monitoring

### 8.1 Readiness Probe

```mermaid
sequenceDiagram
    participant K8s as Kubernetes/Load Balancer
    participant API as Express Server
    participant MongoDB
    participant Redis

    K8s->>API: GET /health/readiness
    API->>MongoDB: ping (User DB)
    MongoDB-->>API: pong
    API->>MongoDB: ping (Concert DB)
    MongoDB-->>API: pong
    API->>MongoDB: ping (Article DB)
    MongoDB-->>API: pong
    API->>MongoDB: ping (Chat DB)
    MongoDB-->>API: pong
    API->>Redis: ping

    alt Redis 연결됨
        Redis-->>API: pong
        API->>API: 모든 서비스 상태 확인
        alt 모든 서비스 정상
            API-->>K8s: 200 OK {status: "ready", services: {...}}
        else 일부 서비스 장애
            API-->>K8s: 503 Service Unavailable {status: "not ready"}
        end
    else Redis 연결 안됨 (선택적 서비스)
        Redis--xAPI: 연결 실패
        API->>API: MongoDB만 확인
        alt MongoDB 모두 정상
            API-->>K8s: 200 OK (Redis는 degraded mode)
        else MongoDB 장애
            API-->>K8s: 503 Service Unavailable
        end
    end
```

## 9. Setlist Management (YouTube Music & Spotify)

### 9.1 Setlist 생성 및 재생목록 생성

```mermaid
sequenceDiagram
    actor Admin
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant SetlistService
    participant SetlistModel
    participant YouTubeService
    participant SpotifyService
    participant MongoDB
    participant YouTubeAPI as YouTube Music API
    participant SpotifyAPI as Spotify Web API

    Admin->>Client: 콘서트 세트리스트 생성 요청
    Client->>API: POST /setlist {concertId, setList: [{title, artist}]}
    API->>Auth: 인증 확인 (Admin 권한)
    Auth-->>API: 인증 완료

    API->>SetlistService: createSetlist(concertId, setList)
    SetlistService->>SetlistModel: findByConcertId(concertId)
    SetlistModel->>MongoDB: findOne({concertId})

    alt 기존 Setlist 존재
        MongoDB-->>SetlistModel: 기존 Setlist
        SetlistService->>SetlistModel: updateSetlist(concertId, setList)
        SetlistModel->>MongoDB: updateOne({concertId}, {$set: {setList}})
    else 새로운 Setlist
        SetlistService->>SetlistModel: create({concertId, setList})
        SetlistModel->>MongoDB: insertOne(setlist)
    end

    Note over SetlistService,YouTubeAPI: YouTube Music 재생목록 생성

    SetlistService->>YouTubeService: createPlaylist(concertId, setList)
    YouTubeService->>YouTubeAPI: POST /playlists (create empty playlist)
    YouTubeAPI-->>YouTubeService: playlistId

    loop 각 곡마다
        YouTubeService->>YouTubeAPI: GET /search (title + artist)
        YouTubeAPI-->>YouTubeService: videoId
        YouTubeService->>YouTubeAPI: POST /playlistItems (add video to playlist)
    end

    YouTubeService-->>SetlistService: youtubePlaylistUrl

    Note over SetlistService,SpotifyAPI: Spotify 재생목록 생성

    SetlistService->>SpotifyService: createPlaylist(concertId, setList)
    SpotifyService->>SpotifyAPI: POST /me/playlists (create empty playlist)
    SpotifyAPI-->>SpotifyService: playlistId

    loop 각 곡마다
        SpotifyService->>SpotifyAPI: GET /search (track + artist)
        SpotifyAPI-->>SpotifyService: trackUri
    end

    SpotifyService->>SpotifyAPI: POST /playlists/{id}/tracks (add all tracks)
    SpotifyService-->>SetlistService: spotifyPlaylistUrl

    Note over SetlistService,MongoDB: Setlist에 재생목록 URL 저장

    SetlistService->>SetlistModel: update({$set: {youtubePlaylistUrl, spotifyPlaylistUrl}})
    SetlistModel->>MongoDB: updateOne(...)
    MongoDB-->>SetlistModel: 업데이트 완료

    SetlistService-->>API: Setlist with playlist URLs
    API-->>Client: 201 Created + Setlist
    Client-->>Admin: 세트리스트 및 재생목록 생성 완료
```

### 9.2 Setlist 조회 (콘서트 상세 페이지)

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant ConcertService
    participant SetlistService
    participant MongoDB

    User->>Client: 콘서트 상세 페이지 요청
    Client->>API: GET /concert/:concertId

    API->>ConcertService: getConcertById(concertId)
    ConcertService->>MongoDB: findOne({uid: concertId})
    MongoDB-->>ConcertService: Concert 정보

    Note over API,SetlistService: 세트리스트 조회 (선택적)

    API->>SetlistService: getSetlistByConcertId(concertId)
    SetlistService->>MongoDB: findOne({concertId})

    alt Setlist 존재
        MongoDB-->>SetlistService: Setlist with URLs
        SetlistService-->>API: {setList, youtubePlaylistUrl, spotifyPlaylistUrl}
    else Setlist 없음
        MongoDB-->>SetlistService: null
        SetlistService-->>API: null
    end

    API-->>Client: 200 OK {concert, setlist}
    Client-->>User: 콘서트 정보 + 세트리스트 표시

    alt 사용자가 재생목록 링크 클릭
        User->>Client: YouTube/Spotify 재생목록 링크 클릭
        Client->>Client: 외부 링크 열기 (YouTube Music / Spotify 앱)
    end
```

## 10. Support Inquiry System

### 10.1 고객 문의 제출

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant Validation as Validation Layer
    participant SupportInquiryModel
    participant MongoDB
    participant Notification as Notification Service

    User->>Client: 고객 문의 작성
    Client->>API: POST /support/inquiry {category, subject, content, attachments[]}
    API->>Auth: 인증 확인
    Auth->>Redis: 세션 확인
    Redis-->>Auth: 세션 + userId
    Auth-->>API: 인증된 사용자

    API->>Validation: 입력 검증 (category, subject, content)

    alt 검증 실패
        Validation-->>API: 400 Bad Request
        API-->>Client: 오류 응답
    else 검증 통과
        Validation-->>API: 통과

        API->>API: priority 자동 설정 (카테고리, 키워드 기반)
        API->>SupportInquiryModel: create({userId, category, subject, content, status: 'pending', priority, attachments})
        SupportInquiryModel->>MongoDB: insertOne(supportInquiry)
        MongoDB-->>SupportInquiryModel: 생성된 SupportInquiry
        SupportInquiryModel-->>API: SupportInquiry 객체

        Note over API,Notification: 관리자에게 알림 (선택적)
        API->>Notification: notifyAdminNewInquiry(inquiryId, category, priority)

        API-->>Client: 201 Created + SupportInquiry
        Client-->>User: 문의 접수 완료
    end
```

### 10.2 관리자 답변

```mermaid
sequenceDiagram
    actor Admin
    participant AdminClient as Admin Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant SupportInquiryModel
    participant UserModel
    participant MongoDB
    participant FCM as Firebase Cloud Messaging

    Admin->>AdminClient: 문의 답변 작성
    AdminClient->>API: PATCH /support/inquiry/:inquiryId/respond {content}
    API->>Auth: 관리자 권한 확인
    Auth->>Redis: 세션 확인
    Auth-->>API: 관리자 인증 완료

    API->>SupportInquiryModel: findById(inquiryId)
    SupportInquiryModel->>MongoDB: findOne({_id: inquiryId, isDeleted: false})
    MongoDB-->>SupportInquiryModel: SupportInquiry

    alt 문의가 이미 답변됨
        SupportInquiryModel-->>API: SupportInquiry (adminResponse exists)
        API-->>AdminClient: 409 Conflict (이미 답변됨)
    else 답변 가능
        SupportInquiryModel-->>API: SupportInquiry

        API->>SupportInquiryModel: update({_id}, {$set: {adminResponse: {responderId, content, respondedAt}, status: 'resolved'}})
        SupportInquiryModel->>MongoDB: updateOne(...)
        MongoDB-->>SupportInquiryModel: 업데이트 완료

        Note over API,FCM: 사용자에게 푸시 알림 전송

        API->>UserModel: findById(userId)
        UserModel->>MongoDB: findOne({_id: userId})
        MongoDB-->>UserModel: User (fcmToken)

        alt FCM 토큰 존재
            API->>FCM: send({token, notification: {title: '문의 답변 도착', body: '문의하신 내용에 대한 답변이 도착했습니다'}})
            FCM-->>API: 전송 성공
        end

        API-->>AdminClient: 200 OK + Updated SupportInquiry
        AdminClient-->>Admin: 답변 완료
    end
```

### 10.3 사용자 문의 내역 조회

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant SupportInquiryModel
    participant MongoDB

    User->>Client: 내 문의 내역 조회
    Client->>API: GET /support/inquiry/my?status=pending&page=1&limit=10
    API->>Auth: 인증 확인
    Auth->>Redis: 세션 확인
    Redis-->>Auth: 세션 + userId
    Auth-->>API: 인증된 사용자

    API->>SupportInquiryModel: findByUserId(userId, {status, page, limit})
    SupportInquiryModel->>MongoDB: find({userId, isDeleted: false, status}).sort({createdAt: -1}).limit(10).skip(0)
    MongoDB-->>SupportInquiryModel: 문의 목록

    SupportInquiryModel->>MongoDB: countDocuments({userId, isDeleted: false, status})
    MongoDB-->>SupportInquiryModel: total count

    SupportInquiryModel-->>API: {inquiries, total, page, totalPages}
    API-->>Client: 200 OK + 문의 목록
    Client-->>User: 문의 내역 표시
```

### 10.4 관리자 문의 목록 조회 (필터링)

```mermaid
sequenceDiagram
    actor Admin
    participant AdminClient as Admin Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant SupportInquiryModel
    participant MongoDB

    Admin->>AdminClient: 문의 관리 페이지 접근
    AdminClient->>API: GET /support/inquiry/admin?status=pending&priority=high&category=technical&page=1&limit=20
    API->>Auth: 관리자 권한 확인
    Auth-->>API: 관리자 인증 완료

    API->>SupportInquiryModel: findWithFilters({status, priority, category, page, limit})
    SupportInquiryModel->>MongoDB: find({isDeleted: false, status, priority, category}).sort({priority: -1, createdAt: 1}).limit(20)

    Note over MongoDB: 인덱스 활용: {status, createdAt}, {priority}

    MongoDB-->>SupportInquiryModel: 문의 목록 (우선순위 높은 순)

    SupportInquiryModel->>MongoDB: countDocuments({isDeleted: false, status, priority, category})
    MongoDB-->>SupportInquiryModel: total count

    SupportInquiryModel-->>API: {inquiries, total, page, totalPages, stats}
    API-->>AdminClient: 200 OK + 문의 목록 + 통계
    AdminClient-->>Admin: 문의 목록 표시 (우선순위별 강조)
```

## 11. Concert Review System

### 11.1 콘서트 리뷰 작성

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant ConcertReviewModel
    participant ConcertModel
    participant UserModel
    participant MongoDB

    User->>Client: 콘서트 리뷰 작성
    Client->>API: POST /concert-review {concertId, content, images[], tags[], hashtags[], isPublic}
    API->>Auth: 인증 확인
    Auth->>Redis: 세션 확인
    Redis-->>Auth: 세션 + userId
    Auth-->>API: 인증된 사용자

    API->>ConcertReviewModel: existsByUserAndConcert(userId, concertId)
    ConcertReviewModel->>MongoDB: countDocuments({user.id, concert.id})
    MongoDB-->>ConcertReviewModel: count

    alt 이미 리뷰 작성함
        ConcertReviewModel-->>API: true
        API-->>Client: 409 Conflict (이미 리뷰 작성됨)
    else 리뷰 작성 가능
        ConcertReviewModel-->>API: false

        Note over API: 사용자 및 콘서트 정보 조회

        API->>UserModel: findById(userId)
        UserModel->>MongoDB: findOne({_id: userId})
        MongoDB-->>UserModel: User 정보
        UserModel-->>API: {username, profileImage}

        API->>ConcertModel: findById(concertId)
        ConcertModel->>MongoDB: findOne({uid: concertId})
        MongoDB-->>ConcertModel: Concert 정보
        ConcertModel-->>API: {title, posterImage, location, datetime}

        API->>ConcertReviewModel: create({user, concert, content, images, tags, hashtags, isPublic})
        ConcertReviewModel->>MongoDB: insertOne(review)
        MongoDB-->>ConcertReviewModel: 생성된 Review
        ConcertReviewModel-->>API: ConcertReview 객체

        API-->>Client: 201 Created + ConcertReview
        Client-->>User: 리뷰 작성 완료
    end
```

### 11.2 콘서트 리뷰 좋아요

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant ConcertReviewLikeModel
    participant ConcertReviewModel
    participant MongoDB

    User->>Client: 리뷰 좋아요 클릭
    Client->>API: POST /concert-review/:reviewId/like
    API->>Auth: 인증 확인
    Auth->>Redis: 세션 확인
    Redis-->>Auth: 세션 + userId
    Auth-->>API: 인증된 사용자

    API->>ConcertReviewLikeModel: exists(reviewId, userId)
    ConcertReviewLikeModel->>MongoDB: countDocuments({reviewId, userId})
    MongoDB-->>ConcertReviewLikeModel: count

    alt 이미 좋아요함
        ConcertReviewLikeModel-->>API: true
        API->>ConcertReviewLikeModel: delete(reviewId, userId)
        ConcertReviewLikeModel->>MongoDB: deleteOne({reviewId, userId})
        API->>ConcertReviewModel: decrementLikeCount(reviewId)
        ConcertReviewModel->>MongoDB: updateOne({$inc: {likeCount: -1}})
        API-->>Client: 200 OK {liked: false}
    else 좋아요 추가
        ConcertReviewLikeModel-->>API: false
        API->>ConcertReviewLikeModel: create(reviewId, userId)
        ConcertReviewLikeModel->>MongoDB: insertOne({reviewId, userId, createdAt})
        API->>ConcertReviewModel: incrementLikeCount(reviewId)
        ConcertReviewModel->>MongoDB: updateOne({$inc: {likeCount: 1}})
        API-->>Client: 200 OK {liked: true}
    end

    Client-->>User: 좋아요 상태 업데이트
```

## 12. Report System

### 12.1 콘텐츠 신고

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Redis
    participant ReportModel
    participant TargetModel as Target Model (Article/Comment/Review)
    participant MongoDB
    participant Notification as Notification Service

    User->>Client: 콘텐츠 신고
    Client->>API: POST /report {entityType, entityId, reportType, reason}
    API->>Auth: 인증 확인
    Auth->>Redis: 세션 확인
    Redis-->>Auth: 세션 + userId
    Auth-->>API: 인증된 사용자

    API->>ReportModel: findByReporterAndEntity(userId, entityType, entityId)
    ReportModel->>MongoDB: findOne({reporterId, reportedEntityType, reportedEntityId})
    MongoDB-->>ReportModel: 기존 신고 또는 null

    alt 이미 신고함
        ReportModel-->>API: 기존 신고 존재
        API-->>Client: 409 Conflict (이미 신고함)
    else 신규 신고
        ReportModel-->>API: null

        API->>ReportModel: create({reporterId, entityType, entityId, reportType, reason, status: 'pending'})
        ReportModel->>MongoDB: insertOne(report)
        MongoDB-->>ReportModel: 생성된 Report
        ReportModel-->>API: Report 객체

        Note over API,TargetModel: 신고 수 증가 (해당 엔티티)

        alt entityType === 'REVIEW'
            API->>TargetModel: incrementReportCount(entityId)
            TargetModel->>MongoDB: updateOne({$inc: {reportCount: 1}})
        end

        Note over API,Notification: 관리자 알림 (선택적)

        API->>Notification: notifyAdminNewReport(reportId, entityType, reportType)

        API-->>Client: 201 Created + Report
        Client-->>User: 신고 접수 완료
    end
```

### 12.2 관리자 신고 처리

```mermaid
sequenceDiagram
    actor Admin
    participant AdminClient as Admin Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant ReportModel
    participant TargetModel as Target Model
    participant UserModel
    participant MongoDB
    participant FCM as Firebase Cloud Messaging

    Admin->>AdminClient: 신고 처리 (승인/기각)
    AdminClient->>API: PATCH /report/:reportId {status, action}
    API->>Auth: 관리자 권한 확인
    Auth-->>API: 관리자 인증 완료

    API->>ReportModel: findById(reportId)
    ReportModel->>MongoDB: findOne({_id: reportId})
    MongoDB-->>ReportModel: Report 정보
    ReportModel-->>API: Report (entityType, entityId, reporterId)

    alt status === 'resolved' (신고 승인)
        Note over API,TargetModel: 콘텐츠 처리 (숨김/삭제)

        alt action === 'hide'
            API->>TargetModel: update({_id: entityId}, {isPublic: false})
        else action === 'delete'
            API->>TargetModel: delete({_id: entityId})
        end

        TargetModel->>MongoDB: 업데이트/삭제
        MongoDB-->>TargetModel: 완료
    end

    API->>ReportModel: update({_id: reportId}, {status, updatedAt})
    ReportModel->>MongoDB: updateOne(...)
    MongoDB-->>ReportModel: 업데이트 완료

    Note over API,FCM: 신고자에게 결과 알림 (선택적)

    API->>UserModel: findById(reporterId)
    UserModel->>MongoDB: findOne({_id: reporterId})
    MongoDB-->>UserModel: User (fcmToken)

    alt FCM 토큰 존재
        API->>FCM: send({token, notification: {title: '신고 처리 완료', body: '...'}})
    end

    API-->>AdminClient: 200 OK + Updated Report
    AdminClient-->>Admin: 신고 처리 완료
```

## 시스템 아키텍처 특징

### Redis 활용
1. **세션 스토어**: Express Session + connect-redis
2. **Rate Limiting**: rate-limit-redis
3. **Brute Force Protection**: 로그인 시도 횟수 추적
4. **캐싱**: 콘서트 목록 등 자주 조회되는 데이터

### Graceful Degradation
- Redis 장애 시 메모리 기반 세션으로 자동 전환
- Rate Limiting 메모리 기반으로 동작
- 서비스 중단 없이 degraded mode 운영

### 보안 기능
- **Rate Limiting**: API 요청 제한 (기본, 엄격, 완화)
- **Brute Force Protection**: 로그인 시도 제한
- **XSS Protection**: sanitize-html
- **NoSQL Injection**: express-mongo-sanitize
- **HPP**: hpp (HTTP Parameter Pollution)
- **Helmet**: 보안 헤더

### 외부 API 통합
- **YouTube Music**: 세트리스트 기반 재생목록 자동 생성
- **Spotify**: 세트리스트 기반 재생목록 자동 생성
- **FCM**: 푸시 알림 전송

### 성능 최적화
- **N+1 Query 방지**: Bulk operations (bulkCreate, bulkCancel, bulkWrite)
- **캐싱**: Redis 기반 콘서트 목록 캐싱
- **인덱싱**: MongoDB 복합 인덱스 활용 (SupportInquiry: {status, createdAt}, {userId, status})
- **Connection Pooling**: MongoDB 및 Redis 연결 풀
- **Query Optimization**: Projection, Aggregation Pipeline 최적화

### 고객 지원
- **Support Inquiry**: 카테고리별 문의 관리 (일반, 기술, 계정, 콘서트, 게시글 등)
- **우선순위 시스템**: low, medium, high, urgent 자동 설정
- **상태 관리**: pending, in_progress, resolved, closed
- **관리자 답변**: Embedded document로 저장 (responderId, content, respondedAt)
- **푸시 알림**: 답변 완료 시 FCM 푸시 알림 자동 전송
- **소프트 삭제**: isDeleted, deletedAt으로 복구 가능한 삭제

### 콘서트 리뷰
- **ConcertReview**: 콘서트 후기 작성 및 관리
- **비정규화**: 사용자/콘서트 정보 embedded document로 저장 (조회 성능 최적화)
- **이미지/태그**: 다중 이미지, 태그, 해시태그 지원
- **좋아요**: ConcertReviewLike 컬렉션으로 좋아요 관계 관리
- **공개 설정**: isPublic 플래그로 공개/비공개 설정

### 신고 시스템
- **다형성 관계**: 여러 엔티티 타입 지원 (POST, COMMENT, REVIEW, USER)
- **신고 유형**: SPAM, HARASSMENT, INAPPROPRIATE, OTHER
- **상태 관리**: pending, reviewed, resolved, dismissed
- **관리자 처리**: 콘텐츠 숨김/삭제 조치
- **알림**: 신고자에게 처리 결과 FCM 푸시 알림

### 권한 관리
- **역할 기반 접근 제어 (RBAC)**: user, admin, superadmin
- **관리자 기능**: 신고 처리, 콘텐츠 관리, 사용자 관리
- **슈퍼 관리자**: 전체 시스템 관리, 관리자 권한 부여

---

**Last Updated:** 2026-01-24
**Version:** 1.3.0
