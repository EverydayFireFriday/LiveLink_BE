# 📚 Documentation Index

LiveLink Backend 프로젝트 문서 목록입니다.

## 🚀 시작하기

- [Quick Start](./QUICK_START.md) - 빠른 시작 가이드
- [Development Setup](./DEVELOPMENT_SETUP.md) - 개발 환경 설정
- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - 환경 변수 관리

## 📖 주요 문서

### 배포 & 운영
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - 배포 가이드
- [Deploy Checklist](./DEPLOY_CHECKLIST.md) - 배포 체크리스트
- [CI/CD Setup](./CICD_SETUP.md) - CI/CD 파이프라인
- [Horizontal Scaling Guide](./HORIZONTAL_SCALING_GUIDE.md) - 수평 확장 가이드

### 성능 & 모니터링
- [Capacity Analysis](./performance/CAPACITY_ANALYSIS.md) - 서버 용량 분석 및 동접자 예측
- [Query Optimization](./performance/QUERY_OPTIMIZATION_SUMMARY.md) - 데이터베이스 쿼리 최적화
- [Monitoring Guide](../MONITORING_GUIDE.md) - Grafana & Prometheus 모니터링

### 아키텍처
- [Architecture Overview](./architecture/README.md) - 전체 아키텍처
- [ERD](./architecture/ERD.md) - 데이터베이스 ERD
- [Sequence Diagrams](./architecture/SEQUENCE_DIAGRAMS.md) - 시퀀스 다이어그램

### API & 기능
- [API Reference](./API_REFERENCE.md) - API 명세
- [API Response Standardization](./API_RESPONSE_STANDARDIZATION.md) - API 응답 표준화
- [Socket.IO Events](./SOCKET_IO_EVENTS.md) - 실시간 이벤트
- [Error Handling](./ERROR_HANDLING.md) - 에러 처리 가이드

### 외부 서비스 연동
- [Spotify Production Setup](./SPOTIFY_PRODUCTION_SETUP.md) - Spotify API 연동
- [Music Services Setup](./MUSIC_SERVICES_SETUP.md) - 음악 서비스 설정

### 시스템 관리
- [Cache System](./CACHE_SYSTEM.md) - Redis 캐시 시스템
- [Maintenance Mode](./MAINTENANCE_MODE.md) - 유지보수 모드
- [Developer Tools](./DEVELOPER_TOOLS.md) - 개발 도구

## 🔧 개발 참고

### 코딩 표준 (.claude/)
- [Project Overview](./.claude/PROJECT_OVERVIEW.md)
- [Architecture](./.claude/ARCHITECTURE.md)
- [Coding Standards](./.claude/CODING_STANDARDS.md)
- [Common Tasks](./.claude/COMMON_TASKS.md)
- [Dependencies](./.claude/DEPENDENCIES.md)

## 📊 성능 최적화

최근 적용된 최적화들:

1. **API 응답 시간 측정** - Prometheus 메트릭 통합
2. **Request ID 트래킹** - 디버깅 개선
3. **N+1 쿼리 최적화** - bulkWrite로 98% 쿼리 감소
4. **데이터베이스 쿼리 최적화** - Projection, Aggregation Pipeline
5. **Health Check 강화** - 시스템 리소스 모니터링

자세한 내용은 [Query Optimization Summary](./performance/QUERY_OPTIMIZATION_SUMMARY.md) 참고

## 🎯 추천 읽기 순서

### 신규 개발자
1. Quick Start → Development Setup
2. Architecture Overview → ERD
3. API Reference → Socket.IO Events
4. Coding Standards → Common Tasks

### DevOps / 운영자
1. Deployment Guide → CI/CD Setup
2. Monitoring Guide → Capacity Analysis
3. Horizontal Scaling Guide → Cache System
4. Maintenance Mode

### 성능 최적화 담당
1. Query Optimization Summary
2. Capacity Analysis
3. Monitoring Guide
4. Cache System
