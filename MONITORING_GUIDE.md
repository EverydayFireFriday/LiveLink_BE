# 📊 Grafana & Prometheus 모니터링 가이드

## 개요

이 프로젝트는 Grafana와 Prometheus를 사용하여 Node.js 애플리케이션의 성능과 상태를 모니터링합니다.

## 구성 요소

### 1. Prometheus (메트릭 수집)
- **포트**: 9090
- **엔드포인트**: http://localhost:9090
- **역할**: Node.js 애플리케이션에서 메트릭을 수집하고 저장

### 2. Grafana (시각화)
- **포트**: 3001
- **엔드포인트**: http://localhost:3001
- **기본 계정**: admin / admin (환경 변수에서 변경 가능)
- **역할**: Prometheus에서 수집한 데이터를 시각화

### 3. Node.js 애플리케이션
- **메트릭 엔드포인트**: http://localhost:3000/metrics
- **수집 메트릭**:
  - HTTP 요청 수 및 응답 시간
  - CPU 사용률
  - 메모리 사용량
  - Event Loop Lag
  - 데이터베이스 연결 상태
  - Redis 연결 상태
  - 활성 HTTP 연결 수
  - HTTP 에러 수

## 시작하기

### 1. 환경 변수 설정

`.env` 파일에 다음 변수를 추가하세요:

```bash
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password
```

### 2. Docker Compose로 서비스 시작

```bash
# 모든 서비스 시작
docker-compose up -d

# 특정 서비스만 시작
docker-compose up -d prometheus grafana
```

### 3. Grafana 접속

1. 브라우저에서 http://localhost:3001 접속
2. 로그인 (admin / admin 또는 설정한 계정)
3. 자동으로 프로비저닝된 대시보드 확인:
   - **LiveLink Node.js Application Monitoring**

## 대시보드 구성

자동으로 생성된 대시보드는 다음 패널을 포함합니다:

### 📈 HTTP 메트릭
- **HTTP Requests Rate**: 초당 HTTP 요청 수 (메서드, 라우트, 상태별)
- **HTTP Request Duration**: p95, p99 응답 시간
- **Total Request Rate**: 전체 요청 수
- **HTTP Requests by Status Code**: 상태 코드별 요청 분포

### 💻 시스템 메트릭
- **Memory Usage**: 프로세스 메모리 사용량
- **CPU Usage**: CPU 사용률
- **Node.js Heap Memory**: Heap 메모리 상세 정보
- **Node.js Event Loop Lag**: Event Loop 지연 시간
- **Open File Descriptors**: 열린 파일 디스크립터 수

## 수집되는 메트릭 상세

### HTTP 메트릭
```
http_requests_total - HTTP 요청 총 수 (method, route, status 라벨)
http_request_duration_seconds - HTTP 요청 처리 시간 히스토그램
http_active_connections - 현재 활성 HTTP 연결 수
http_errors_total - HTTP 에러 총 수 (4xx, 5xx)
```

### Node.js 기본 메트릭
```
nodejs_heap_size_used_bytes - 사용 중인 Heap 메모리
nodejs_heap_size_total_bytes - 전체 Heap 메모리
nodejs_external_memory_bytes - 외부 메모리
nodejs_eventloop_lag_seconds - Event Loop 지연 시간
process_cpu_seconds_total - 프로세스 CPU 사용 시간
process_resident_memory_bytes - 프로세스 메모리 사용량
process_open_fds - 열린 파일 디스크립터 수
```

### 데이터베이스 메트릭
```
db_connection_status - 데이터베이스 연결 상태 (user, concert, article, chat)
redis_connection_status - Redis 연결 상태
```

## 유용한 Prometheus 쿼리 예제

### 초당 요청 수
```promql
rate(http_requests_total[5m])
```

### p95 응답 시간
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

### 에러율
```promql
sum(rate(http_errors_total[5m])) / sum(rate(http_requests_total[5m])) * 100
```

### 메모리 사용률
```promql
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100
```

## 커스텀 메트릭 추가

애플리케이션에 커스텀 메트릭을 추가하려면 `src/app.ts` 파일을 수정하세요:

```typescript
// Counter 예제
const myCounter = new promClient.Counter({
  name: 'my_custom_counter',
  help: 'Description of my counter',
  labelNames: ['label1', 'label2'],
  registers: [register],
});

// Gauge 예제
const myGauge = new promClient.Gauge({
  name: 'my_custom_gauge',
  help: 'Description of my gauge',
  registers: [register],
});

// Histogram 예제
const myHistogram = new promClient.Histogram({
  name: 'my_custom_histogram',
  help: 'Description of my histogram',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});
```

## 알림 설정 (선택사항)

Prometheus Alert Manager를 추가하여 임계값 기반 알림을 설정할 수 있습니다.

### 예제 알림 규칙 (prometheus.yml)
```yaml
rule_files:
  - 'alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### 알림 규칙 파일 (alerts.yml)
```yaml
groups:
  - name: nodejs_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"

      - alert: HighMemoryUsage
        expr: nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
```

## 트러블슈팅

### Prometheus가 메트릭을 수집하지 못할 때
1. Node.js 앱이 실행 중인지 확인: `docker-compose ps`
2. 메트릭 엔드포인트 확인: `curl http://localhost:3000/metrics`
3. Prometheus 타겟 상태 확인: http://localhost:9090/targets

### Grafana에서 데이터가 표시되지 않을 때
1. Prometheus 데이터소스가 정상적으로 연결되었는지 확인
2. Grafana 로그 확인: `docker-compose logs grafana`
3. Prometheus에서 쿼리 테스트: http://localhost:9090/graph

### 대시보드가 자동으로 로드되지 않을 때
1. 프로비저닝 파일 경로 확인
2. Grafana 컨테이너 재시작: `docker-compose restart grafana`
3. 로그 확인: `docker-compose logs grafana`

## 프로덕션 환경 권장사항

1. **보안**:
   - Grafana 관리자 비밀번호를 강력한 것으로 변경
   - 메트릭 엔드포인트에 인증 추가 고려
   - Prometheus와 Grafana를 외부에 노출하지 않도록 설정

2. **성능**:
   - Prometheus 데이터 보관 기간 설정
   - 메트릭 수집 간격 조정
   - 불필요한 라벨 제거

3. **데이터 보관**:
   - Prometheus 볼륨 백업
   - Grafana 대시보드 백업 (JSON 내보내기)

## 추가 리소스

- [Prometheus 공식 문서](https://prometheus.io/docs/)
- [Grafana 공식 문서](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)

## 파일 구조

```
.
├── prometheus.yml                           # Prometheus 설정 파일
├── docker-compose.yml                       # Docker Compose 설정
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── datasource.yml              # Prometheus 데이터소스 자동 구성
        └── dashboards/
            ├── dashboard.yml               # 대시보드 프로비저닝 설정
            └── files/
                └── nodejs-app-monitoring.json  # Node.js 모니터링 대시보드
```
