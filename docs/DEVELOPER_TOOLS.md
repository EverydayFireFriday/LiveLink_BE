# Developer Tools Guide

이 문서는 프로젝트에서 사용할 수 있는 개발자 도구들의 사용법을 설명합니다.

## 목차

- [API 문서 생성](#api-문서-생성)
- [데이터베이스 관리](#데이터베이스-관리)
- [VSCode 개발 환경](#vscode-개발-환경)

---

## API 문서 생성

### OpenAPI/Swagger 문서 내보내기

```bash
# JSON 및 YAML 형식으로 OpenAPI 스펙 내보내기
npm run docs:export
```

생성되는 파일:
- `docs/openapi.json` - OpenAPI 3.0 JSON 형식
- `docs/openapi.yaml` - OpenAPI 3.0 YAML 형식

### Postman Collection 생성

```bash
# Postman Collection 자동 생성
npm run docs:postman
```

생성되는 파일:
- `docs/postman-collection.json` - Postman에서 바로 import 가능

### 모든 문서 한번에 생성

```bash
# OpenAPI + Postman Collection 모두 생성
npm run docs:generate
```

**사용 예시:**
```bash
# API 문서를 생성하고 팀원들과 공유
npm run docs:generate
git add docs/
git commit -m "docs: Update API documentation"
```

---

## 데이터베이스 관리

### 마이그레이션 (Migration)

데이터베이스 스키마 변경을 버전 관리하고 적용합니다.

#### 마이그레이션 실행

```bash
# 모든 대기중인 마이그레이션 실행
npm run migrate:up
```

#### 마이그레이션 롤백

```bash
# 마지막 마이그레이션 되돌리기
npm run migrate:down

# 특정 버전까지 되돌리기
npm run migrate:down -- 0  # 모든 마이그레이션 롤백
npm run migrate:down -- 5  # 버전 5까지 롤백
```

#### 마이그레이션 상태 확인

```bash
# 현재 마이그레이션 상태 확인
npm run migrate:status
```

#### 새 마이그레이션 추가하기

1. `src/migrations/` 폴더에 새 파일 생성 (예: `002_add_user_profile.ts`)

```typescript
/* eslint-disable no-console */
import { Db } from 'mongodb';
import { Migration } from '../utils/database/migrations';

export const migration002_add_user_profile: Migration = {
  version: 2,
  name: 'Add user profile fields',

  async up(db: Db): Promise<void> {
    // 마이그레이션 로직
    await db.collection('users').updateMany(
      {},
      {
        $set: {
          profile: {
            bio: '',
            avatar: '',
          },
        },
      }
    );
    console.log('✅ Added profile fields to users');
  },

  async down(db: Db): Promise<void> {
    // 롤백 로직
    await db.collection('users').updateMany(
      {},
      {
        $unset: {
          profile: '',
        },
      }
    );
    console.log('✅ Removed profile fields from users');
  },
};
```

2. `src/migrations/index.ts`에 등록

```typescript
import { migration002_add_user_profile } from './002_add_user_profile';

export const migrations: Migration[] = [
  migration001_initial,
  migration002_add_user_profile, // 추가
];
```

### 데이터베이스 시딩 (Seeding)

테스트용 샘플 데이터를 자동으로 생성합니다.

#### 기본 시딩

```bash
# 기본값으로 시드 데이터 생성
# Users: 20, Concerts: 30, Articles: 50
npm run db:seed
```

#### 데이터베이스 초기화 후 시딩

```bash
# 기존 데이터 삭제 후 새로 생성
npm run db:seed -- --clear
```

#### 커스텀 데이터 개수

```bash
# 사용자 50명, 콘서트 100개, 게시글 200개 생성
npm run db:seed -- --users 50 --concerts 100 --articles 200

# 초기화 + 커스텀 개수
npm run db:seed -- --clear --users 10 --concerts 20
```

#### 생성되는 데이터

**관리자 계정 (자동 생성)**
- Email: `admin@livelink.com`
- Password: `admin123`

**일반 사용자 계정**
- Email: 랜덤 생성 (faker)
- Password: `password123` (모든 일반 계정 공통)

**샘플 데이터**
- 콘서트: 랜덤 장르, 날짜, 장소, 가격
- 게시글: 랜덤 제목, 내용, 카테고리, 태그

**개발 워크플로우 예시:**
```bash
# 1. 새 기능 개발 시작
git checkout -b feature/new-feature

# 2. 깨끗한 환경으로 시작
npm run migrate:up
npm run db:seed -- --clear

# 3. 개발 및 테스트...

# 4. 마이그레이션 테스트
npm run migrate:down    # 롤백 테스트
npm run migrate:up      # 다시 적용
```

---

## VSCode 개발 환경

프로젝트에는 VSCode 최적화 설정이 포함되어 있습니다.

### 추천 확장 프로그램

프로젝트를 열면 VSCode에서 자동으로 추천 확장 프로그램을 제안합니다:

- **ESLint** - 코드 린팅
- **Prettier** - 코드 포매팅
- **Jest Runner** - 테스트 실행
- **MongoDB for VS Code** - MongoDB 관리
- **Redis Client** - Redis 관리
- **Error Lens** - 에러 인라인 표시
- **GitLens** - Git 히스토리 시각화
- **Thunder Client** - API 테스트
- **GraphQL** - GraphQL 문법 지원

### 디버그 설정

VSCode의 디버그 메뉴(F5)에서 다음 설정을 사용할 수 있습니다:

#### 1. Debug Server
서버를 디버그 모드로 실행합니다.
- 브레이크포인트 설정 가능
- 변수 검사 및 콜스택 확인

#### 2. Debug Current Test
현재 열려있는 테스트 파일만 디버그합니다.

#### 3. Debug All Tests
모든 테스트를 디버그 모드로 실행합니다.

#### 4. Run Migration Up
마이그레이션을 디버그 모드로 실행합니다.

#### 5. Run Database Seed
시딩을 디버그 모드로 실행합니다.

#### 6. Attach to Process
실행 중인 Node.js 프로세스에 디버거를 연결합니다.

### VSCode Tasks

`Ctrl+Shift+P` → "Run Task"로 다음 작업들을 실행할 수 있습니다:

- **npm: dev** - 개발 서버 시작 (기본 빌드 작업)
- **npm: build** - TypeScript 빌드
- **npm: test** - 테스트 실행 (기본 테스트 작업)
- **npm: lint** - ESLint 실행
- **npm: format** - Prettier 포매팅
- **Generate Docs** - API 문서 생성
- **Database: Migrate Up** - 마이그레이션 실행
- **Database: Seed** - 시딩 실행
- **Docker: Build** - Docker 이미지 빌드
- **Docker: Up** - Docker Compose 시작
- **Docker: Down** - Docker Compose 종료

### 자동 포매팅

파일 저장 시 자동으로:
- ESLint로 코드 린팅 및 자동 수정
- Prettier로 코드 포매팅
- Import 문 정리

**설정 위치:**
- `.vscode/settings.json` - 워크스페이스 설정
- `.vscode/launch.json` - 디버그 설정
- `.vscode/tasks.json` - 작업 설정
- `.vscode/extensions.json` - 추천 확장 프로그램

---

## 전체 개발 워크플로우 예시

### 새 기능 개발

```bash
# 1. 새 브랜치 생성
git checkout -b feature/user-profile

# 2. 개발 환경 설정
npm run migrate:up
npm run db:seed -- --clear

# 3. VSCode에서 개발
code .  # VSCode 열기
# F5를 눌러 "Debug Server" 실행

# 4. API 테스트
# Thunder Client 또는 Postman Collection 사용

# 5. 마이그레이션 추가 (필요시)
# src/migrations/002_xxx.ts 생성
npm run migrate:up
npm run migrate:status

# 6. API 문서 업데이트
npm run docs:generate

# 7. 커밋 및 푸시
git add .
git commit -m "feat: Add user profile feature"
git push -u origin feature/user-profile
```

### 프로덕션 배포 전 체크리스트

```bash
# 1. 모든 마이그레이션 적용 확인
npm run migrate:status

# 2. 테스트 실행
npm run test

# 3. 린트 체크
npm run lint

# 4. 빌드 테스트
npm run build

# 5. API 문서 최신화
npm run docs:generate

# 6. 프로덕션 환경 확인
npm run env:validate:prod
```

---

## 문제 해결 (Troubleshooting)

### 마이그레이션 실패

```bash
# 마이그레이션 상태 확인
npm run migrate:status

# 마지막 마이그레이션 롤백
npm run migrate:down

# 다시 시도
npm run migrate:up
```

### 시딩 실패

```bash
# MongoDB 연결 확인
echo $MONGO_URI

# 데이터베이스 초기화 후 재시도
npm run db:seed -- --clear
```

### VSCode 디버거가 작동하지 않을 때

1. `node_modules` 삭제 후 재설치
```bash
rm -rf node_modules
npm install
```

2. TypeScript 버전 확인
```bash
npx tsc --version
```

3. VSCode TypeScript 서버 재시작
- `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

---

## 추가 리소스

- [Swagger 문서 보기](http://localhost:3000/api-docs) (서버 실행 중)
- [MongoDB 마이그레이션 가이드](https://www.mongodb.com/docs/manual/core/schema-validation/)
- [Faker.js 문서](https://fakerjs.dev/)
- [VSCode 디버깅 가이드](https://code.visualstudio.com/docs/editor/debugging)
