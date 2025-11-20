# stagelives Backend - 아키텍처

**서비스명**: stagelives

## 상위 레벨 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Web App    │  │  Mobile App  │  │    Admin     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          │  HTTP/HTTPS      │  HTTP/HTTPS      │  HTTP/HTTPS
          │  WebSocket       │  WebSocket       │
          ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway / Load Balancer               │
└─────────────────────────────────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────────────────────┐
│              Express.js Application Server                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           Middleware Stack                            │ │
│  │  • CORS, Helmet, Morgan                               │ │
│  │  • Rate Limiting (Redis-backed)                       │ │
│  │  • Session Management (Redis Store)                   │ │
│  │  • Passport OAuth (Google, Apple)                     │ │
│  │  • Brute Force Protection                             │ │
│  │  • Security (Sanitization, HPP)                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               API Routes                              │ │
│  │  • /auth          (Authentication)                    │ │
│  │  • /concert       (Concert Management)                │ │
│  │  • /article       (Articles/Community)                │ │
│  │  • /chat          (Real-time Chat)                    │ │
│  │  • /setlist       (Concert Setlists)                  │ │
│  │  • /notification  (Push Notifications)                │ │
│  │  • /health        (Health Checks)                     │ │
│  │  • /graphql       (GraphQL API)                       │ │
│  │  • /api-docs      (Swagger UI)                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │          Controllers → Services → Models              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Socket.IO Server                         │ │
│  │  • Real-time Chat                                     │ │
│  │  • Session-based Authentication                       │ │
│  │  • Room Management                                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │          Background Jobs / Schedulers                 │ │
│  │  • Concert Status Automation (node-cron)              │ │
│  │  • Notification Workers (ticket, concert start)       │ │
│  │  • Session Cleanup (TTL-based)                        │ │
│  │  • Notification Recovery (server restart)             │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
          │                              │
          ↓                              ↓
┌────────────────────┐        ┌────────────────────┐
│   MongoDB Cluster  │        │    Redis Cluster   │
│                    │        │                    │
│ • stagelives       │        │ • Session Store    │
│   (users, sessions)│        │ • Rate Limiting    │
│ • concerts         │        │ • Brute Force      │
│ • articles         │        │ • Caching          │
│ • chat             │        │                    │
│ • setlists         │        └────────────────────┘
└────────────────────┘
          │
          ↓
┌────────────────────┐
│ Firebase Cloud     │
│ Messaging (FCM)    │
│ • Push Notifications│
└────────────────────┘
```

## 계층형 아키텍처

### 1. 프레젠테이션 계층 (Routes & Controllers)
- **Routes**: API 엔드포인트와 미들웨어 체인 정의
- **Controllers**: HTTP 요청/응답 처리, 입력 유효성 검사
- **책임**: 요청 파싱, 응답 포맷팅, 에러 전파

### 2. 비즈니스 로직 계층 (Services)
- **Auth Services**: 사용자 인증, OAuth, 비밀번호 관리
- **Concert Services**: 콘서트 CRUD, 검색, 좋아요 기능
- **Article Services**: 게시글 CRUD, 댓글, 좋아요, 북마크
- **Chat Services**: 실시간 메시징, 방 관리
- **Notification Services**: FCM 푸시, 예약 알림, 워커
- **Setlist Services**: YouTube Music 및 Spotify 플레이리스트 통합
- **Security Services**: 무차별 대입 공격 방어, 세션 검증

### 3. 데이터 접근 계층 (Models)
- **MongoDB Models**: Native Driver를 사용한 직접 데이터베이스 작업
- **Data Validation**: 모델 수준의 스키마 유효성 검사
- **Indexing**: 데이터베이스 인덱스를 통한 성능 최적화
- **Relationships**: ObjectId를 통한 외래 키 참조

### 4. 인프라 계층 (Utils & Config)
- **Database**: 연결 관리, 커넥션 풀링
- **Cache**: Redis 클라이언트, 캐시 무효화 전략
- **Logger**: Winston 구조화 로깅
- **Config**: 환경 기반 설정

## 데이터 흐름

### 일반적인 요청 흐름

```
1. 클라이언트 요청
   ↓
2. 미들웨어 체인 (CORS → Rate Limit → Session → Auth)
   ↓
3. 라우트 핸들러
   ↓
4. 컨트롤러 (입력 유효성 검사)
   ↓
5. 서비스 계층 (비즈니스 로직)
   ↓
6. 모델 계층 (데이터베이스 작업)
   ↓
7. 데이터베이스 (MongoDB)
   ↓
8. 계층을 통한 응답 반환
   ↓
9. 클라이언트 응답
```

### 실시간 채팅 흐름

```
1. 클라이언트가 Socket.IO를 통해 연결
   ↓
2. 세션 인증
   ↓
3. 사용자가 방에 입장
   ↓
4. 메시지 전송
   ↓
5. 메시지를 MongoDB에 저장
   ↓
6. 방 참여자에게 브로드캐스트 (Socket.IO)
   ↓
7. 클라이언트가 실시간 업데이트 수신
```

### 알림 흐름

```
1. 사용자가 콘서트에 좋아요
   ↓
2. 콘서트 티켓 오픈 날짜 확인
   ↓
3. 사용자 선호도에 따라 알림 예약
   ↓
4. ScheduledNotification 컬렉션에 저장
   ↓
5. Cron job이 대기 중인 알림 확인
   ↓
6. FCM 푸시 알림 전송
   ↓
7. 알림 상태 업데이트 (sent/failed)
   ↓
8. NotificationHistory 컬렉션에 저장
```

## 데이터베이스 아키텍처

### 데이터베이스 구성

1. **Primary DB (stagelives)**: 사용자 데이터, 세션, 알림
2. **Concert DB (concerts)**: 콘서트 정보
3. **Article DB (articles)**: 커뮤니티 콘텐츠
4. **Chat DB (chat)**: 채팅방 및 메시지
5. **Setlist DB (setlists)**: 플레이리스트 URL이 포함된 콘서트 셋리스트

### 인덱스 전략

- **Unique Indexes**: 중복 방지 (email, username, OAuth provider+socialId)
- **Compound Indexes**: 다중 필드 쿼리 최적화 (userId+status, concertId+status)
- **Text Indexes**: 전문 검색 (콘서트 제목/설명, 게시글 내용)
- **TTL Indexes**: 자동 삭제 (만료된 세션, 오래된 알림)
- **Sparse Indexes**: 선택적 필드 (OAuth providers)

## 보안 아키텍처

### 심층 방어

1. **네트워크 레벨**: CORS, Helmet 헤더
2. **애플리케이션 레벨**: Rate limiting, 무차별 대입 공격 방어
3. **입력 유효성 검사**: Joi/Zod 스키마, 정제 (XSS, NoSQL injection)
4. **인증**: Redis 기반 세션, OAuth 통합
5. **권한 부여**: 역할 기반 접근 제어 (RBAC) 준비
6. **세션 보안**: HttpOnly 쿠키, SameSite, Secure 플래그
7. **데이터 보호**: 비밀번호 해싱 (bcrypt), 민감 데이터 암호화

### Rate Limiting 전략

- **기본**: 100 요청/60초 (일반 엔드포인트)
- **엄격**: 20 요청/60초 (로그인, 회원가입)
- **완화**: 200 요청/60초 (공개 읽기 전용 엔드포인트)
- **분산**: 다중 인스턴스 배포를 위한 Redis 기반

### 무차별 대입 공격 방어

- **로그인 시도**: 이메일당 최대 5회 시도
- **잠금 기간**: 30분
- **상태 추적**: TTL이 적용된 Redis
- **우아한 성능 저하**: Redis를 사용할 수 없는 경우 경고 로그

## 확장성 고려사항

### 수평적 확장

- **Stateless API**: 세션을 메모리가 아닌 Redis에 저장
- **Load Balancing**: 로드 밸런서 뒤에 여러 Express 인스턴스
- **Socket.IO Adapter**: 다중 인스턴스 지원을 위한 Redis 어댑터
- **Shared Cache**: 분산 캐싱을 위한 Redis

### 성능 최적화

1. **Connection Pooling**: MongoDB 및 Redis 커넥션 풀
2. **Database Indexing**: 적절한 인덱스를 사용한 최적화된 쿼리
3. **Caching Strategy**: 자주 액세스하는 데이터를 Redis에 캐싱
4. **Pagination**: 메모리 문제 방지를 위한 결과 집합 제한
5. **Bulk Operations**: 알림을 위한 N+1 쿼리 최적화
6. **Lazy Loading**: 필요할 때만 관련 데이터 로드

### 모니터링 및 안정성

- **Health Checks**: Kubernetes 호환 준비 상태/활성 상태 프로브
- **Metrics**: 모니터링을 위한 Prometheus 메트릭
- **Logging**: Winston을 사용한 구조화된 로그 (일별 로테이션)
- **Graceful Shutdown**: SIGTERM 시 깨끗한 연결 종료
- **Error Handling**: 중앙 집중식 에러 처리 미들웨어

## 배포 아키텍처

```
┌─────────────────────────────────────────────────────┐
│              Kubernetes Cluster                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Ingress Controller (NGINX)                  │  │
│  │  • SSL Termination                           │  │
│  │  • Load Balancing                            │  │
│  └──────────────────────────────────────────────┘  │
│                      │                              │
│  ┌───────────────────┴──────────────────────────┐  │
│  │  LiveLink API Pods (Replicas: 3+)           │  │
│  │  • Express.js App                            │  │
│  │  • Socket.IO Server                          │  │
│  │  • Background Workers                        │  │
│  └──────────────────────────────────────────────┘  │
│                      │                              │
│  ┌───────────────────┴──────────────────────────┐  │
│  │  Services                                    │  │
│  │  • MongoDB (StatefulSet)                     │  │
│  │  • Redis (StatefulSet)                       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 주요 아키텍처 패턴

1. **Dependency Injection**: 컨트롤러에 서비스 주입
2. **Repository Pattern**: 모델 계층이 데이터베이스 작업을 추상화
3. **Middleware Pattern**: 조합 가능한 요청 처리 파이프라인
4. **Observer Pattern**: 실시간 업데이트를 위한 이벤트 기반 아키텍처
5. **Strategy Pattern**: 다양한 Rate limiting 전략
6. **Singleton Pattern**: 데이터베이스 연결, Redis 클라이언트
7. **Factory Pattern**: 모델 초기화
8. **Mixin Pattern**: Concert 모델 기능 구성

## 향후 아키텍처 고려사항

1. **Microservices**: auth, concert, chat, notification 서비스로 분리 가능
2. **Message Queue**: 비동기 작업 처리를 위한 RabbitMQ/Kafka
3. **CDN**: 정적 자산 전달 (이미지, 비디오)
4. **GraphQL Federation**: 분산 GraphQL 스키마
5. **Service Mesh**: 고급 라우팅 및 관찰성을 위한 Istio
6. **Event Sourcing**: 중요한 작업에 대한 감사 추적

---

**최종 업데이트**: 2025-11-20
**버전**: 1.1.0
