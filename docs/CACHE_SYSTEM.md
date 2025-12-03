# 캐시 시스템 가이드

## 개요

LiveLink 백엔드는 Redis 기반의 체계적인 캐싱 시스템을 사용합니다. 이 문서는 캐시 시스템의 구조, 사용법, 그리고 모범 사례를 설명합니다.

## 캐시 시스템 구조

```
src/utils/cache/
├── cacheManager.ts         # 기본 Redis 캐시 매니저
├── cacheConfig.ts          # TTL 설정 및 캐시 전략 정의
├── cacheKeyBuilder.ts      # 일관된 캐시 키 생성
├── cacheDecorators.ts      # 서비스 메서드 데코레이터
└── cacheWarming.ts         # 캐시 워밍 서비스
```

## 주요 컴포넌트

### 1. Cache Configuration (`cacheConfig.ts`)

모든 캐시 TTL(Time To Live) 설정이 중앙화되어 있습니다.

```typescript
import { CacheTTL } from '@/utils';

// 사용 예시
await cacheManager.set(key, value, CacheTTL.USER_PROFILE); // 1시간
await cacheManager.set(key, value, CacheTTL.ARTICLE_LIST); // 5분
```

#### 주요 TTL 설정

- **사용자 관련**
  - `USER_PROFILE`: 1시간 - 자주 변경되지 않는 프로필 정보
  - `USER_SESSION`: 30분 - 세션 데이터

- **게시글 관련**
  - `ARTICLE_LIST`: 5분 - 자주 갱신되는 목록
  - `ARTICLE_DETAIL`: 10분 - 게시글 상세 정보
  - `ARTICLE_POPULAR`: 10분 - 인기 게시글

- **콘서트 관련**
  - `CONCERT_LIST`: 30분 - 콘서트 목록
  - `CONCERT_DETAIL`: 1시간 - 콘서트 상세 정보

- **카테고리 & 태그** (거의 변경되지 않음)
  - `CATEGORIES`: 24시간
  - `TAGS`: 24시간

- **통계 데이터**
  - `STATS_LIKES`: 5분 - 좋아요 수
  - `STATS_VIEWS`: 3분 - 조회수

### 2. Cache Key Builder (`cacheKeyBuilder.ts`)

일관된 캐시 키 생성을 보장합니다.

```typescript
import { CacheKeyBuilder } from '@/utils';

// 사용자 캐시 키
const userKey = CacheKeyBuilder.user(userId);
// => "user:abc123"

// 게시글 목록 캐시 키
const articleListKey = CacheKeyBuilder.articleList({
  page: 1,
  limit: 20,
  category_id: 'tech',
});
// => "articles:list:category_id=tech:limit=20:page=1"

// 인기 게시글 캐시 키
const popularKey = CacheKeyBuilder.articlesPopular({
  page: 1,
  limit: 10,
  days: 7,
});
// => "articles:popular:days=7:limit=10:page=1"
```

#### 주요 메서드

**사용자:**
- `CacheKeyBuilder.user(userId)`
- `CacheKeyBuilder.userStats(userId)`

**게시글:**
- `CacheKeyBuilder.articleList(params)`
- `CacheKeyBuilder.articleDetail(articleId, params)`
- `CacheKeyBuilder.articlesPopular(params)`
- `CacheKeyBuilder.articlesLiked(userId, params)`

**콘서트:**
- `CacheKeyBuilder.concertList(params)`
- `CacheKeyBuilder.concertDetail(concertId, params)`
- `CacheKeyBuilder.concertsUpcoming(params)`

**통계:**
- `CacheKeyBuilder.statsArticleLikes(articleId)`
- `CacheKeyBuilder.statsConcertLikes(concertId)`

### 3. Cache Decorators (`cacheDecorators.ts`)

서비스 메서드에 간편하게 캐싱을 적용할 수 있는 데코레이터를 제공합니다.

#### `@Cacheable` - 조회 캐싱

메서드 실행 전 캐시를 확인하고, 없으면 실행 후 캐시에 저장합니다.

```typescript
import { Cacheable } from '@/utils';
import { CacheKeyBuilder, CacheTTL } from '@/utils';

class ArticleService {
  @Cacheable({
    keyGenerator: (id: string) => CacheKeyBuilder.articleDetail(id),
    ttl: CacheTTL.ARTICLE_DETAIL,
  })
  async getArticleById(id: string) {
    // 이 메서드는 캐시 미스일 때만 실행됨
    return await this.articleModel.findById(id);
  }

  // 캐시 스킵 조건 추가
  @Cacheable({
    keyGenerator: (id: string, userId?: string) =>
      CacheKeyBuilder.articleDetail(id, { userId }),
    ttl: CacheTTL.ARTICLE_DETAIL,
    skipIf: (id: string, forceRefresh?: boolean) => forceRefresh === true,
  })
  async getArticleByIdWithOption(id: string, forceRefresh?: boolean) {
    return await this.articleModel.findById(id);
  }
}
```

#### `@CacheEvict` - 캐시 무효화

메서드 실행 후 특정 캐시를 무효화합니다.

```typescript
import { CacheEvict } from '@/utils';
import { CacheInvalidationPatterns } from '@/utils';

class ArticleService {
  @CacheEvict({
    keyPatterns: (data: CreateArticleData) => [
      CacheInvalidationPatterns.ARTICLE_ALL(),
      CacheInvalidationPatterns.ARTICLE_LIST(),
    ],
  })
  async createArticle(data: CreateArticleData) {
    const article = await this.articleModel.create(data);
    // 메서드 실행 후 자동으로 캐시 무효화
    return article;
  }

  @CacheEvict({
    keyPatterns: (id: string) => [
      CacheInvalidationPatterns.ARTICLE_BY_ID(id),
      CacheInvalidationPatterns.ARTICLE_LIST(),
    ],
    beforeInvocation: true, // 실행 전에 캐시 무효화
  })
  async deleteArticle(id: string) {
    await this.articleModel.deleteById(id);
  }
}
```

#### `@CachePut` - 캐시 갱신

메서드 실행 후 결과를 무조건 캐시에 저장합니다. (업데이트 메서드에 유용)

```typescript
import { CachePut } from '@/utils';

class ArticleService {
  @CachePut({
    keyGenerator: (id: string) => CacheKeyBuilder.articleDetail(id),
    ttl: CacheTTL.ARTICLE_DETAIL,
  })
  async updateArticle(id: string, data: UpdateArticleData) {
    const article = await this.articleModel.updateById(id, data);
    // 업데이트된 결과가 자동으로 캐시에 저장됨
    return article;
  }

  // 값 변환 후 캐시 저장
  @CachePut({
    keyGenerator: (id: string) => CacheKeyBuilder.articleDetail(id),
    ttl: CacheTTL.ARTICLE_DETAIL,
    valueTransformer: (article) => ({
      ...article,
      cached_at: new Date(),
    }),
  })
  async updateArticleWithTimestamp(id: string, data: UpdateArticleData) {
    return await this.articleModel.updateById(id, data);
  }
}
```

#### 데코레이터 조합

여러 데코레이터를 함께 사용할 수 있습니다:

```typescript
class ArticleService {
  // 업데이트 후 캐시 저장 + 목록 캐시 무효화
  @CachePut({
    keyGenerator: (id: string) => CacheKeyBuilder.articleDetail(id),
    ttl: CacheTTL.ARTICLE_DETAIL,
  })
  @CacheEvict({
    keyPatterns: () => [CacheInvalidationPatterns.ARTICLE_LIST()],
  })
  async updateArticle(id: string, data: UpdateArticleData) {
    return await this.articleModel.updateById(id, data);
  }
}
```

### 4. Cache Helper (`cacheDecorators.ts`)

캐시 작업을 위한 유틸리티 함수들을 제공합니다.

```typescript
import { CacheHelper } from '@/utils';

// 여러 키를 동시에 조회
const users = await CacheHelper.getMany<User>([
  CacheKeyBuilder.user('user1'),
  CacheKeyBuilder.user('user2'),
  CacheKeyBuilder.user('user3'),
]);

// 여러 키-값 쌍을 동시에 저장
await CacheHelper.setMany([
  {
    key: CacheKeyBuilder.user('user1'),
    value: user1Data,
    ttl: CacheTTL.USER_PROFILE,
  },
  {
    key: CacheKeyBuilder.user('user2'),
    value: user2Data,
    ttl: CacheTTL.USER_PROFILE,
  },
]);

// 여러 패턴을 동시에 삭제
await CacheHelper.deletePatterns([
  CacheInvalidationPatterns.ARTICLE_ALL(),
  CacheInvalidationPatterns.CONCERT_ALL(),
]);

// 캐시 키 존재 여부 확인
const exists = await CacheHelper.exists(CacheKeyBuilder.user(userId));

// TTL 연장 (기존 값 유지하며 만료 시간만 연장)
await CacheHelper.extend(CacheKeyBuilder.user(userId), 3600);
```

### 5. Cache Warming (`cacheWarming.ts`)

서버 시작 시 및 주기적으로 자주 조회되는 데이터를 미리 캐싱합니다.

#### 서버 시작 시 자동 워밍

서버가 시작될 때 다음 데이터가 자동으로 캐싱됩니다:
- 카테고리 목록
- 인기 태그 (상위 20개)
- 인기 게시글 (최근 7일, 20개)
- 다가오는 콘서트 (20개)

```typescript
// src/app.ts에서 자동 실행
import { cacheWarmingService } from './utils/cache/cacheWarming';

// 서버 시작 시
await cacheWarmingService.warmupOnStartup();

// 주기적 캐시 워밍 시작
cacheWarmingService.startPeriodicWarming();
```

#### 수동 워밍

특정 데이터를 수동으로 워밍할 수 있습니다:

```typescript
import { cacheWarmingService } from '@/utils';

// 특정 타입만 워밍
await cacheWarmingService.manualWarmup('popularArticles');
await cacheWarmingService.manualWarmup('upcomingConcerts');

// 모든 캐시 워밍
await cacheWarmingService.warmupAll();

// 특정 사용자 데이터 워밍
await cacheWarmingService.warmupUserData(userId);
```

## 캐시 무효화 전략

### 1. 패턴 기반 무효화

```typescript
import { CacheInvalidationPatterns } from '@/utils';

// 모든 게시글 캐시 삭제
await cacheManager.delByPattern(CacheInvalidationPatterns.ARTICLE_ALL());

// 특정 게시글 관련 캐시만 삭제
await cacheManager.delByPattern(
  CacheInvalidationPatterns.ARTICLE_BY_ID(articleId),
);

// 특정 작성자의 게시글 캐시 삭제
await cacheManager.delByPattern(
  CacheInvalidationPatterns.ARTICLE_BY_AUTHOR(authorId),
);

// 게시글 목록 캐시만 삭제
await cacheManager.delByPattern(CacheInvalidationPatterns.ARTICLE_LIST());
```

### 2. 데이터 변경 시 캐시 무효화

**생성 시:**
```typescript
async createArticle(data: CreateArticleData) {
  const article = await this.articleModel.create(data);

  // 목록 캐시 무효화
  await CacheHelper.deletePatterns([
    CacheInvalidationPatterns.ARTICLE_ALL(),
  ]);

  return article;
}
```

**수정 시:**
```typescript
async updateArticle(id: string, data: UpdateArticleData) {
  const article = await this.articleModel.updateById(id, data);

  // 상세 + 목록 캐시 무효화
  await CacheHelper.deletePatterns([
    CacheInvalidationPatterns.ARTICLE_BY_ID(id),
    CacheInvalidationPatterns.ARTICLE_LIST(),
  ]);

  return article;
}
```

**삭제 시:**
```typescript
async deleteArticle(id: string) {
  await this.articleModel.deleteById(id);

  // 관련된 모든 캐시 무효화
  await CacheHelper.deletePatterns([
    CacheInvalidationPatterns.ARTICLE_BY_ID(id),
    CacheInvalidationPatterns.ARTICLE_LIST(),
  ]);
}
```

## 모범 사례

### 1. 캐시 키는 항상 CacheKeyBuilder 사용

❌ **나쁜 예:**
```typescript
const key = `user:${userId}`;
const key = `articles:page=${page}:limit=${limit}`;
```

✅ **좋은 예:**
```typescript
const key = CacheKeyBuilder.user(userId);
const key = CacheKeyBuilder.articleList({ page, limit });
```

### 2. TTL은 CacheTTL 상수 사용

❌ **나쁜 예:**
```typescript
await cacheManager.set(key, value, 3600); // 하드코딩된 TTL
await cacheManager.set(key, value, 60 * 60); // 매직 넘버
```

✅ **좋은 예:**
```typescript
await cacheManager.set(key, value, CacheTTL.USER_PROFILE);
await cacheManager.set(key, value, CacheTTL.ARTICLE_LIST);
```

### 3. 데코레이터를 적극 활용

❌ **나쁜 예:**
```typescript
async getArticleById(id: string) {
  const cacheKey = `article:${id}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  const article = await this.articleModel.findById(id);
  await cacheManager.set(cacheKey, article, 600);
  return article;
}
```

✅ **좋은 예:**
```typescript
@Cacheable({
  keyGenerator: (id: string) => CacheKeyBuilder.articleDetail(id),
  ttl: CacheTTL.ARTICLE_DETAIL,
})
async getArticleById(id: string) {
  return await this.articleModel.findById(id);
}
```

### 4. 적절한 캐시 무효화

데이터 변경 시 관련된 캐시를 모두 무효화하세요:

```typescript
@CacheEvict({
  keyPatterns: (id: string, data: UpdateArticleData) => {
    const patterns = [
      CacheInvalidationPatterns.ARTICLE_BY_ID(id),
      CacheInvalidationPatterns.ARTICLE_LIST(),
    ];

    // 작성자가 변경되면 이전/새 작성자의 캐시도 무효화
    if (data.author_id) {
      patterns.push(
        CacheInvalidationPatterns.ARTICLE_BY_AUTHOR(data.author_id),
      );
    }

    return patterns;
  },
})
async updateArticle(id: string, data: UpdateArticleData) {
  return await this.articleModel.updateById(id, data);
}
```

### 5. 캐시 워밍 대상 선정

자주 조회되고 변경이 적은 데이터를 워밍 대상으로 선정하세요:

✅ **워밍에 적합:**
- 카테고리/태그 목록 (거의 변경되지 않음)
- 인기 게시글/콘서트 (주기적 갱신 가능)
- 다가오는 이벤트 (미래 시간 기준)

❌ **워밍에 부적합:**
- 사용자별 개인화 데이터 (너무 많음)
- 실시간 통계 (자주 변경됨)
- 검색 결과 (조합이 무한함)

## 성능 최적화 팁

### 1. 배치 조회로 N+1 문제 해결

```typescript
// N+1 문제가 있는 코드
for (const articleId of articleIds) {
  const article = await this.getArticleById(articleId);
  articles.push(article);
}

// 개선: 배치 조회
const cacheKeys = articleIds.map((id) => CacheKeyBuilder.articleDetail(id));
const cachedArticles = await CacheHelper.getMany<Article>(cacheKeys);
```

### 2. 적절한 TTL 설정

- **자주 변경되는 데이터**: 짧은 TTL (1-5분)
- **가끔 변경되는 데이터**: 중간 TTL (10-30분)
- **거의 변경되지 않는 데이터**: 긴 TTL (1-24시간)

### 3. 캐시 워밍 주기 조정

```typescript
// src/utils/cache/cacheConfig.ts
export const CacheWarmingTargets = {
  PERIODIC: [
    {
      type: 'popularArticles',
      interval: CacheTTL.ARTICLE_POPULAR * 1000, // TTL과 동기화
      ttl: CacheTTL.ARTICLE_POPULAR,
    },
  ],
};
```

## 모니터링 및 디버깅

### 1. 캐시 로그 확인

캐시 매니저는 자동으로 캐시 히트/미스를 로깅합니다:

```
✅ Cache HIT for key: articles:list:page=1:limit=20
❌ Cache MISS for key: articles:list:page=2:limit=20
✅ Cache SET for key: user:abc123 with TTL: 3600s
✅ Cache DELETED for pattern: articles:*
```

### 2. Redis 모니터링

```bash
# Redis 연결 상태 확인
redis-cli ping

# 모든 키 확인
redis-cli keys "*"

# 특정 패턴 키 확인
redis-cli keys "articles:*"

# 키의 TTL 확인
redis-cli ttl "user:abc123"
```

## 문제 해결

### Redis 연결 실패 시

캐시 시스템은 Redis 연결 실패 시 자동으로 폴백됩니다:

```typescript
// Redis 미연결 시 캐시 작업이 자동으로 스킵됨
const data = await cacheManager.get(key); // null 반환
await cacheManager.set(key, value, ttl); // 무시됨
```

### 캐시 일관성 문제

데이터 불일치가 발생하면:

1. 관련 캐시 패턴 무효화
2. 수동 캐시 워밍 실행

```typescript
// 모든 게시글 캐시 강제 삭제
await cacheManager.delByPattern('articles:*');

// 인기 게시글 재워밍
await cacheWarmingService.manualWarmup('popularArticles');
```

## 추가 리소스

- Redis 공식 문서: https://redis.io/docs/
- IORedis 문서: https://github.com/redis/ioredis
- 캐시 전략 가이드: https://aws.amazon.com/caching/best-practices/
