# 서버 용량 분석 및 동접자 수 예측

## 📊 현재 서버 스펙 (Docker 기준)

### Node.js 애플리케이션
- **CPU**: 1 vCPU (최대), 0.5 vCPU (예약)
- **메모리**: 1GB (최대), 512MB (예약)
- **아키텍처**: Single Process (Node.js Event Loop)

### MongoDB
- **CPU**: 1 vCPU (최대), 0.5 vCPU (예약)
- **메모리**: 2GB (최대), 1GB (예약)
- **Connection Pool**:
  - Production: maxPoolSize 50, minPoolSize 10
  - Development: maxPoolSize 20, minPoolSize 5

### Redis
- **CPU**: 0.5 vCPU (최대), 0.25 vCPU (예약)
- **메모리**: 512MB (최대), 256MB (예약)
- **Max Memory Policy**: allkeys-lru
- **Max Memory**: 512MB

## 🎯 예상 동접자 수

### 시나리오별 분석

#### 1. **일반적인 REST API 요청만 사용하는 경우**

**예상 동접자: 500-1,000명**

**계산 근거:**
```
Node.js 메모리: 1GB
평균 요청당 메모리: ~1-2MB (세션, 데이터 처리)
동시 처리 가능 요청: 1000MB / 1.5MB ≈ 666개

MongoDB Connection Pool: 50개 (운영 환경)
평균 요청당 DB 연결 시간: 50-100ms
초당 처리 가능: 50 * (1000ms / 75ms) ≈ 666 요청/초

응답 시간 목표: 200ms 이하
동시 처리: 666 * 0.2 ≈ 133개 동시 요청

사용자당 분당 요청: 2-5회
동접자 = 133 * 60 / 3 ≈ 2,660명 (이론치)

실제 병목: MongoDB Connection Pool, CPU
현실적 동접자: 500-1,000명
```

**제약 요소:**
- MongoDB Connection Pool (50개)
- CPU 1 vCPU (단일 프로세스)
- 복잡한 Aggregation 쿼리 시 성능 저하

---

#### 2. **Socket.IO (실시간 채팅) 사용하는 경우**

**예상 동접자: 2,000-3,000명**

**계산 근거:**
```
WebSocket 연결당 메모리: ~10KB (유휴 상태)
활성 채팅 시 메모리: ~50-100KB (버퍼, 이벤트)

1GB 메모리 기준:
유휴 연결: 1000MB / 0.01MB = 100,000개 (이론치)
활성 연결: 1000MB / 0.075MB ≈ 13,333개 (이론치)

실제 병목: Event Loop + CPU
단일 프로세스 처리 한계: 2,000-5,000 WebSocket

Redis Pub/Sub로 수평 확장 가능
현실적 동접자 (단일 인스턴스): 2,000-3,000명
```

**제약 요소:**
- Node.js Event Loop (CPU 바운드)
- Redis Pub/Sub 처리량
- 채팅 메시지 빈도

---

#### 3. **혼합 사용 (REST API + Socket.IO)**

**예상 동접자: 1,000-2,000명**

**일반적인 사용 패턴:**
- 70% REST API 사용자 (콘서트 조회, 커뮤니티 읽기)
- 30% WebSocket 사용자 (실시간 채팅)

**계산:**
```
REST API 부하: 700명 * 3 req/min = 2,100 req/min (35 req/s)
WebSocket 부하: 300명 활성 연결

메모리 사용:
- REST API: 700 * 1MB (평균) = 700MB
- WebSocket: 300 * 0.05MB = 15MB
- Node.js 기본: 100MB
- 총합: ~815MB (여유 있음)

CPU 사용:
- REST API 처리: 35 req/s * 10ms = 350ms/s (35%)
- WebSocket 이벤트: 50 events/s * 5ms = 250ms/s (25%)
- 총 CPU 사용률: ~60%

현실적 동접자: 1,000-2,000명
```

---

## 🚨 병목 지점 분석

### 1. **MongoDB Connection Pool** (가장 중요!)

현재 설정: 50개 (운영 환경)

```
평균 쿼리 시간: 50ms
초당 처리 가능: 50 * (1000 / 50) = 1,000 쿼리/초

사용자당 평균 쿼리: 2-3개 (페이지 로드 시)
초당 처리 가능 사용자: 1000 / 2.5 = 400명

동접자 (분당 1회 요청 가정): 400 * 60 = 24,000명 (이론치)
동접자 (분당 3회 요청 가정): 400 * 20 = 8,000명
```

**최적화 후 (N+1 쿼리 제거):**
- 페이지 로드당 쿼리 수: 2-3개 → 1-2개
- **처리량 50% 향상**

### 2. **CPU (1 vCPU)**

```
Node.js는 단일 스레드
1 vCPU = 1000ms/s 처리 능력

평균 요청 처리 시간: 10-20ms (CPU 시간)
초당 처리: 1000 / 15 ≈ 66 요청/초

동접자 (분당 3회 요청): 66 * 20 = 1,320명
```

### 3. **메모리 (1GB)**

```
Node.js 힙: ~200-400MB (기본)
세션 스토어 (Redis): 외부
MongoDB Driver: ~50MB
Socket.IO: ~50MB

사용 가능 메모리: ~500-700MB

요청당 메모리: 1-2MB (평균)
동시 처리: 500 / 1.5 ≈ 333개
```

### 4. **Redis (512MB)**

```
세션 저장: ~5KB/세션
캐시 데이터: ~100MB (평균)

세션 저장 가능: 400MB / 5KB = 80,000명
Socket.IO Pub/Sub: 메모리 사용 적음

병목 아님 (충분함)
```

---

## 📈 부하 테스트 결과 예측

### 가벼운 엔드포인트 (GET /health)
```bash
ab -n 10000 -c 100 http://localhost:3000/health

예상 결과:
- RPS: 2,000-3,000 req/s
- 평균 응답 시간: 30-50ms
- P95: 100ms
- P99: 200ms
```

### 일반 API (GET /api/concerts)
```bash
ab -n 1000 -c 50 http://localhost:3000/api/concerts

예상 결과:
- RPS: 200-400 req/s
- 평균 응답 시간: 100-200ms
- P95: 500ms
- P99: 1,000ms
```

### 복잡한 쿼리 (Aggregation Pipeline)
```bash
예상 결과:
- RPS: 50-100 req/s
- 평균 응답 시간: 500-1,000ms
- P95: 2,000ms
- P99: 5,000ms
```

---

## ⚡ 성능 개선 권장사항

### 즉시 적용 가능 (무료)

#### 1. **Node.js 클러스터 모드** (CPU 활용률 향상)

```javascript
// src/cluster.ts
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Master process starting ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  require('./app');
}
```

**효과:**
- CPU 활용률: 100% → 400% (4코어 기준)
- 처리량: 2-4배 증가
- **예상 동접자: 2,000-4,000명**

**Docker Compose 수정:**
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '4.0'  # 1.0 → 4.0
          memory: 2G   # 1G → 2G
```

#### 2. **Redis 캐싱 강화**

```typescript
// 자주 조회되는 데이터 캐싱
const CACHE_TTL = {
  CONCERTS_LIST: 300,      // 5분
  CONCERT_DETAIL: 600,     // 10분
  POPULAR_TAGS: 3600,      // 1시간
  CATEGORIES: 7200,        // 2시간
};

// 캐시 워밍은 이미 구현됨 (cacheWarming.ts)
```

**효과:**
- DB 쿼리 감소: 70-80%
- 응답 시간: 200ms → 10-20ms
- **예상 동접자: +50% 증가**

#### 3. **MongoDB 인덱스 최적화**

```javascript
// 이미 구현된 인덱스 확인
db.concerts.getIndexes()

// 추가 권장 인덱스
db.concerts.createIndex({ status: 1, datetime: 1 })  // 상태별 정렬
db.concerts.createIndex({ category: 1, likesCount: -1 })  // 카테고리별 인기순
db.articles.createIndex({ createdAt: -1, viewCount: -1 })  // 최신/인기 정렬
```

**효과:**
- 쿼리 속도: 500ms → 50ms (10배)
- **예상 동접자: +30% 증가**

#### 4. **Connection Pool 튜닝**

```typescript
// src/config/database/mongoConfig.ts
const productionDefaults = {
  maxPoolSize: 100,        // 50 → 100
  minPoolSize: 20,         // 10 → 20
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
};
```

**주의:** MongoDB Atlas 등 클라우드 서비스는 플랜별 제한 확인 필요

**효과:**
- DB 병목 완화
- **예상 동접자: +20% 증가**

---

### 인프라 확장 (비용 발생)

#### 1. **수평 확장 (Horizontal Scaling)**

**현재 구성:**
```
1 Node.js 인스턴스
1 MongoDB
1 Redis
```

**권장 구성 (중규모):**
```
3-5 Node.js 인스턴스 (로드 밸런서)
1 MongoDB Replica Set (Primary + 2 Secondary)
1 Redis Cluster (3 nodes)
```

**예상 처리량:**
- 동접자: 5,000-10,000명
- 비용: 월 $100-300 (AWS, DigitalOcean 기준)

#### 2. **Auto Scaling**

```yaml
# Kubernetes HPA 예시
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: livelink-api
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**예상 처리량:**
- 동접자: 10,000-50,000명 (자동 조정)
- 비용: 부하에 따라 변동

#### 3. **CDN + 정적 캐싱**

```
Cloudflare / AWS CloudFront
- 이미지, CSS, JS 캐싱
- API 응답 캐싱 (Cache-Control 헤더)
```

**효과:**
- Origin 서버 부하 70-80% 감소
- 전 세계 레이턴시 개선

---

## 🎯 시나리오별 권장 구성

### 1. **MVP / 베타 테스트 (100-500명)**
```yaml
현재 구성 그대로 사용 가능
- CPU: 1 vCPU
- Memory: 1GB
- 비용: 최소화
```

### 2. **소규모 서비스 (500-2,000명)**
```yaml
Node.js 클러스터 모드 + 캐싱 강화
- CPU: 2-4 vCPU
- Memory: 2GB
- Redis 캐시 적극 활용
- 비용: 월 $30-50
```

### 3. **중규모 서비스 (2,000-10,000명)**
```yaml
수평 확장 + Auto Scaling
- Node.js: 3-5 인스턴스
- MongoDB Replica Set
- Redis Cluster
- 로드 밸런서 (Nginx/HAProxy)
- 비용: 월 $200-500
```

### 4. **대규모 서비스 (10,000명 이상)**
```yaml
Kubernetes + CDN + 전문 관리
- Node.js: Auto Scaling (2-20 pods)
- MongoDB Atlas (M30+)
- Redis Cluster (AWS ElastiCache)
- CDN (Cloudflare Pro)
- 모니터링 (Datadog, New Relic)
- 비용: 월 $1,000+
```

---

## 📊 실시간 모니터링 지표

### Grafana 대시보드에서 확인할 지표

#### 1. **용량 한계 경고 신호**
```promql
# CPU 사용률 > 80%
(rate(process_cpu_user_seconds_total[1m]) * 100) > 80

# 메모리 사용률 > 85%
(process_resident_memory_bytes / 1024 / 1024 / 1024) > 0.85

# 응답 시간 P95 > 1초
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1

# 활성 연결 > 800
active_connections > 800
```

#### 2. **스케일 아웃 필요 시점**
- 평균 CPU 사용률 > 70% (지속 10분)
- P95 응답 시간 > 500ms (지속 5분)
- 에러율 > 1%
- Redis 메모리 > 400MB

---

## 💡 결론 및 권장사항

### 현재 구성으로 감당 가능한 동접자

| 사용 패턴 | 동접자 수 | 신뢰도 |
|----------|----------|--------|
| REST API만 | **500-1,000명** | ⭐⭐⭐⭐ |
| Socket.IO만 | **2,000-3,000명** | ⭐⭐⭐⭐ |
| 혼합 사용 (권장) | **1,000-2,000명** | ⭐⭐⭐⭐⭐ |

### 단계별 확장 로드맵

1. **0-500명**: 현재 구성 유지
2. **500-2,000명**: 클러스터 모드 + 캐싱 강화
3. **2,000-5,000명**: 수평 확장 (3-5 인스턴스)
4. **5,000명 이상**: Kubernetes + Auto Scaling

### 즉시 적용 가능한 최적화

```bash
# 1. 클러스터 모드 활성화
NODE_ENV=production UV_THREADPOOL_SIZE=128 node -r cluster.js dist/app.js

# 2. Docker 리소스 증가
docker-compose.yml에서 CPU 2-4, Memory 2GB로 변경

# 3. MongoDB Connection Pool 증가
MONGO_MAX_POOL_SIZE=100 환경변수 추가

# 4. Redis 메모리 증가
docker-compose.yml에서 512MB → 1GB
```

**예상 효과:**
- **현재**: 1,000-2,000명
- **최적화 후**: 3,000-5,000명 (2-3배 증가)
- **추가 비용**: $0 (리소스 할당만 변경)
