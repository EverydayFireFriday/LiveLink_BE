# 🎵 Music Services 설정 가이드

LiveLink 백엔드의 Spotify 및 YouTube Music 재생목록 자동 생성 기능을 사용하기 위한 설정 가이드입니다.

## 📋 목차

1. [Spotify 설정](#spotify-설정)
2. [YouTube Music 설정](#youtube-music-설정)
3. [테스트 방법](#테스트-방법)
4. [문제 해결](#문제-해결)

---

## 🎧 Spotify 설정

### 1단계: Spotify Developer Dashboard 설정

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) 접속 및 로그인
2. **"Create app"** 버튼 클릭
3. 앱 정보 입력:
   - **App name**: `LiveLink Playlist Generator` (원하는 이름)
   - **App description**: `Automatic playlist generation for concerts`
   - **Redirect URI**: `http://localhost:8888/callback` ⚠️ 정확히 입력!
   - **API/SDKs**: Web API 선택
4. **Save** 클릭
5. 앱 대시보드에서 **Client ID**와 **Client Secret** 확인

### 2단계: .env 파일 업데이트

```bash
SPOTIFY_CLIENT_ID=your-client-id-here
SPOTIFY_CLIENT_SECRET=your-client-secret-here
SPOTIFY_USER_ID=your-spotify-user-id
```

**Spotify User ID 확인 방법**:
- Spotify 앱 또는 웹 플레이어 열기
- 프로필 클릭 → "계정" → "프로필 편집"
- URL에서 사용자 ID 확인: `https://www.spotify.com/kr/account/profile/` 뒤의 문자열

### 3단계: Refresh Token 생성

현재 `.env`의 Refresh Token은 `playlist-modify-public` 스코프가 없어서 403 에러가 발생합니다.

**자동 생성 스크립트 사용 (권장)**:

```bash
# 스크립트 실행
npm run token:spotify

# 브라우저에서 http://127.0.0.1:3001 열기
# Spotify 로그인 및 권한 승인
# 생성된 Refresh Token을 .env에 복사
```

**수동 생성 방법**:

1. 브라우저에서 다음 URL 접속 (CLIENT_ID 교체 필요):
```
https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:8888/callback&scope=playlist-modify-public%20playlist-modify-private%20playlist-read-private%20playlist-read-collaborative
```

2. Spotify 로그인 및 권한 승인

3. Redirect된 URL에서 `code` 파라미터 복사:
```
http://localhost:8888/callback?code=AQD...
```

4. 터미널에서 다음 명령 실행 (값 교체 필요):
```bash
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic $(echo -n 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET' | base64)" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_CODE" \
  -d "redirect_uri=http://localhost:8888/callback"
```

5. 응답에서 `refresh_token` 복사하여 `.env`에 저장:
```bash
SPOTIFY_REFRESH_TOKEN=your-new-refresh-token-here
```

---

## 📺 YouTube Music 설정

### 1단계: Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **"API 및 서비스" → "라이브러리"** 메뉴 이동
4. **"YouTube Data API v3"** 검색 및 활성화
5. **"사용자 인증 정보" → "사용자 인증 정보 만들기"** 클릭
6. **"OAuth 클라이언트 ID"** 선택
7. 애플리케이션 유형: **웹 애플리케이션**
8. 승인된 리디렉션 URI 추가:
   - `http://localhost:3000/oauth2callback`
9. 생성 후 **Client ID**와 **Client Secret** 다운로드

### 2단계: API Key 생성

1. Google Cloud Console → **"사용자 인증 정보"**
2. **"사용자 인증 정보 만들기" → "API 키"** 클릭
3. API 키 복사

### 3단계: .env 파일 업데이트

```bash
YOUTUBE_API_KEY=your-api-key-here
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback
YOUTUBE_REFRESH_TOKEN=your-refresh-token
```

### 4단계: Refresh Token 생성

YouTube Music은 OAuth 2.0 Playground를 사용하여 Refresh Token을 생성할 수 있습니다:

1. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) 접속

2. 오른쪽 상단 **설정(⚙️)** 클릭
   - ✅ **"Use your own OAuth credentials"** 체크
   - **OAuth Client ID**: 위에서 생성한 Client ID 입력
   - **OAuth Client secret**: 위에서 생성한 Client Secret 입력

3. 왼쪽 Step 1에서 다음 스코프 선택:
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.force-ssl`

4. **"Authorize APIs"** 버튼 클릭

5. Google 계정으로 로그인 및 권한 승인

6. Step 2에서 **"Exchange authorization code for tokens"** 버튼 클릭

7. 응답에서 `refresh_token` 복사하여 `.env`에 저장

---

## ✅ 테스트 방법

### 1. 서버 재시작

환경 변수를 업데이트한 후 서버를 재시작해야 합니다:

```bash
npm run dev
# 또는
npm start
```

### 2. 셋리스트 생성 API 테스트

**POST** `/api/setlists` 엔드포인트로 셋리스트를 생성하면 자동으로 재생목록이 생성됩니다:

```bash
curl -X POST http://localhost:3000/api/setlists \
  -H "Content-Type: application/json" \
  -d '{
    "concertId": "your-concert-id",
    "setList": [
      {
        "title": "Dynamite",
        "artist": "BTS"
      },
      {
        "title": "봄날",
        "artist": "방탄소년단"
      }
    ]
  }'
```

**예상 응답**:

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "concertId": "your-concert-id",
    "setList": [...],
    "youtubePlaylistUrl": "https://www.youtube.com/playlist?list=PLxxx...",
    "spotifyPlaylistUrl": "https://open.spotify.com/playlist/xxx...",
    "createdAt": "2025-11-19T...",
    "updatedAt": "2025-11-19T..."
  },
  "message": "셋리스트가 생성되었습니다."
}
```

### 3. 셋리스트 조회 API 테스트

**GET** `/api/setlists/:concertId` 엔드포인트로 셋리스트를 조회하면 재생목록 URL도 함께 반환됩니다:

```bash
curl http://localhost:3000/api/setlists/your-concert-id
```

### 4. 로그 확인

서버 로그에서 재생목록 생성 과정을 확인할 수 있습니다:

```
[2025-11-19 17:34:21] info: 🎵 재생목록 자동 생성 시작: your-concert-id (10곡)
[2025-11-19 17:34:23] info: ✅ 재생목록 자동 생성 완료 (YouTube: true, Spotify: true)
```

---

## 🔧 문제 해결

### Spotify 403 Forbidden

**증상**: `Request failed with status code 403`

**원인**: Refresh Token에 `playlist-modify-public` 스코프가 없음

**해결**:
1. `npm run token:spotify` 실행
2. 브라우저에서 재인증
3. 새 Refresh Token을 `.env`에 저장
4. 서버 재시작

### YouTube "No access token" 에러

**증상**: `No access, refresh token, API key or refresh handler callback is set.`

**원인**: YouTube 환경 변수가 설정되지 않았거나 잘못됨

**해결**:
1. `.env` 파일에서 `YOUTUBE_*` 변수 확인
2. 주석 처리(`#`)되어 있으면 주석 제거
3. 값이 올바른지 확인 (특히 `YOUTUBE_API_KEY`)
4. 서버 재시작

### YouTube API Quota 초과

**증상**: `quotaExceeded` 에러

**원인**: YouTube Data API는 하루 10,000 units의 무료 할당량이 있음
- 재생목록 생성: 50 units
- 동영상 검색: 100 units
- 재생목록에 항목 추가: 50 units

**해결**:
1. Google Cloud Console에서 할당량 확인
2. 필요시 할당량 증가 요청
3. 또는 다음 날까지 대기 (UTC 기준 자정에 리셋)

### Spotify API Rate Limit

**증상**: `Request failed with status code 429`

**원인**: Spotify API는 30초당 약 30회 요청 제한이 있음

**해결**:
- 로그에서 `Retry-After` 헤더 확인
- 해당 시간(초) 후 재시도
- 자동 재시도 로직이 구현되어 있지 않으므로, 필요시 수동 재시도

### 일부 곡을 찾을 수 없음

**증상**: 로그에 `⚠️ 곡을 찾을 수 없습니다` 경고

**원인**:
- 곡 제목이나 아티스트명이 정확하지 않음
- 해당 플랫폼에 곡이 없음
- 검색 쿼리가 너무 복잡함 (feat., remix 등)

**해결**:
- 이는 정상적인 동작입니다 (찾은 곡만 재생목록에 추가됨)
- 셋리스트 정보를 더 정확하게 입력
- 필요시 수동으로 재생목록에 추가

### 재생목록은 생성되었지만 URL이 없음

**증상**: 셋리스트는 저장되었지만 `youtubePlaylistUrl` 또는 `spotifyPlaylistUrl`이 null

**원인**: 재생목록 생성 중 오류 발생 (셋리스트 저장은 성공)

**해결**:
1. 서버 로그에서 구체적인 오류 확인
2. API 자격 증명 재확인
3. 위의 문제 해결 방법 참고

---

## 📊 API 비용 및 제한

### Spotify

- ✅ **무료**: 일반적인 사용에는 비용이 들지 않음
- ⚠️ **Rate Limit**: 30초당 약 30회 요청
- 📝 **할당량**: 명시된 일일 제한 없음 (합리적인 사용)

### YouTube Data API v3

- ✅ **무료 할당량**: 하루 10,000 units
- 💰 **추가 비용**: 10,000 units당 $0 (무료 할당량 초과 시)
- ⚠️ **재생목록 생성 비용**:
  - 재생목록 생성: 50 units
  - 곡당 검색: 100 units
  - 곡당 추가: 50 units
  - **예시**: 10곡 재생목록 = 50 + (100×10) + (50×10) = 1,550 units

**권장 사항**:
- 셋리스트당 약 6-7개 재생목록 생성 가능 (10곡 기준)
- 많은 재생목록 생성 시 YouTube 할당량 증가 요청 고려
- 또는 Spotify만 사용하고 YouTube는 선택적으로 사용

---

## 🎯 다음 단계

1. ✅ Spotify Refresh Token 재생성
2. ✅ YouTube API 자격 증명 설정
3. ✅ 서버 재시작
4. ✅ 테스트 API 호출
5. ✅ 로그 확인 및 문제 해결

문제가 지속되면 로그 전체를 공유해주세요!
