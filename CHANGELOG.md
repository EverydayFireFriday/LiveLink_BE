# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for 1.0.0
- 프로덕션 첫 배포

## [0.9.1] - 2025-12-25

### Added - Performance & Monitoring
- **API 응답 시간 측정 미들웨어** (`src/middlewares/responseTime/`)
  - Prometheus 메트릭 통합
  - Slow API 자동 감지 (>500ms 임계값)
  - 연결 종료 이벤트 처리
- **Request ID 트래킹** (`src/middlewares/requestId/`)
  - UUID 자동 생성
  - X-Request-ID 헤더 지원
  - Express Request 타입 확장
- **강화된 Health Check** (`src/utils/health/healthCheck.ts`)
  - 시스템 리소스 모니터링 (메모리, CPU, 디스크)
  - 외부 서비스 상태 체크 (Redis, MongoDB, Firebase)
  - 종합 상태 판단 (healthy/degraded/unhealthy)
- **모니터링 스택 스크립트** (`scripts/start-monitoring.sh`)
  - 원클릭 Grafana & Prometheus 실행
  - npm 스크립트 추가: `monitoring:start`, `monitoring:stop`, `monitoring:logs`

### Improved - Database Query Optimization
- **N+1 쿼리 최적화** (`src/services/concert/concertBatchService.ts`)
  - bulkWrite 적용: 50개 쿼리 → 1개 쿼리 (98% 감소)
  - 배치 업데이트/삭제 성능 5-10배 향상
  - 성능 로깅 추가
- **Projection 최적화** (`src/services/concert/concertLikeService.ts`)
  - 필요한 필드만 조회하여 데이터 전송량 60% 감소
- **Aggregation Pipeline 최적화** (`src/models/auth/user.ts`)
  - $lookup 전 $project 적용
  - 파이프라인 초기에 $limit 배치
  - 데이터 전송량 70-80% 감소

### Added - Documentation
- **성능 분석 문서** (`docs/performance/CAPACITY_ANALYSIS.md`)
  - 동접자 수 예측 (REST API: 500-1,000명, Socket.IO: 2,000-3,000명)
  - 병목 지점 분석 및 최적화 방안
  - 단계별 확장 로드맵
- **쿼리 최적화 요약** (`docs/performance/QUERY_OPTIMIZATION_SUMMARY.md`)
- **모니터링 가이드** (`MONITORING_GUIDE.md`)
  - Grafana & Prometheus 사용법
  - PromQL 쿼리 예제
  - 알림 설정 방법
- **문서 인덱스** (`docs/INDEX.md`)
  - 전체 문서 목록 및 추천 읽기 순서

### Fixed - Code Quality
- TypeScript 린팅 오류 수정
  - health check 유틸리티 타입 안정성 강화
  - `any` 타입 제거, 명시적 타입 지정 (MongoClient, Redis)
  - Floating promise 경고 해결
- 스크립트 파일 구조 정리
  - `scripts/checkSupportInquiries.ts` → `src/scripts/` 이동
  - Import 경로 수정 및 npm 스크립트 추가

### Performance Metrics
- 배치 작업 쿼리: 50개 → 1개 (-98%)
- 데이터 전송량: 60-80% 감소
- 평균 응답 시간: 30-40% 단축
- 예상 동접자 처리량: 2-3배 증가 (500명 → 1,000-2,000명)

## [0.9.0] - 2025-11-10

### Added
- 로그인 시 provider 정보 추가 (Google/Apple OAuth 구분)
- 플랫폼별 세션 관리 기능 강화 (UserSession 모델)
- 다중 OAuth 제공자 지원 (oauthProviders 배열)
- 알림 시스템 (ScheduledNotification, NotificationHistory)
- 댓글/대댓글 시스템
- 게시글 좋아요/북마크 시스템
- FCM 푸시 알림

### Changed
- Rate Limiting 기본값 수정 (개발 환경에서 자동 비활성화)
- Brute Force Protection 기본값 조정
- 대형 파일 모듈별로 세분화 (유지보수성 개선)
- ESLint 패키지 최신 버전으로 업데이트
- 의존성 패키지 업데이트:
  - @faker-js/faker 10.0.0 → 10.1.0
  - @types/node 20.19.24 → 24.10.0
  - @babel/core 7.28.4 → 7.28.5
  - swagger-ui-dist 5.29.5 → 5.30.2
  - @paralleldrive/cuid2 2.2.2 → 2.3.1
  - @emnapi/core 1.6.0 → 1.7.0
  - appleboy/ssh-action (GitHub Actions)

### Removed
- 개발 환경 인증 스킵 기능 제거 (보안 강화)
- 콘서트 생성/수정 시 불필요한 인증 제거

### Fixed
- generate-postman 스크립트 ESLint 및 TypeScript 타입 오류 수정
- 세션 관리 관련 버그 수정

### Security
- 개발 환경 인증 우회 기능 제거로 보안 강화
- Rate Limiting 정책 개선

## [0.1.0] - 2025-01-XX

### Added
- Initial API implementation
- MongoDB integration
- Redis session management
- Authentication system (Email, Google OAuth, Apple Sign-In)
- Concert management
- Article (Post) management
- Chat system with Socket.IO
- Real-time notifications with FCM
- Swagger documentation
- Docker support
- CI/CD pipelines with GitHub Actions
- Prometheus + Grafana monitoring
- Health check endpoints
- GraphQL API support
- Comprehensive error handling
- Rate limiting and brute force protection
- Session management with platform detection
