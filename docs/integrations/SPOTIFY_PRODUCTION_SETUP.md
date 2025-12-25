# 🚀 Spotify 프로덕션 환경 설정 가이드

프로덕션 서버에서 Spotify 재생목록 기능을 사용하기 위한 설정 가이드입니다.

## 📋 개요

로컬 개발과 프로덕션 환경의 차이점:

| 항목 | 로컬 개발 | 프로덕션 |
|------|----------|----------|
| Redirect URI | `http://127.0.0.1:3000/callback` | `https://yourdomain.com/callback` |
| 토큰 생성 위치 | 로컬 PC | 프로덕션 서버 또는 로컬 PC |
| Spotify Dashboard 설정 | 로컬 URI 등록 | 프로덕션 URI 추가 등록 |

## 🔧 프로덕션 설정 단계

### 1단계: Spotify Developer Dashboard 설정

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) 접속
2. 앱 선택 → **Settings** 클릭
3. **Redirect URIs** 섹션에 **프로덕션 URI 추가**:
   ```
   https://yourdomain.com/callback
   ```

   **중요**: 기존 로컬 URI(`http://127.0.0.1:3000/callback`)는 **삭제하지 마세요**! 두 개 모두 등록되어 있어야 합니다.

4. **Save** 클릭

### 2단계: 프로덕션 환경변수 설정

프로덕션 서버의 `.env` 파일에 다음 추가:

```bash
# Spotify Redirect URI (프로덕션)
SPOTIFY_REDIRECT_URI=https://yourdomain.com/callback
```

**예시**:
```bash
# 실제 도메인이 api.stagelives.com인 경우
SPOTIFY_REDIRECT_URI=https://api.stagelives.com/callback
```

### 3단계: Refresh Token 재생성

**옵션 A: 로컬에서 생성 (권장)**

로컬 PC에서 프로덕션 URI를 사용하여 토큰 생성:

```bash
# 1. 로컬 .env 파일을 임시로 수정
SPOTIFY_REDIRECT_URI=https://yourdomain.com/callback

# 2. 토큰 생성 스크립트 실행
npm run token:spotify

# 3. 브라우저에서 http://127.0.0.1:3001 열기
#    → Spotify 로그인 후 https://yourdomain.com/callback으로 리다이렉트됨
#    → 리다이렉트 주소의 code 파라미터 복사

# 4. code로 토큰 교환 (아래 스크립트 참고)
```

**code로 토큰 교환 스크립트**:
```bash
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic $(echo -n 'CLIENT_ID:CLIENT_SECRET' | base64)" \
  -d "grant_type=authorization_code" \
  -d "code=여기에_code_붙여넣기" \
  -d "redirect_uri=https://yourdomain.com/callback"
```

**옵션 B: 프로덕션 서버에서 직접 생성**

프로덕션 서버에 SSH 접속 후:

```bash
# 1. 프로덕션 서버에서 토큰 생성 스크립트 실행
npm run token:spotify

# 2. 브라우저에서 https://yourdomain.com:3001 접속
#    (방화벽에서 3001 포트 임시 오픈 필요)

# 3. Spotify 로그인 및 토큰 생성

# 4. 생성된 토큰을 .env에 추가
```

### 4단계: 프로덕션 환경변수 업데이트

생성된 Refresh Token을 프로덕션 `.env`에 추가:

```bash
SPOTIFY_REFRESH_TOKEN=새로_생성된_토큰
```

### 5단계: 서버 재시작

```bash
# PM2 사용 시
pm2 restart stagelives-api

# Docker 사용 시
docker-compose restart

# 직접 실행 시
npm run start
```

## 🧪 테스트

프로덕션 서버에서 API 테스트:

```bash
curl -X POST https://yourdomain.com/api/setlists \
  -H "Content-Type: application/json" \
  -d '{
    "concertId": "test-concert-123",
    "setList": [
      {"title": "Dynamite", "artist": "BTS"}
    ]
  }'
```

**예상 응답**:
```json
{
  "success": true,
  "data": {
    "spotifyPlaylistUrl": "https://open.spotify.com/playlist/..."
  }
}
```

## 🔐 보안 고려사항

### 1. 환경변수 관리

- ❌ `.env` 파일을 Git에 커밋하지 마세요
- ✅ GitHub Secrets 또는 환경변수 관리 도구 사용
- ✅ CI/CD 파이프라인에서 자동으로 환경변수 주입

### 2. Refresh Token 보안

- 🔒 Refresh Token은 **절대 만료되지 않습니다** (사용자가 앱 권한 취소 전까지)
- 🔒 Token이 유출되면 누구나 재생목록을 생성할 수 있습니다
- 🔒 주기적으로 토큰 재생성 권장 (3-6개월마다)

### 3. Redirect URI 보안

- ✅ HTTPS만 사용 (HTTP는 보안에 취약)
- ✅ 정확한 도메인만 등록 (와일드카드 사용 금지)
- ✅ 개발/스테이징/프로덕션 환경별로 별도 URI 등록

## 📊 환경별 설정 요약

### 로컬 개발 환경

```bash
# .env (로컬)
SPOTIFY_CLIENT_ID=3fdb876e48e04523966f0930ed1d576d
SPOTIFY_CLIENT_SECRET=66de731ab1704fcea7ab933e151b0b2c
SPOTIFY_USER_ID=31q35j5jn3qfocucy5ivwdwkw3e4
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
SPOTIFY_REFRESH_TOKEN=로컬용_토큰
```

**Spotify Dashboard Redirect URIs**:
- `http://127.0.0.1:3000/callback`

### 프로덕션 환경

```bash
# .env.production (프로덕션)
SPOTIFY_CLIENT_ID=3fdb876e48e04523966f0930ed1d576d
SPOTIFY_CLIENT_SECRET=66de731ab1704fcea7ab933e151b0b2c
SPOTIFY_USER_ID=31q35j5jn3qfocucy5ivwdwkw3e4
SPOTIFY_REDIRECT_URI=https://api.stagelives.com/callback
SPOTIFY_REFRESH_TOKEN=프로덕션용_토큰
```

**Spotify Dashboard Redirect URIs**:
- `http://127.0.0.1:3000/callback` (로컬 개발용)
- `https://api.stagelives.com/callback` (프로덕션용)

## 🚨 문제 해결

### "Invalid redirect URI" 에러

**증상**: Spotify 인증 시 redirect_uri_mismatch 에러

**원인**: Dashboard에 등록된 URI와 요청한 URI가 다름

**해결**:
1. Spotify Dashboard에서 정확한 URI 확인
2. `.env`의 `SPOTIFY_REDIRECT_URI` 확인 (대소문자, 슬래시 포함)
3. 프로토콜 확인 (http vs https)

### 토큰이 작동하지 않음

**증상**: 403 Forbidden 에러 또는 "Invalid access token" 에러

**원인**:
- 다른 Redirect URI로 생성된 토큰 사용
- 토큰이 만료되었거나 취소됨

**해결**:
1. 올바른 Redirect URI로 토큰 재생성
2. Spotify 계정에서 앱 권한 확인
3. Client ID/Secret 확인

### 프로덕션에서만 실패

**증상**: 로컬은 정상, 프로덕션만 실패

**확인사항**:
- [ ] 프로덕션 `.env`에 올바른 환경변수 설정됨
- [ ] Spotify Dashboard에 프로덕션 URI 등록됨
- [ ] 프로덕션용 Refresh Token 생성 및 설정됨
- [ ] 서버 재시작함

## 💡 모범 사례

1. **환경별 토큰 분리**
   - 로컬, 스테이징, 프로덕션 각각 다른 토큰 사용
   - 환경별로 다른 Spotify 계정 사용 고려

2. **토큰 갱신 자동화**
   - CI/CD 파이프라인에 토큰 갱신 단계 추가
   - Slack 알림으로 만료 전 알림

3. **로그 모니터링**
   - Spotify API 에러 로그 모니터링
   - Rate Limit 도달 시 알림 설정

4. **백업 계획**
   - Spotify API 장애 시 대체 방안
   - YouTube Music 병행 사용 고려

## 📚 관련 문서

- [빠른 시작 가이드](./QUICK_START.md)
- [전체 설정 가이드](./MUSIC_SERVICES_SETUP.md)
- [기능 설명](./PLAYLIST_FEATURE.md)

---

**질문이나 문제가 있으면 이슈를 생성해주세요!**
