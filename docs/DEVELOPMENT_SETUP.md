# Development Setup Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **MongoDB** >= 6.0
- **Redis** >= 6.0
- **Git**

---

## 📦 1. Install Dependencies

### 1.1 Clone Repository
```bash
git clone https://github.com/your-org/LiveLink_BE.git
cd LiveLink_BE
```

### 1.2 Install Node Modules
```bash
npm install
```

---

## 🗄️ 2. Setup Databases

### 2.1 MongoDB 설치

#### macOS (Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

#### Ubuntu/Debian
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

#### Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

### 2.2 Redis 설치

#### macOS (Homebrew)
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
```

#### Docker
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### 2.3 데이터베이스 확인
```bash
# MongoDB 연결 확인
mongosh mongodb://localhost:27017

# Redis 연결 확인
redis-cli ping
# 응답: PONG
```

---

## ⚙️ 3. Environment Variables

### 3.1 자동 설정 (권장)
```bash
npm run env:setup
```

스크립트가 대화형으로 환경변수를 입력받아 `.env` 파일을 생성합니다.

### 3.2 수동 설정
`.env` 파일 생성:
```bash
cp .env.example .env
# 또는
touch .env
```

필수 환경변수 입력:
```env
MONGO_URI=mongodb://localhost:27017/livelink
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-super-secret-key-at-least-32-characters-long
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
ADMIN_EMAILS=admin@yourdomain.com
NODE_ENV=development
PORT=3000
```

### 3.3 환경변수 검증
```bash
npm run env:validate
```

---

## 🏃 4. Run Development Server

### 4.1 개발 서버 실행
```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 4.2 빌드 및 프로덕션 실행
```bash
# TypeScript 빌드
npm run build

# 프로덕션 모드 실행
npm start
```

---

## 🧪 5. Verify Installation

### 5.1 Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "uptime": 123,
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "userDB": true,
    "concertDB": true,
    "articleDB": true,
    "chatDB": true,
    "redis": true
  }
}
```

### 5.2 API Documentation
브라우저에서 열기:
```
http://localhost:3000/api-docs
```

---

## 🛠️ 6. Development Tools

### 6.1 Linting
```bash
# ESLint 실행
npm run lint

# 자동 수정
npm run lint:fix
```

### 6.2 Formatting
```bash
# Prettier 포맷팅
npm run format
```

### 6.3 TypeScript 타입 체크
```bash
# 타입 에러 확인
npx tsc --noEmit
```

---

## 📝 7. Git Hooks (Husky)

프로젝트에는 pre-commit 훅이 설정되어 있습니다:

```bash
# Husky 설치 (자동으로 실행됨)
npm run prepare
```

**Pre-commit 훅:**
- ESLint 검사
- Prettier 포맷팅
- TypeScript 타입 체크

---

## 🗂️ 8. Project Structure

```
LiveLink_BE/
├── src/
│   ├── config/           # 설정 파일
│   ├── controllers/      # 컨트롤러
│   ├── middlewares/      # 미들웨어
│   ├── models/           # 데이터 모델
│   ├── routes/           # API 라우트
│   ├── services/         # 비즈니스 로직
│   ├── utils/            # 유틸리티
│   ├── socket/           # Socket.IO
│   └── app.ts            # 메인 앱
├── docs/                 # 문서
├── dist/                 # 빌드 결과물
├── logs/                 # 로그 파일
└── tests/                # 테스트
```

---

## 🐛 9. Debugging

### 9.1 VS Code Debug 설정
`.vscode/launch.json` 생성:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/app.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### 9.2 Node.js Inspector
```bash
node --inspect dist/app.js
```

Chrome DevTools: `chrome://inspect`

---

## 🔧 10. Common Issues

### Issue 1: MongoDB 연결 실패
```
❌ MongoDB connection failed
```

**해결방법:**
```bash
# MongoDB 실행 확인
mongosh mongodb://localhost:27017

# 서비스 재시작
brew services restart mongodb-community@6.0  # macOS
sudo systemctl restart mongod                # Linux
```

### Issue 2: Redis 연결 실패
```
❌ Redis connection failed
```

**해결방법:**
```bash
# Redis 실행 확인
redis-cli ping

# 서비스 재시작
brew services restart redis      # macOS
sudo systemctl restart redis     # Linux
```

### Issue 3: 포트 충돌
```
Error: listen EADDRINUSE: address already in use :::3000
```

**해결방법:**
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>

# 또는 다른 포트 사용
PORT=3001 npm run dev
```

### Issue 4: 환경변수 검증 실패
```
❌ 환경변수 검증 실패
```

**해결방법:**
```bash
# 환경변수 재설정
npm run env:setup

# 또는 .env 파일 확인
cat .env
```

---

## 📊 11. Database Initialization

### 11.1 초기 데이터 생성 (Optional)
```bash
# MongoDB에 초기 데이터 추가
mongosh mongodb://localhost:27017/livelink

# MongoDB Shell에서:
use livelink

# 테스트 사용자 생성
db.users.insertOne({
  username: "testuser",
  email: "test@example.com",
  name: "Test User",
  passwordHash: "...",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## 🔗 12. Useful Commands

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start

# 테스트
npm test

# 린트
npm run lint

# 포맷
npm run format

# 환경변수 설정
npm run env:setup

# 환경변수 검증
npm run env:validate
```

---

## 📚 13. Next Steps

1. [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md)
2. [API Reference](./API_REFERENCE.md)
3. [Architecture Documentation](./architecture/README.md)
4. [Testing Guide](./TESTING.md)

---

## 🆘 14. Getting Help

- **Documentation:** `/docs`
- **API Docs:** `http://localhost:3000/api-docs`
- **Issues:** GitHub Issues
- **Team Chat:** Slack/Discord

---

**Last Updated:** 2025-10-10
**Version:** 1.0.0
