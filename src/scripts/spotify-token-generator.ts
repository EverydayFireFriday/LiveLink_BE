#!/usr/bin/env ts-node
/**
 * Spotify Refresh Token Generator
 *
 * 이 스크립트는 playlist-modify-public 스코프를 포함한 Spotify Refresh Token을 생성합니다.
 *
 * 사용 방법:
 * 1. npm run token:spotify
 * 2. 브라우저에서 http://127.0.0.1:3001 접속
 * 3. Spotify 로그인 및 권한 승인
 * 4. 생성된 Refresh Token을 .env 파일에 복사
 */

import http from 'http';
import url from 'url';
import querystring from 'querystring';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// 환경에 따라 Redirect URI 자동 선택
// 프로덕션: 환경변수에서 가져오기
// 개발: 로컬호스트 사용
const REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/callback';
const PORT = 3001; // 3000은 메인 서버가 사용 중이므로 3001 사용

// Required scopes for playlist creation
const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-private',
  'playlist-read-collaborative',
];

console.log('\n🎵 Spotify Refresh Token Generator\n');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    '❌ Error: SPOTIFY_CLIENT_ID 또는 SPOTIFY_CLIENT_SECRET이 .env 파일에 없습니다.',
  );
  console.error('   .env 파일을 확인해주세요.\n');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const pathname = url.parse(req.url || '').pathname;

  if (pathname === '/') {
    // Step 1: Authorization URL 생성
    const authUrl =
      'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: SCOPES.join(' '),
        redirect_uri: REDIRECT_URI,
      });

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Spotify Token Generator</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            padding: 20px;
            background: #191414;
            color: #fff;
          }
          h1 { color: #1DB954; }
          .button {
            display: inline-block;
            background: #1DB954;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            margin-top: 20px;
          }
          .button:hover { background: #1ed760; }
          .info {
            background: #282828;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .scope {
            color: #1DB954;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>🎵 Spotify Refresh Token Generator</h1>
        <p>이 도구는 재생목록 생성 권한을 포함한 Refresh Token을 생성합니다.</p>

        <div class="info">
          <h3>요청할 권한 (Scopes):</h3>
          <ul>
            <li><span class="scope">playlist-modify-public</span> - 공개 재생목록 생성/수정</li>
            <li><span class="scope">playlist-modify-private</span> - 비공개 재생목록 생성/수정</li>
            <li><span class="scope">playlist-read-private</span> - 비공개 재생목록 읽기</li>
            <li><span class="scope">playlist-read-collaborative</span> - 협업 재생목록 읽기</li>
          </ul>
        </div>

        <p>아래 버튼을 클릭하여 Spotify에 로그인하고 권한을 승인해주세요.</p>
        <a href="${authUrl}" class="button">Spotify 로그인 & 권한 승인</a>
      </body>
      </html>
    `);
  } else if (pathname === '/callback') {
    // Step 2: Authorization Code를 받아서 Refresh Token 요청
    const query = url.parse(req.url || '', true).query;
    const code = query.code as string;

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>❌ Error: Authorization code가 없습니다.</h1>');
      return;
    }

    try {
      // Exchange code for tokens
      const tokenUrl = 'https://accounts.spotify.com/api/token';
      const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
        'base64',
      );

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: querystring.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        error_description?: string;
        refresh_token?: string;
        access_token?: string;
        expires_in?: number;
      };

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      const refreshToken = data.refresh_token;
      const accessToken = data.access_token;
      const expiresIn = data.expires_in;

      // 콘솔에 출력
      console.log('\n✅ Refresh Token 생성 완료!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 Refresh Token:');
      console.log(refreshToken);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`\n📝 .env 파일에 아래 내용을 추가/업데이트하세요:\n`);
      console.log(`SPOTIFY_REFRESH_TOKEN=${refreshToken}\n`);

      // 브라우저에 결과 표시
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Token Generated</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #191414;
              color: #fff;
            }
            h1 { color: #1DB954; }
            .token-box {
              background: #282828;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              word-break: break-all;
              font-family: 'Courier New', monospace;
              border: 2px solid #1DB954;
            }
            .success { color: #1DB954; }
            .info {
              background: #282828;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background: #1DB954;
              color: white;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 20px;
              cursor: pointer;
              border: none;
              font-size: 14px;
              margin-top: 10px;
            }
            .button:hover { background: #1ed760; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ Refresh Token 생성 완료!</h1>

          <div class="info">
            <h3>📋 다음 단계:</h3>
            <ol>
              <li>아래 Refresh Token을 복사하세요</li>
              <li><code>.env</code> 파일을 열어주세요</li>
              <li><code>SPOTIFY_REFRESH_TOKEN=...</code> 값을 새 토큰으로 교체하세요</li>
              <li>서버를 재시작하세요</li>
            </ol>
          </div>

          <h3>🔑 Your Refresh Token:</h3>
          <div class="token-box" id="token">${refreshToken}</div>
          <button class="button" onclick="copyToken()">📋 복사하기</button>

          <div class="info" style="margin-top: 30px;">
            <h3>ℹ️ 추가 정보:</h3>
            <p><strong>Access Token (1시간 유효):</strong></p>
            <p style="font-family: monospace; font-size: 12px; word-break: break-all;">${accessToken}</p>
            <p><strong>만료 시간:</strong> ${expiresIn}초 (${Math.floor((expiresIn || 0) / 60)}분)</p>
          </div>

          <p style="margin-top: 30px;">이 창을 닫고 터미널로 돌아가세요. 서버는 자동으로 종료됩니다.</p>

          <script>
            function copyToken() {
              const token = document.getElementById('token').textContent;
              navigator.clipboard.writeText(token).then(() => {
                alert('✅ Refresh Token이 클립보드에 복사되었습니다!');
              });
            }
          </script>
        </body>
        </html>
      `);

      // 5초 후 서버 종료
      setTimeout(() => {
        console.log('\n👋 서버를 종료합니다...\n');
        server.close();
        process.exit(0);
      }, 5000);
    } catch (error) {
      const err = error as Error;
      console.error('\n❌ Error:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>❌ Error</h1><p>${err.message}</p>`);
    }
  } else {
    res.writeHead(404);
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`✅ 서버가 시작되었습니다!`);
  console.log(`📍 브라우저에서 http://127.0.0.1:${PORT} 을 열어주세요.\n`);
  console.log(
    `⚠️  주의: Spotify Developer Dashboard에서 Redirect URI를 확인하세요:`,
  );
  console.log(`   등록된 URI: ${REDIRECT_URI}`);
  console.log(`   (이미 설정하셨다면 바로 진행하시면 됩니다!)\n`);
});
