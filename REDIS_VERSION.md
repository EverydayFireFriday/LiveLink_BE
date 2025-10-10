# Redis 버전 관리 가이드

## ⚠️ 중요: Redis 패키지 버전 업그레이드 금지

### 현재 안정적인 구성

```json
{
  "redis": "^4.6.5",
  "connect-redis": "^6.1.3",
  "ioredis": "^5.6.1"
}
```

## 🚫 Redis v5 업그레이드를 하면 안 되는 이유

### 1. 호환성 문제
- **connect-redis v6.1.3**는 `redis` v3~v4만 지원
- **connect-redis v7**은 `redis` v4를 지원하지만, v5는 미지원
- Redis v5로 업그레이드 시 세션 저장 기능이 완전히 중단됨

### 2. 히스토리
```bash
# 과거 시도 기록
9520d15 - Revert "Merge pull request #174 (redis v5.8.3로 업그레이드 시도)"
40d866e - Revert "fix :: 구버전 Redis 제거"
```

이미 Redis v5로 업그레이드를 시도했다가 문제가 발생하여 롤백한 이력이 있습니다.

### 3. 기술적 이슈
- `legacyMode: true` 옵션이 필수인데, Redis v5에서는 제대로 작동하지 않음
- 세션 미들웨어 초기화 시 타입 에러 발생
- Rate limiting 기능 장애

## ✅ 안전한 업그레이드 경로

### 옵션 1: 현재 구성 유지 (권장)
```json
{
  "redis": "^4.6.5",
  "connect-redis": "^6.1.3"
}
```

**장점:**
- 안정적으로 검증된 구성
- 세션, Rate Limiting, 캐싱 모두 정상 동작
- 자동 재연결 및 에러 처리 구현 완료

### 옵션 2: ioredis로 마이그레이션
`ioredis`는 이미 v5.6.1이 설치되어 있으며, 더 최신 Redis 서버를 지원합니다.

**필요한 작업:**
1. `src/config/redis/redisClient.ts` 전체 재작성
2. `connect-redis` 설정 변경 (ioredis 호환 모드)
3. 모든 Redis 사용처 테스트
4. Rate limiting, caching 로직 재검증

**예상 작업 시간:** 4-6시간

## 🛡️ 현재 구현된 안정화 기능

### 1. 중앙 집중식 Redis 클라이언트
- 파일: `src/config/redis/redisClient.ts`
- 싱글톤 패턴으로 3개 중복 클라이언트 통합

### 2. 자동 재연결
```typescript
reconnectStrategy: (retries: number) => {
  const delay = Math.min(retries * 100, 10000);
  return delay; // 최대 10초까지 점진적 재시도
}
```

### 3. Redis 없이도 서버 동작 (Graceful Degradation)
- 세션: 메모리 기반으로 자동 전환
- Rate Limiting: 메모리 기반으로 동작
- 서비스 중단 없이 degraded mode로 계속 운영

## 📚 참고 자료

- [connect-redis v6 문서](https://github.com/tj/connect-redis/tree/v6.1.3)
- [redis npm v4 문서](https://github.com/redis/node-redis/tree/redis%404.6.5)
- 프로젝트 커밋: `674cba5`, `2c49da2`

## 🔧 문제 발생 시

Redis 관련 문제가 발생하면:

1. Redis 서버 상태 확인
   ```bash
   redis-cli ping
   ```

2. 로그 확인
   ```bash
   # Redis 연결 상태 확인
   grep "Redis" logs/combined-*.log
   ```

3. 서버 재시작 (Redis 없이도 동작)
   ```bash
   npm run dev
   ```

---

**마지막 업데이트:** 2025-10-10
**담당자:** Redis 중앙 집중화 리팩토링 완료
**브랜치:** `refactor/redis-centralization`
