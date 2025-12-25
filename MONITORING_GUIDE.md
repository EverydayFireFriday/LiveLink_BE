# Grafana & Prometheus 모니터링 가이드

## 🚀 빠른 시작

### 1. 모니터링 스택 실행

```bash
# 전체 스택 실행 (앱 + DB + 모니터링)
docker-compose up -d

# 모니터링만 실행 (로컬 개발 서버와 함께 사용)
docker-compose up -d prometheus grafana mongodb-exporter redis-exporter
```

### 2. 접속 URL

| 서비스 | URL | 기본 계정 |
|--------|-----|-----------|
| **Grafana** | http://localhost:3001 | admin / changeme_in_production |
| **Prometheus** | http://localhost:9090 | 인증 없음 |
| **Node.js App** | http://localhost:3000/metrics | 메트릭 엔드포인트 |
| **MongoDB Exporter** | http://localhost:9216/metrics | - |
| **Redis Exporter** | http://localhost:9121/metrics | - |

## 📊 모니터링 대시보드

### Grafana 대시보드 자동 구성

프로젝트에는 다음 대시보드가 자동으로 프로비저닝됩니다:

- **Node.js Application Monitoring** (`grafana/provisioning/dashboards/files/nodejs-app-monitoring.json`)
  - API 응답 시간
  - HTTP 요청 카운트
  - 에러율
  - 활성 연결 수
  - 메모리/CPU 사용량

### 수동 대시보드 추가

1. Grafana에 로그인 (http://localhost:3001)
2. 좌측 메뉴 → **Dashboards** → **Import**
3. Grafana.com에서 추천 대시보드 ID 입력:
   - **Node.js Application Dashboard**: `11159`
   - **MongoDB Dashboard**: `2583`
   - **Redis Dashboard**: `11835`

## 🔍 주요 메트릭

### Node.js 애플리케이션

현재 구현된 메트릭 (`src/config/metrics/prometheus.ts`):

```javascript
// HTTP 요청 메트릭
http_request_duration_seconds  // 응답 시간 히스토그램
http_request_total             // 총 요청 수
http_errors_total              // 에러 카운트

// 시스템 메트릭
active_connections             // 활성 연결 수
redis_connection_status        // Redis 연결 상태 (0/1)

// 프로세스 메트릭 (자동 수집)
process_cpu_user_seconds_total
process_resident_memory_bytes
nodejs_heap_size_total_bytes
```

### Health Check 메트릭 (신규 추가!)

새로 구현한 `/health` 엔드포인트는 다음 정보를 제공합니다:

```json
{
  "status": "healthy|degraded|unhealthy",
  "system": {
    "memory": {
      "total": 16384,
      "free": 1481,
      "usagePercent": 90.96,
      "status": "healthy|warning|critical"
    },
    "cpu": {
      "cores": 12,
      "usagePercent": 39.85,
      "status": "healthy|warning|critical"
    },
    "disk": {
      "total": 948584,
      "usagePercent": 2,
      "status": "healthy|warning|critical"
    }
  },
  "external": [
    {
      "name": "Redis",
      "status": "up|down|degraded",
      "responseTime": 0
    }
  ],
  "issues": ["메모리 사용량 위험 (97%)"]
}
```

## 🎯 Prometheus 쿼리 예제

### API 성능 모니터링

```promql
# 평균 응답 시간 (최근 5분)
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# 초당 요청 수 (RPS)
rate(http_request_total[1m])

# 에러율 (%)
(rate(http_errors_total[5m]) / rate(http_request_total[5m])) * 100

# P95 응답 시간
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99 응답 시간
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

### Slow API 감지

```promql
# 500ms 이상 걸리는 요청 비율
sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))
```

### 시스템 리소스

```promql
# 메모리 사용량 (MB)
process_resident_memory_bytes / 1024 / 1024

# CPU 사용률
rate(process_cpu_user_seconds_total[1m]) * 100

# 힙 메모리 사용률
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100
```

### MongoDB 메트릭

```promql
# 활성 연결 수
mongodb_connections{state="current"}

# 초당 쿼리 수
rate(mongodb_op_counters_total[1m])

# 느린 쿼리 감지
mongodb_mongod_metrics_query_executor_scanned_objects_total
```

### Redis 메트릭

```promql
# 메모리 사용량
redis_memory_used_bytes / 1024 / 1024

# 초당 명령 수
rate(redis_commands_processed_total[1m])

# 캐시 히트율
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

## ⚠️ 알림 설정

### Prometheus Alerting Rules

`config/prometheus-alerts.yml` 생성 (선택사항):

```yaml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      # 높은 에러율 알림
      - alert: HighErrorRate
        expr: (rate(http_errors_total[5m]) / rate(http_request_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "높은 에러율 감지 ({{ $value }}%)"
          description: "최근 5분간 에러율이 5%를 초과했습니다."

      # Slow API 알림
      - alert: SlowAPIResponse
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "API 응답 시간 느림 (P95: {{ $value }}초)"
          description: "P95 응답 시간이 1초를 초과했습니다."

      # 메모리 부족 알림
      - alert: HighMemoryUsage
        expr: (process_resident_memory_bytes / 1024 / 1024) > 800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "높은 메모리 사용량 ({{ $value }}MB)"
          description: "애플리케이션 메모리 사용량이 800MB를 초과했습니다."

      # Redis 연결 끊김
      - alert: RedisDown
        expr: redis_connection_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis 연결 끊김"
          description: "Redis 연결이 끊어졌습니다. 즉시 확인이 필요합니다."
```

Prometheus에 알림 룰 적용:

```yaml
# docker-compose.yml의 prometheus 서비스에 추가
volumes:
  - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
  - ./config/prometheus-alerts.yml:/etc/prometheus/alerts.yml:ro  # 추가

command:
  - '--config.file=/etc/prometheus/prometheus.yml'
  - '--storage.tsdb.path=/prometheus'
  - '--web.enable-lifecycle'
```

## 🛠 개발 환경 설정

### 로컬 개발 서버와 함께 사용

```bash
# 터미널 1: 로컬 개발 서버 실행
npm run dev

# 터미널 2: 모니터링 스택만 실행
docker-compose up -d prometheus grafana mongodb-exporter redis-exporter
```

**중요**: 로컬 개발 시 Prometheus 설정 수정 필요

`config/prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'nodejs-app'
    metrics_path: '/metrics'
    static_configs:
      # Docker 환경
      # - targets: ['app:3000']

      # 로컬 개발 환경 (Mac/Linux)
      - targets: ['host.docker.internal:3000']
```

## 📈 커스텀 대시보드 생성

### Grafana에서 패널 추가 예시

1. **API 응답 시간 그래프**:
   ```promql
   rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
   ```

2. **엔드포인트별 요청 수**:
   ```promql
   sum(rate(http_request_total[5m])) by (route, method)
   ```

3. **상태 코드별 분포**:
   ```promql
   sum(rate(http_request_total[5m])) by (status)
   ```

4. **활성 연결 수 (실시간)**:
   ```promql
   active_connections
   ```

## 🔐 보안 설정 (운영 환경)

### 1. Grafana 비밀번호 변경

`.env.production` 파일:
```bash
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=매우강력한비밀번호123!@#
```

### 2. 외부 접근 차단

```yaml
# docker-compose.yml
services:
  grafana:
    ports:
      - "127.0.0.1:3001:3000"  # 로컬호스트만 접근 가능

  prometheus:
    ports:
      - "127.0.0.1:9090:9090"  # 로컬호스트만 접근 가능
```

### 3. Nginx 리버스 프록시 설정

```nginx
# Grafana (HTTPS 필수)
location /grafana/ {
    proxy_pass http://localhost:3001/;
    proxy_set_header Host $host;
    auth_basic "Monitoring Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

## 🧹 유지보수

### 데이터 정리

```bash
# Prometheus 데이터 삭제 (30일 이전 데이터)
# prometheus.yml에서 설정됨: --storage.tsdb.retention.time=30d

# 전체 데이터 초기화
docker-compose down -v  # 모든 볼륨 삭제
docker-compose up -d    # 재시작
```

### 로그 확인

```bash
# Prometheus 로그
docker-compose logs -f prometheus

# Grafana 로그
docker-compose logs -f grafana

# 모든 서비스 로그
docker-compose logs -f
```

## 📚 추가 리소스

- [Prometheus 공식 문서](https://prometheus.io/docs/)
- [Grafana 공식 문서](https://grafana.com/docs/)
- [PromQL 치트시트](https://promlabs.com/promql-cheat-sheet/)
- [Grafana 대시보드 갤러리](https://grafana.com/grafana/dashboards/)

## 🎓 베스트 프랙티스

1. **메트릭 이름 규칙**:
   - Snake case 사용: `http_request_duration_seconds`
   - 단위 포함: `_bytes`, `_seconds`, `_total`

2. **카디널리티 주의**:
   - 레이블 값이 무한정 증가하지 않도록 주의
   - 사용자 ID 같은 고유값은 레이블로 사용하지 말 것

3. **대시보드 구성**:
   - Overview → Detailed 순서로 구성
   - 중요 메트릭을 상단에 배치
   - 시간 범위는 유연하게 설정 가능하도록

4. **알림 설정**:
   - 너무 많은 알림은 피로도 증가
   - 실제 액션이 필요한 경우만 알림
   - 알림 메시지에 해결 방법 포함
