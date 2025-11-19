# 🚀 재생목록 기능 빠른 시작 가이드

현재 **Spotify 403 에러**와 **YouTube 자격 증명 누락** 문제가 있습니다. 아래 단계를 따라 해결하세요.

## 🔴 현재 문제

```
❌ Spotify 재생목록 생성 실패: Request failed with status code 403
❌ YouTube: No access, refresh token, API key or refresh handler callback is set.
```

---

## ✅ 해결 방법

### 1️⃣ Spotify 403 에러 해결 (필수)

현재 Refresh Token에 `playlist-modify-public` 스코프가 없습니다.

#### 옵션 A: 자동 스크립트 사용 (권장)

```bash
# 1. 스크립트 실행
npm run token:spotify

# 2. 브라우저에서 http://127.0.0.1:3001 열기

# 3. Spotify 로그인 및 권한 승인

# 4. 터미널에 출력된 Refresh Token 복사

# 5. .env 파일 업데이트
SPOTIFY_REFRESH_TOKEN=새로운토큰여기붙여넣기

# 6. 서버 재시작
npm run dev
```

#### 옵션 B: Spotify Developer Dashboard에서 수동 설정

**중요**: 먼저 Redirect URI를 추가해야 합니다!

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) 접속
2. 앱 선택 → **"Settings"** 클릭
3. **"Redirect URIs"** 섹션에 다음 추가:
   ```
   http://localhost:8888/callback
   ```
4. **"Save"** 클릭
5. 위의 자동 스크립트 실행

---

### 2️⃣ YouTube API 설정 (선택)

YouTube 재생목록 생성을 원하지 않으면 이 단계를 건너뛰어도 됩니다.

#### 2-1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 또는 생성
3. **"API 및 서비스" → "라이브러리"** 이동
4. **"YouTube Data API v3"** 검색 후 **"사용 설정"** 클릭
5. **"사용자 인증 정보" → "사용자 인증 정보 만들기"** 클릭
6. **"API 키"** 선택 → API 키 복사
7. 다시 **"사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"** 선택
8. 애플리케이션 유형: **"웹 애플리케이션"**
9. 승인된 리디렉션 URI:
   ```
   http://localhost:3000/oauth2callback
   ```
10. Client ID와 Client Secret 복사

#### 2-2. Refresh Token 생성

1. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) 접속
2. 오른쪽 상단 **⚙️ (설정)** 클릭
3. ✅ **"Use your own OAuth credentials"** 체크
4. 위에서 복사한 Client ID와 Secret 입력
5. 왼쪽 Step 1에서 다음 스코프 입력:
   ```
   https://www.googleapis.com/auth/youtube
   https://www.googleapis.com/auth/youtube.force-ssl
   ```
6. **"Authorize APIs"** 클릭 → Google 로그인
7. Step 2에서 **"Exchange authorization code for tokens"** 클릭
8. `refresh_token` 복사

#### 2-3. .env 업데이트

`.env` 파일에서 주석(`#`)을 제거하고 값을 입력:

```bash
# YouTube Music API 설정
YOUTUBE_API_KEY=복사한API키
YOUTUBE_CLIENT_ID=복사한클라이언트ID.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=복사한클라이언트시크릿
YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback
YOUTUBE_REFRESH_TOKEN=복사한리프레시토큰
```

#### 2-4. 서버 재시작

```bash
npm run dev
```

---

## 🧪 테스트

### Spotify만 활성화한 경우

```bash
curl -X POST http://localhost:3000/api/setlists \
  -H "Content-Type: application/json" \
  -d '{
    "concertId": "test-concert-123",
    "setList": [
      {"title": "Dynamite", "artist": "BTS"},
      {"title": "봄날", "artist": "방탄소년단"}
    ]
  }'
```

**예상 결과**:
```json
{
  "success": true,
  "data": {
    "spotifyPlaylistUrl": "https://open.spotify.com/playlist/...",
    "youtubePlaylistUrl": null
  }
}
```

### Spotify + YouTube 모두 활성화한 경우

```json
{
  "success": true,
  "data": {
    "spotifyPlaylistUrl": "https://open.spotify.com/playlist/...",
    "youtubePlaylistUrl": "https://www.youtube.com/playlist?list=..."
  }
}
```

---

## 📊 로그 확인

서버 로그에서 다음과 같은 메시지를 확인하세요:

### ✅ 성공

```
[INFO] 🎵 재생목록 자동 생성 시작: test-concert-123 (2곡)
[INFO] ✅ Spotify 재생목록 생성 완료: My Concert (2/2곡)
[INFO] ✅ YouTube 재생목록 생성 완료: My Concert (2/2곡)
[INFO] ✅ 재생목록 자동 생성 완료 (YouTube: true, Spotify: true)
```

### ❌ Spotify 403 (아직 해결 안 됨)

```
[ERROR] ❌ Spotify 재생목록 생성 실패: Request failed with status code 403
[WARN] ⚠️ Spotify 재생목록 생성 실패: 재생목록 생성에 실패했습니다.
[INFO] ✅ 재생목록 자동 생성 완료 (YouTube: false, Spotify: false)
```

→ **해결**: Refresh Token 재생성 필요

### ⚠️ YouTube 비활성화 (정상)

```
[WARN] ⚠️ YouTube Music API 자격 증명이 설정되지 않았습니다. YouTube 재생목록 생성을 건너뜁니다.
[INFO] ✅ 재생목록 자동 생성 완료 (YouTube: false, Spotify: true)
```

→ **정상**: YouTube를 사용하지 않는 경우

---

## 🎯 최소 설정 (Spotify만)

YouTube를 사용하지 않고 **Spotify만** 사용하려면:

1. ✅ Spotify Refresh Token 재생성 (위의 1️⃣ 단계)
2. ❌ YouTube 설정 건너뛰기 (주석 처리된 상태로 유지)
3. ✅ 서버 재시작
4. ✅ 테스트

**로그에서 YouTube 경고가 나타나지만 정상 작동합니다!**

---

## 📚 자세한 문서

- **전체 설정 가이드**: [docs/MUSIC_SERVICES_SETUP.md](./MUSIC_SERVICES_SETUP.md)
- **기능 설명**: [docs/PLAYLIST_FEATURE.md](./PLAYLIST_FEATURE.md)
- **문제 해결**: [docs/MUSIC_SERVICES_SETUP.md#문제-해결](./MUSIC_SERVICES_SETUP.md#문제-해결)

---

## 💡 팁

- Spotify 재생목록만으로도 충분히 유용합니다
- YouTube는 할당량 제한(하루 10,000 units)이 있으므로 선택적으로 사용하세요
- 셋리스트 저장은 재생목록 생성 실패와 관계없이 항상 성공합니다
- 재생목록은 자동으로 생성되며, 이미 생성된 경우 재생성하지 않습니다

---

## 🆘 도움이 필요하면

문제가 지속되면 다음 정보를 공유해주세요:

1. 서버 로그 전체 (특히 에러 메시지)
2. `.env` 파일의 `SPOTIFY_*` 변수 (값은 마스킹)
3. Spotify Developer Dashboard 스크린샷 (Redirect URIs 설정 부분)

**지금 바로 시작**: `npm run token:spotify` 🚀
