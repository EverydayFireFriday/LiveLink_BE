# Contributing to LiveLink Backend

LiveLink 프로젝트에 기여해주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 📋 목차

- [행동 강령](#-행동-강령)
- [시작하기](#-시작하기)
- [개발 프로세스](#-개발-프로세스)
- [커밋 메시지 규칙](#-커밋-메시지-규칙)
- [코딩 컨벤션](#-코딩-컨벤션)
- [Pull Request 프로세스](#-pull-request-프로세스)
- [이슈 리포트](#-이슈-리포트)

---

## 📜 행동 강령

### 우리의 약속

모든 기여자와 유지 관리자는 다음을 약속합니다:

- 서로를 존중하고 배려합니다
- 건설적인 피드백을 제공합니다
- 다양성과 포용성을 존중합니다
- 프로젝트의 이익을 우선시합니다

### 용납되지 않는 행동

- 폭력적이거나 차별적인 언어 사용
- 괴롭힘이나 모욕적인 행동
- 개인 정보의 무단 공개
- 기타 비전문적인 행동

---

## 🚀 시작하기

### 1. 저장소 Fork 및 Clone

```bash
# Fork 후 Clone
git clone https://github.com/YOUR_USERNAME/LiveLink_BE.git
cd LiveLink_BE

# Upstream 원격 저장소 추가
git remote add upstream https://github.com/EverydayFireFriday/LiveLink_BE.git
```

### 2. 개발 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 로컬 설정 입력

# 개발 서버 실행
npm run dev
```

### 3. 브랜치 전략

우리는 Git Flow를 사용합니다:

- `main`: 프로덕션 배포용 안정 브랜치
- `develop`: 개발 통합 브랜치
- `feature/*`: 새로운 기능 개발
- `fix/*`: 버그 수정
- `hotfix/*`: 긴급 수정 (프로덕션)
- `refactor/*`: 코드 리팩토링
- `docs/*`: 문서 작업

---

## 🔄 개발 프로세스

### 1. 브랜치 생성

```bash
# develop 브랜치에서 최신 코드 가져오기
git checkout develop
git pull upstream develop

# 새 브랜치 생성
git checkout -b feature/your-feature-name
```

### 2. 개발 및 테스트

```bash
# 코드 작성 후 테스트 실행
npm test

# 린트 검사
npm run lint

# 코드 포맷팅
npm run format
```

### 3. 변경사항 커밋

```bash
# 변경사항 스테이징
git add .

# 커밋 (커밋 메시지 규칙 준수)
git commit -m "feat :: Add user profile API"
```

### 4. 푸시 및 PR 생성

```bash
# Fork한 저장소에 푸시
git push origin feature/your-feature-name

# GitHub에서 Pull Request 생성
```

---

## 💬 커밋 메시지 규칙

우리는 **Conventional Commits** 형식을 사용합니다:

### 기본 형식

```
<타입> :: <제목>

[본문 (선택사항)]

[푸터 (선택사항)]
```

### 커밋 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat :: Add user authentication API` |
| `fix` | 버그 수정 | `fix :: Resolve session timeout issue` |
| `docs` | 문서 수정 | `docs :: Update API documentation` |
| `style` | 코드 포맷팅 (기능 변경 없음) | `style :: Format code with prettier` |
| `refactor` | 코드 리팩토링 | `refactor :: Simplify error handling` |
| `test` | 테스트 추가/수정 | `test :: Add auth controller tests` |
| `chore` | 빌드 설정, 의존성 업데이트 | `chore :: Update dependencies` |
| `perf` | 성능 개선 | `perf :: Optimize database queries` |
| `security` | 보안 관련 수정 | `security :: Fix XSS vulnerability` |

### 커밋 메시지 예시

**좋은 예:**
```
feat :: Add password reset functionality

- Implement password reset email sending
- Add reset token validation
- Create new password update endpoint

Closes #123
```

**나쁜 예:**
```
Update code
```

### 규칙

1. **타입은 소문자**로 작성
2. **제목은 명령문**으로 작성 (예: "Add" not "Added")
3. **제목은 50자 이내**로 제한
4. **본문은 72자마다 줄바꿈**
5. **이슈 번호는 푸터**에 포함 (예: `Closes #123`)

---

## 🎨 코딩 컨벤션

### TypeScript 스타일 가이드

#### 1. 네이밍 규칙

```typescript
// 변수, 함수: camelCase
const userName = 'John';
function getUserProfile() {}

// 클래스, 인터페이스, 타입: PascalCase
class UserService {}
interface UserProfile {}
type UserId = string;

// 상수: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 파일명: kebab-case
// user-service.ts, auth-controller.ts
```

#### 2. 코드 구조

```typescript
// 명시적 타입 선언 (any 사용 금지)
function createUser(data: CreateUserDto): Promise<User> {
  // 구현
}

// 화살표 함수 사용 (일반 함수보다 선호)
const processData = async (data: unknown): Promise<void> => {
  // 구현
};

// Optional Chaining 사용
const email = user?.profile?.email;

// Nullish Coalescing 사용
const displayName = user.name ?? 'Anonymous';
```

#### 3. 에러 처리

```typescript
// 커스텀 에러 클래스 사용
throw new ValidationError('Invalid email format');

// try-catch 블록 사용
try {
  await someAsyncOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw new InternalServerError('Failed to process request');
}
```

#### 4. 비동기 처리

```typescript
// async/await 사용 (Promise chaining 지양)
// Good
const user = await findUser(userId);
const profile = await getProfile(user.id);

// Bad
findUser(userId).then((user) => {
  return getProfile(user.id);
});
```

### ESLint & Prettier

프로젝트는 자동 포맷팅과 린팅을 사용합니다:

```bash
# 자동 수정
npm run lint:fix
npm run format

# 검사만 수행
npm run lint
```

### 주석 규칙

```typescript
/**
 * JSDoc 형식으로 함수 설명
 * @param userId - 사용자 ID
 * @returns 사용자 프로필 정보
 * @throws {NotFoundError} 사용자를 찾을 수 없을 때
 */
async function getUserProfile(userId: string): Promise<UserProfile> {
  // 단일 라인 주석은 설명이 필요한 복잡한 로직에만 사용
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user.profile;
}
```

---

## 🔀 Pull Request 프로세스

### PR 체크리스트

PR을 생성하기 전에 다음을 확인하세요:

- [ ] 코드가 린트 규칙을 통과하는가? (`npm run lint`)
- [ ] 모든 테스트가 통과하는가? (`npm test`)
- [ ] 새로운 기능에 대한 테스트를 추가했는가?
- [ ] 문서를 업데이트했는가? (필요한 경우)
- [ ] 커밋 메시지가 규칙을 따르는가?
- [ ] 브랜치가 최신 `develop`과 동기화되어 있는가?

### PR 템플릿

```markdown
## 📝 변경사항 요약

간단하게 변경사항을 설명해주세요.

## 🎯 변경 이유

왜 이 변경이 필요한가요?

## 📋 작업 내용

- [ ] 작업 1
- [ ] 작업 2
- [ ] 작업 3

## 🧪 테스트 방법

어떻게 테스트했나요?

## 📸 스크린샷 (선택사항)

UI 변경이 있다면 스크린샷을 첨부해주세요.

## 📌 관련 이슈

Closes #이슈번호
```

### PR 리뷰 프로세스

1. **자동 검사**: CI/CD 파이프라인이 자동으로 실행됩니다
2. **코드 리뷰**: 최소 1명의 승인이 필요합니다
3. **변경사항 반영**: 리뷰 피드백을 반영합니다
4. **병합**: Squash and Merge 전략을 사용합니다

---

## 🐛 이슈 리포트

### 버그 리포트

버그를 발견하셨나요? 다음 정보를 포함하여 이슈를 등록해주세요:

```markdown
## 🐛 버그 설명

버그에 대한 명확하고 간결한 설명

## 📋 재현 단계

1. '...'로 이동
2. '...'을 클릭
3. '...'까지 스크롤
4. 에러 발생

## 💡 예상 동작

무엇이 일어나야 하는지 설명

## 📸 스크린샷

가능하다면 스크린샷 첨부

## 🔧 환경 정보

- OS: [예: macOS 13.0]
- Node.js 버전: [예: 20.11.0]
- 브라우저: [예: Chrome 120]

## 📝 추가 정보

기타 관련 정보
```

### 기능 제안

새로운 기능을 제안하고 싶으신가요?

```markdown
## 💡 기능 설명

제안하는 기능에 대한 설명

## 🎯 문제점

이 기능이 해결하려는 문제는 무엇인가요?

## 📋 제안 사항

어떻게 구현하면 좋을까요?

## 🔄 대안

고려한 다른 방법이 있나요?

## 📝 추가 정보

기타 관련 정보
```

---

## 📚 추가 리소스

- [프로젝트 문서](./docs/INDEX.md)
- [API 문서](http://localhost:3000/api-docs)
- [아키텍처 가이드](./docs/architecture/README.md)
- [배포 가이드](./docs/deployment/DEPLOYMENT_GUIDE.md)

---

## ❓ 질문이 있으신가요?

- GitHub Issues를 통해 질문해주세요
- 이메일: contact@yourdomain.com

---

## 🙏 감사합니다!

여러분의 기여가 LiveLink를 더 나은 프로젝트로 만듭니다.

Made with ❤️ by EverydayFireFriday Team
