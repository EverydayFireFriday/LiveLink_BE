# API Response 표준화 가이드

## 개요
모든 API 응답은 일관된 형식을 따라야 합니다. `ResponseBuilder`를 사용하여 표준화된 응답을 생성할 수 있습니다.

## 표준 응답 형식

### 기본 구조
```typescript
{
  success: boolean;      // 요청 성공 여부
  message: string;       // 응답 메시지
  data?: any;           // 응답 데이터 (선택)
  error?: string;       // 에러 메시지 (실패 시)
  timestamp: string;    // ISO 8601 형식의 타임스탬프
}
```

### 페이지네이션 응답
```typescript
{
  success: true;
  message: string;
  data: any;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}
```

## 사용 예시

### 1. 성공 응답 (200 OK)
```typescript
import { ResponseBuilder } from '../../utils/response/apiResponse';

// 데이터와 함께
ResponseBuilder.success(res, '조회 성공', userData);

// 데이터 없이
ResponseBuilder.success(res, '작업이 완료되었습니다.');
```

### 2. 생성 성공 (201 Created)
```typescript
ResponseBuilder.created(res, '게시글이 성공적으로 생성되었습니다.', article);
```

### 3. 페이지네이션 응답
```typescript
ResponseBuilder.paginated(
  res,
  '게시글 목록 조회 성공',
  articles,
  {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5
  }
);
```

### 4. 잘못된 요청 (400 Bad Request)
```typescript
ResponseBuilder.badRequest(res, '유효성 검사에 실패했습니다.', '이메일 형식이 올바르지 않습니다.');
```

### 5. 인증 실패 (401 Unauthorized)
```typescript
ResponseBuilder.unauthorized(res, '로그인이 필요합니다.');
// 또는 기본 메시지 사용
ResponseBuilder.unauthorized(res);
```

### 6. 권한 없음 (403 Forbidden)
```typescript
ResponseBuilder.forbidden(res, '관리자 권한이 필요합니다.');
```

### 7. 찾을 수 없음 (404 Not Found)
```typescript
ResponseBuilder.notFound(res, '게시글을 찾을 수 없습니다.');
```

### 8. 충돌 (409 Conflict)
```typescript
ResponseBuilder.conflict(res, '이미 존재하는 이메일입니다.');
```

### 9. 서버 에러 (500 Internal Server Error)
```typescript
ResponseBuilder.internalError(res, '게시글 조회에 실패했습니다.', error.message);
```

## 컨트롤러 변환 예시

### Before (기존 방식)
```typescript
export class ArticleController {
  getArticleById = async (req: express.Request, res: express.Response) => {
    try {
      const article = await this.articleService.getArticleById(req.params.id);

      res.status(200).json({
        message: '게시글 조회 성공',
        article,
      });
    } catch (error) {
      if (error.message.includes('찾을 수 없습니다')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '게시글 조회에 실패했습니다.' });
      }
    }
  };
}
```

### After (표준화된 방식)
```typescript
import { ResponseBuilder } from '../../utils/response/apiResponse';

export class ArticleController {
  getArticleById = async (req: express.Request, res: express.Response) => {
    try {
      const article = await this.articleService.getArticleById(req.params.id);

      return ResponseBuilder.success(res, '게시글 조회 성공', { article });
    } catch (error) {
      if (error.message.includes('찾을 수 없습니다')) {
        return ResponseBuilder.notFound(res, error.message);
      }
      return ResponseBuilder.internalError(res, '게시글 조회에 실패했습니다.', error.message);
    }
  };
}
```

## Swagger 응답 스키마 예시

### 성공 응답
```yaml
responses:
  200:
    description: 게시글 조회 성공
    content:
      application/json:
        schema:
          allOf:
            - $ref: '#/components/schemas/ApiResponse'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    article:
                      $ref: '#/components/schemas/ArticleDetail'
```

### 페이지네이션 응답
```yaml
responses:
  200:
    description: 게시글 목록 조회 성공
    content:
      application/json:
        schema:
          allOf:
            - $ref: '#/components/schemas/PaginatedApiResponse'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    articles:
                      type: array
                      items:
                        $ref: '#/components/schemas/ArticleListItem'
```

### 에러 응답
```yaml
responses:
  400:
    description: 잘못된 요청
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/BadRequestError'
  401:
    description: 인증 필요
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/UnauthorizedError'
  404:
    description: 리소스를 찾을 수 없음
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/NotFoundError'
  500:
    description: 서버 에러
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/InternalServerError'
```

## 단축 함수 사용

더 간결한 코드를 원한다면 단축 함수를 사용할 수 있습니다:

```typescript
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound
} from '../../utils/response/apiResponse';

// 성공
sendSuccess(res, '조회 성공', data);

// 생성
sendCreated(res, '생성 성공', newItem);

// 에러
sendBadRequest(res, '잘못된 요청');
sendNotFound(res, '찾을 수 없습니다');
```

## 마이그레이션 체크리스트

- [ ] 모든 컨트롤러에서 `ResponseBuilder` 사용
- [ ] `res.status().json()` 패턴을 `ResponseBuilder` 메서드로 교체
- [ ] Swagger 문서에 표준 응답 스키마 적용
- [ ] 에러 처리 로직 통일
- [ ] `timestamp` 필드가 모든 응답에 포함되는지 확인
