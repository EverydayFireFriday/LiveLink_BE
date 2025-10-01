# API 응답 표준화 완료

## 📋 개요
API 응답 형식을 통일하여 일관성 있는 클라이언트 경험을 제공하기 위한 작업이 완료되었습니다.

## ✨ 주요 변경사항

### 1. 표준 응답 형식 정의
모든 API 응답이 다음 형식을 따릅니다:

```typescript
{
  success: boolean;      // 요청 성공 여부
  message: string;       // 응답 메시지
  data?: any;           // 응답 데이터
  error?: string;       // 에러 메시지 (실패 시)
  timestamp: string;    // ISO 8601 타임스탬프
}
```

### 2. ResponseBuilder 유틸리티 생성
**위치**: `src/utils/response/apiResponse.ts`

#### 주요 메서드:
- `ResponseBuilder.success()` - 200 OK
- `ResponseBuilder.created()` - 201 Created
- `ResponseBuilder.paginated()` - 페이지네이션 응답
- `ResponseBuilder.noContent()` - 삭제/수정 성공
- `ResponseBuilder.badRequest()` - 400 Bad Request
- `ResponseBuilder.unauthorized()` - 401 Unauthorized
- `ResponseBuilder.forbidden()` - 403 Forbidden
- `ResponseBuilder.notFound()` - 404 Not Found
- `ResponseBuilder.conflict()` - 409 Conflict
- `ResponseBuilder.internalError()` - 500 Internal Server Error

### 3. Swagger 스키마 추가
**위치**: `src/config/swagger/schemas/responseSchema.ts`

다음 스키마가 추가되었습니다:
- `ApiResponse` - 기본 응답 형식
- `SuccessResponse` - 성공 응답
- `ErrorResponse` - 에러 응답
- `PaginatedApiResponse` - 페이지네이션 응답
- `BadRequestError` - 400 에러
- `UnauthorizedError` - 401 에러
- `ForbiddenError` - 403 에러
- `NotFoundError` - 404 에러
- `ConflictError` - 409 에러
- `InternalServerError` - 500 에러

### 4. ArticleController 변환 완료
`src/controllers/article/articleController.ts`의 모든 메서드가 표준화된 응답을 사용하도록 변경되었습니다.

#### Before:
```typescript
res.status(200).json({
  message: '게시글 조회 성공',
  article,
});
```

#### After:
```typescript
return ResponseBuilder.success(res, '게시글 조회 성공', { article });
```

## 📊 적용된 컨트롤러

### ✅ 완료
- [x] `ArticleController` - 전체 메서드 표준화 완료
  - `createArticle` - 201 Created
  - `getArticleById` - 200 OK
  - `getPublishedArticles` - 200 OK (페이지네이션)
  - `updateArticle` - 200 OK
  - `deleteArticle` - 200 OK
  - `getArticlesByAuthor` - 200 OK (페이지네이션)
  - `getPopularArticles` - 200 OK (페이지네이션)

### 🔲 진행 예정
다른 컨트롤러들도 동일한 패턴으로 변환이 필요합니다:
- [ ] `ArticleCommentController`
- [ ] `ArticleLikeController`
- [ ] `ArticleBookmarkController`
- [ ] `ConcertController`
- [ ] `AuthController`
- [ ] `AdminController`
- [ ] `ChatController`

## 🎯 장점

### 1. 일관성
- 모든 API가 동일한 응답 구조를 제공
- 클라이언트 측 처리 로직 단순화

### 2. 타입 안정성
- TypeScript 인터페이스로 타입 체크
- 컴파일 타임에 에러 감지

### 3. 자동 타임스탬프
- 모든 응답에 자동으로 타임스탬프 추가
- 디버깅 및 로깅 용이

### 4. 에러 처리 개선
- 상태 코드별 명확한 에러 메시지
- 구조화된 에러 정보 제공

### 5. Swagger 문서화
- 표준 스키마로 API 문서 자동 생성
- 개발자 경험 향상

## 📚 사용 가이드

자세한 사용 방법은 다음 문서를 참조하세요:
- [ResponseBuilder 사용 가이드](./src/utils/response/README.md)

### Quick Start

```typescript
import { ResponseBuilder } from '../../utils/response/apiResponse';

// 성공
return ResponseBuilder.success(res, '조회 성공', data);

// 생성
return ResponseBuilder.created(res, '생성 성공', newItem);

// 페이지네이션
return ResponseBuilder.paginated(res, '목록 조회 성공', items, pagination);

// 에러
return ResponseBuilder.notFound(res, '리소스를 찾을 수 없습니다');
return ResponseBuilder.badRequest(res, '잘못된 요청입니다');
return ResponseBuilder.internalError(res, '서버 에러');
```

## 🔄 마이그레이션 체크리스트

각 컨트롤러를 마이그레이션할 때:

1. [ ] `ResponseBuilder` import 추가
2. [ ] 모든 `res.status().json()` 패턴을 `ResponseBuilder` 메서드로 교체
3. [ ] 에러 처리 로직에서 적절한 상태 코드 메서드 사용
4. [ ] `return` 키워드 추가 (중복 응답 방지)
5. [ ] Swagger 문서에서 응답 스키마 업데이트
6. [ ] 기능 테스트 수행

## 📝 응답 예시

### 성공 응답
```json
{
  "success": true,
  "message": "게시글 조회 성공",
  "data": {
    "article": {
      "_id": "60d0fe4f5311236168a109ca",
      "title": "Sample Article"
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 페이지네이션 응답
```json
{
  "success": true,
  "message": "게시글 목록 조회 성공",
  "data": {
    "articles": [...]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 에러 응답
```json
{
  "success": false,
  "message": "게시글을 찾을 수 없습니다",
  "error": "게시글을 찾을 수 없습니다",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🚀 다음 단계

1. 나머지 컨트롤러들에 표준화 적용
2. 통합 테스트 작성
3. 프론트엔드 팀과 API 응답 형식 공유
4. 에러 코드 체계 확립 (선택사항)

## 📞 문의

API 응답 표준화에 대한 질문이나 제안사항이 있으면 팀에 문의하세요.
