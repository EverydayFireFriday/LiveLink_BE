# Socket.IO 수평 확장(Horizontal Scaling) 가이드

## 개요

이 가이드는 Socket.IO Redis adapter를 사용하여 애플리케이션을 수평 확장하는 방법을 설명합니다.

## 주요 변경사항

### 1. Redis Adapter 설치

Socket.IO가 여러 서버 인스턴스 간에 이벤트를 동기화할 수 있도록 Redis adapter가 추가되었습니다.

```bash
npm install @socket.io/redis-adapter
```

### 2. 아키텍처 개요

```
┌─────────────┐
│   Client 1  │──┐
└─────────────┘  │
                 │     ┌──────────────┐
┌─────────────┐  ├────▶│     Nginx    │
│   Client 2  │──┤     │ Load Balancer│
└─────────────┘  │     └──────────────┘
                 │            │
┌─────────────┐  │            ├─────────────────┐
│   Client 3  │──┘            │                 │
└─────────────┘               ▼                 ▼
                       ┌─────────────┐   ┌─────────────┐
                       │   Server 1  │   │   Server 2  │
                       │  (app:3000) │   │  (app2:3000)│
                       └─────────────┘   └─────────────┘
                              │                 │
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │  Redis Pub/Sub  │
                              │  (ioredis)      │
                              └─────────────────┘
```

### 3. 파일 구조

```
src/
├── config/
│   └── redis/
│       ├── redisClient.ts          # 세션 스토어용 Redis 클라이언트
│       └── socketRedisClient.ts    # Socket.IO adapter용 Redis 클라이언트 (신규)
├── socket/
│   └── socketServer.ts             # Redis adapter 적용됨
└── app.ts                          # Socket.IO Redis 연결 초기화 추가
config/
└── nginx.conf                      # Upstream 및 sticky session 설정 추가
```

## 설정 방법

### 1. 환경 변수

`.env` 파일에 다음 환경 변수가 설정되어 있는지 확인하세요:

```env
REDIS_URL=redis://localhost:6379
```

기존 `REDIS_URL` 환경 변수를 Socket.IO Redis adapter도 공유하여 사용합니다.

### 2. Socket.IO 서버 설정

`src/socket/socketServer.ts`에 Redis adapter가 자동으로 적용됩니다:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from '../config/redis/socketRedisClient';

// Constructor에서 자동으로 설정됨
this.io.adapter(createAdapter(pubClient, subClient));
```

### 3. Nginx 로드 밸런서 설정

`config/nginx.conf` 파일에서 upstream 블록을 확인하세요:

```nginx
upstream app_backend {
    # ip_hash: sticky session 구현
    ip_hash;

    # 서버 인스턴스 추가
    server app:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;  # 추가 서버
    server app3:3000 max_fails=3 fail_timeout=30s;  # 추가 서버

    keepalive 32;
}
```

#### Sticky Session 옵션

1. **ip_hash** (현재 설정)
   - 장점: 설정 간단, 추가 모듈 불필요
   - 단점: 같은 IP의 다수 사용자가 한 서버에 몰릴 수 있음

2. **sticky cookie** (nginx-plus 또는 nginx-sticky-module 필요)
   ```nginx
   upstream app_backend {
       server app:3000;
       server app2:3000;
       sticky cookie srv_id expires=1h domain=.example.com path=/;
   }
   ```

## 배포 시나리오

### Docker Compose로 다중 인스턴스 실행

`docker-compose.yml` 예시:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app1
      - app2
    networks:
      - app-network

  app1:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - PORT=3000
    depends_on:
      - redis
      - mongodb
    networks:
      - app-network

  app2:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - PORT=3000
    depends_on:
      - redis
      - mongodb
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - app-network

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Kubernetes 배포

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  replicas: 3  # 3개의 인스턴스 실행
  selector:
    matchLabels:
      app: stagelives
  template:
    metadata:
      labels:
        app: stagelives
    spec:
      containers:
      - name: app
        image: your-registry/stagelives:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: mongo-uri
```

#### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: stagelives
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  sessionAffinity: ClientIP  # Sticky session 구현
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

### PM2 클러스터 모드

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'stagelives',
    script: 'dist/app.js',
    instances: 4,  // CPU 코어 수만큼 또는 'max'
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      REDIS_URL: 'redis://localhost:6379'
    }
  }]
};
```

## 테스트 방법

### 1. Redis 연결 확인

서버 시작 로그에서 다음 메시지를 확인:

```
✅ Socket.IO Redis Pub client connected
✅ Socket.IO Redis Sub client connected
✅ Socket.IO Redis clients ready
✅ Socket.IO Redis adapter enabled - Horizontal scaling ready
```

### 2. 수평 확장 동작 확인

#### 테스트 시나리오:
1. 2개 이상의 서버 인스턴스 실행
2. Client 1을 Server 1에 연결
3. Client 2를 Server 2에 연결
4. Client 1이 채팅 메시지 전송
5. Client 2가 메시지를 수신하는지 확인

#### Socket.IO 클라이언트 테스트 코드:

```typescript
import io from 'socket.io-client';

const socket1 = io('http://localhost');
const socket2 = io('http://localhost');

socket1.on('connect', () => {
  console.log('Socket 1 connected:', socket1.id);
  socket1.emit('joinRoom', 'test-room');
});

socket2.on('connect', () => {
  console.log('Socket 2 connected:', socket2.id);
  socket2.emit('joinRoom', 'test-room');
});

socket2.on('message', (message) => {
  console.log('Socket 2 received message:', message);
});

// Socket 1에서 메시지 전송
setTimeout(() => {
  socket1.emit('sendMessage', 'test-room', {
    content: 'Hello from Socket 1!',
    type: 'text'
  });
}, 2000);
```

### 3. 로드 테스트

```bash
# Artillery를 사용한 부하 테스트
npm install -g artillery

# artillery.yml 생성
cat > artillery.yml << EOF
config:
  target: 'http://localhost'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
  socketio:
    transports: ["websocket"]

scenarios:
  - name: "Socket.IO Chat Test"
    engine: socketio
    flow:
      - emit:
          channel: "joinRoom"
          data: "test-room"
      - think: 2
      - emit:
          channel: "sendMessage"
          data:
            roomId: "test-room"
            content: "Load test message"
            type: "text"
      - think: 5
EOF

# 실행
artillery run artillery.yml
```

## 모니터링

### Redis 연결 상태 확인

```bash
# Redis CLI에서
redis-cli
> CLIENT LIST
> PUBSUB CHANNELS
> PUBSUB NUMSUB socket.io#*
```

### Prometheus Metrics

애플리케이션은 `/metrics` 엔드포인트에서 다음 메트릭을 제공합니다:

- `redis_connection_status`: Redis 연결 상태 (1 = 연결됨, 0 = 연결 끊김)
- `http_active_connections`: 활성 HTTP 연결 수
- `http_requests_total`: 총 HTTP 요청 수

### Health Check

```bash
# Readiness probe - 모든 서비스 준비 상태 확인
curl http://localhost:3000/health/readiness

# Liveness probe - 서버 생존 확인
curl http://localhost:3000/health/liveness
```

## 트러블슈팅

### 1. Redis 연결 실패

**증상:**
```
⚠️ Socket.IO Redis connection failed. Socket.IO will run in single-server mode.
```

**해결 방법:**
- Redis 서버가 실행 중인지 확인
- `REDIS_URL` 환경 변수가 올바른지 확인
- 방화벽 설정 확인

### 2. 메시지가 다른 서버의 클라이언트에 전달되지 않음

**원인:**
- Redis adapter가 제대로 설정되지 않음
- Redis pub/sub이 작동하지 않음

**해결 방법:**
```bash
# Redis에서 pub/sub 활동 모니터링
redis-cli MONITOR

# Socket.IO 로그 레벨 증가
LOG_LEVEL=debug npm start
```

### 3. Nginx sticky session이 작동하지 않음

**확인 사항:**
- `ip_hash` 설정이 upstream 블록에 있는지 확인
- Nginx 설정 구문 검사: `nginx -t`
- Nginx 재시작: `nginx -s reload`

### 4. PM2 클러스터 모드에서 세션 유지 안됨

**해결 방법:**
Redis 세션 스토어가 제대로 설정되어 있는지 확인:

```typescript
// app.ts에서
sessionConfig.store = new RedisStore({
  client: redisClient,
  prefix: 'app:sess:',
});
```

## 성능 최적화

### 1. Redis 연결 풀 설정

`src/config/redis/socketRedisClient.ts`에서:

```typescript
const redisOptions: Redis.RedisOptions = {
  // ... 기존 설정
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};
```

### 2. Nginx keepalive 최적화

```nginx
upstream app_backend {
    ip_hash;
    server app:3000;
    server app2:3000;

    # keepalive 연결 수 증가
    keepalive 64;
    keepalive_requests 100;
    keepalive_timeout 60s;
}
```

### 3. Socket.IO 설정 최적화

```typescript
// socketServer.ts
this.io = new SocketServer(httpServer, {
  cors: { /* ... */ },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
});
```

## 참고 자료

- [Socket.IO Redis Adapter 공식 문서](https://socket.io/docs/v4/redis-adapter/)
- [Nginx Load Balancing](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [Kubernetes Service](https://kubernetes.io/docs/concepts/services-networking/service/)
