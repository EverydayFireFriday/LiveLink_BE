# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for 1.0.0
- 프로덕션 첫 배포

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
