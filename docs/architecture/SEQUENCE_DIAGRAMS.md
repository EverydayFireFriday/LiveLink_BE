# Sequence Diagrams - LiveLink API

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

### 1.2 소셜 로그인 (Google OAuth)

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as Express Server
    participant Passport as Passport.js
    participant Google as Google OAuth
    participant UserModel
    participant MongoDB
    participant Session as Redis Session

    User->>Client: "Google로 로그인" 클릭
    Client->>API: GET /auth/google
    API->>Passport: Google OAuth 전략 실행
    Passport->>Google: OAuth 인증 요청
    Google-->>User: Google 로그인 페이지
    User->>Google: 로그인 + 권한 승인
    Google->>API: GET /auth/google/callback?code=...
    API->>Passport: 콜백 처리
    Passport->>Google: 액세스 토큰 교환
    Google-->>Passport: 사용자 프로필

    Passport->>UserModel: findByProviderAndSocialId(google, socialId)
    UserModel->>MongoDB: findOne({provider, socialId})
    MongoDB-->>UserModel: 사용자 또는 null

    alt 기존 사용자
        UserModel-->>Passport: User 객체
    else 신규 사용자
        Passport->>UserModel: createUser({provider, socialId, email, ...})
        UserModel->>MongoDB: insertOne(user)
        MongoDB-->>UserModel: 생성된 사용자
        UserModel-->>Passport: User 객체
    end

    Passport->>Session: serializeUser (사용자 ID 저장)
    Session->>Redis: 세션 데이터 저장
    Redis-->>Session: 세션 ID
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

## 6. Health Check & Monitoring

### 6.1 Readiness Probe

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
