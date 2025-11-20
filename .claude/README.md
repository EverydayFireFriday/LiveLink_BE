# Claude Code Project Documentation

**서비스명**: stagelives

이 폴더는 AI 어시스턴트(Claude, ChatGPT 등)가 stagelives 백엔드 프로젝트를 더 잘 이해하고 작업할 수 있도록 돕기 위한 컨텍스트 문서들을 포함합니다.

## 서비스 정보

- **서비스명**: stagelives (실제 서비스명, 모든 곳에서 사용)
- **프로젝트명**: LiveLink (GitHub 레포지토리 이름)
- **데이터베이스**: stagelives
- **도메인**: 콘서트/공연 정보 및 커뮤니티 플랫폼

**중요**: 이메일, 푸시 알림, UI 등 사용자가 보는 모든 곳에서 **stagelives**를 사용합니다.

## 📁 문서 구조

### 1. [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
**프로젝트 개요 및 목표**

- 프로젝트 설명 및 주요 목표
- 기술 스택 요약
- 프로젝트 구조
- 핵심 기능 설명
- 환경 설정 가이드
- 개발 워크플로우

**언제 읽어야 하는가:**
- 프로젝트를 처음 시작할 때
- 프로젝트 전체 맥락을 이해할 때
- 새로운 팀원 온보딩 시

### 2. [ARCHITECTURE.md](./ARCHITECTURE.md)
**시스템 아키텍처 상세**

- 고수준 아키텍처 다이어그램
- 계층별 아키텍처 (Presentation, Business, Data, Infrastructure)
- 데이터 플로우
- 데이터베이스 구조
- 보안 아키텍처
- 확장성 고려사항
- 배포 아키텍처

**언제 읽어야 하는가:**
- 새로운 주요 기능을 설계할 때
- 시스템 성능 개선을 고려할 때
- 아키텍처 결정이 필요할 때

### 3. [CODING_STANDARDS.md](./CODING_STANDARDS.md)
**코딩 표준 및 베스트 프랙티스**

- TypeScript 가이드라인
- 코드 구조 및 네이밍 규칙
- 에러 핸들링 패턴
- 데이터베이스 작업 모범 사례
- 로깅 전략
- 보안 체크리스트
- API 설계 규칙
- 테스팅 철학

**언제 읽어야 하는가:**
- 새로운 코드를 작성할 때
- 코드 리뷰를 할 때
- 일관된 코드 스타일을 유지할 때

### 4. [DEPENDENCIES.md](./DEPENDENCIES.md)
**의존성 패키지 관리**

- 핵심 의존성 목록 및 버전
- 각 패키지 선택 이유
- 대안 패키지 비교
- 버전 관리 정책
- 알려진 이슈 및 해결방법
- 라이선스 준수

**언제 읽어야 하는가:**
- 새로운 패키지를 추가할 때
- 의존성을 업데이트할 때
- 패키지 선택에 대한 이유를 알고 싶을 때

### 5. [COMMON_TASKS.md](./COMMON_TASKS.md)
**자주 하는 작업 가이드**

- 개발 환경 설정
- 데이터베이스 작업
- 새 기능 추가 방법
- 테스팅 가이드
- 디버깅 방법
- 성능 최적화
- 배포 절차
- 문제 해결 (Troubleshooting)

**언제 읽어야 하는가:**
- 특정 작업을 수행하는 방법을 찾을 때
- 문제가 발생했을 때
- 반복적인 작업의 효율성을 높이고 싶을 때

### 6. [CONTEXT.md](./CONTEXT.md)
**AI 어시스턴트를 위한 특별 컨텍스트**

- 프로젝트 특성 및 현 상태
- 중요한 디자인 패턴
- 흔한 실수 및 함정
- 모델 구조 규칙
- 보안 체크리스트
- 최근 변경사항
- AI가 코드를 작성할 때 고려해야 할 사항

**언제 읽어야 하는가:**
- AI 어시스턴트가 코드를 생성하기 전에 (자동으로 읽힘)
- 프로젝트의 "암묵적 규칙"을 이해할 때
- 왜 특정 방식으로 구현되었는지 알고 싶을 때

## 🤖 AI 어시스턴트 사용 가이드

### Claude Code Desktop 사용자

Claude Code Desktop을 사용하는 경우, 이 `.claude` 폴더의 문서들이 자동으로 프로젝트 컨텍스트에 포함됩니다.

**권장 사용법:**
1. 프로젝트를 열면 자동으로 컨텍스트 로드
2. 특정 작업 전에 해당 문서를 참조하도록 요청
3. 예: "CODING_STANDARDS.md를 참고하여 새로운 API 엔드포인트를 작성해줘"

### 다른 AI 어시스턴트 사용자

프로젝트 작업 시작 시 다음 문서들을 컨텍스트에 제공하세요:

**최소한의 컨텍스트:**
- `PROJECT_OVERVIEW.md`: 프로젝트 이해
- `CONTEXT.md`: AI를 위한 특별 지침

**코드 생성 시:**
- `CODING_STANDARDS.md`: 코딩 규칙 준수
- `ARCHITECTURE.md`: 아키텍처 패턴 이해

**특정 작업 시:**
- `COMMON_TASKS.md`: 작업별 가이드
- `DEPENDENCIES.md`: 패키지 관련 작업

## 📚 추가 문서

프로젝트의 다른 중요한 문서들:

- **[docs/architecture/ERD.md](../docs/architecture/ERD.md)**: 데이터베이스 스키마 및 관계
- **[docs/architecture/SEQUENCE_DIAGRAMS.md](../docs/architecture/SEQUENCE_DIAGRAMS.md)**: 주요 비즈니스 플로우
- **[docs/architecture/README.md](../docs/architecture/README.md)**: 전체 아키텍처 문서

## 🔄 문서 업데이트

이 문서들은 프로젝트와 함께 발전합니다.

**업데이트가 필요한 경우:**
- 새로운 주요 기능 추가 시
- 아키텍처 변경 시
- 새로운 의존성 추가 시
- 중요한 디자인 결정 시

**마지막 업데이트:** 2025-11-20
**버전:** 1.1.0

---

## 💡 사용 예시

### 예시 1: 새로운 기능 추가

```
1. PROJECT_OVERVIEW.md 읽기 → 프로젝트 구조 이해
2. ARCHITECTURE.md 읽기 → 어디에 코드를 추가할지 결정
3. COMMON_TASKS.md "새 기능 추가" 섹션 → 단계별 가이드 따르기
4. CODING_STANDARDS.md 참고 → 코드 작성
5. 코드 리뷰 시 CODING_STANDARDS.md 체크리스트 확인
```

### 예시 2: 버그 수정

```
1. COMMON_TASKS.md "디버깅" 섹션 → 문제 진단
2. CONTEXT.md → 흔한 함정 확인
3. 해결책 구현 (CODING_STANDARDS.md 준수)
4. COMMON_TASKS.md "테스팅" 섹션 → 테스트 작성
```

### 예시 3: 의존성 업데이트

```
1. DEPENDENCIES.md → 현재 버전 및 업데이트 정책 확인
2. 패키지 업데이트
3. COMMON_TASKS.md "테스팅" → 회귀 테스트
4. 문제 발생 시 DEPENDENCIES.md "알려진 이슈" 확인
```

---

**이 문서는 AI와 인간 개발자 모두를 위한 것입니다.**
