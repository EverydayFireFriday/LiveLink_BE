# LiveLink Backend API Server

## 📋 Project Overview

**LiveLink Backend (LiveLink_BE)** is a comprehensive API server built with TypeScript and Express.js that provides authentication, article management, and concert management services. The system utilizes MongoDB for data persistence and Redis for session management and caching.

### 🛠 Tech Stack

- **Runtime**: Node.js (>=18.0.0)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache/Session Store**: Redis
- **Authentication**: Session-based with bcrypt password hashing
- **API Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest
- **Code Quality**: ESLint + Prettier

## 🚀 Getting Started

### Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **MongoDB** (local installation or cloud service like MongoDB Atlas)
- **Redis** (local installation or cloud service)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/EverydayFireFriday/LiveLink_BE.git
   cd LiveLink_BE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/livelink

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password

   # Session Configuration
   SESSION_SECRET=your_super_secret_session_key

   # Email Configuration (for user verification)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

## 🔧 Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build the project for production |
| `npm start` | Start the production server |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Check code style with ESLint |
| `npm run lint:fix` | Fix linting issues automatically |
| `npm run format` | Format code with Prettier |
| `npm run clean` | Remove build directory |

### Development Workflow

1. **Start development server**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3000` (or the port specified in your `.env` file)

2. **API Documentation**
   
   Once the server is running, visit `http://localhost:3000/api-docs` to access the interactive Swagger documentation.

3. **Health Check**
   
   Test if the server is running: `GET http://localhost:3000/health`

## 🏗 Build & Deployment

### Production Build

1. **Create production build**
   ```bash
   npm run build
   ```
   This compiles TypeScript to JavaScript in the `dist/` directory.

2. **Start production server**
   ```bash
   npm start
   ```

### Docker Deployment (Optional)

If you have Docker configuration files, you can use:
```bash
docker build -t livelink-be .
docker run -p 3000:3000 --env-file .env livelink-be
```

## 📚 API Documentation

### Main API Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `POST /auth/forgot-password` - Password reset request

#### Articles
- `GET /articles` - Get articles list
- `POST /articles` - Create new article
- `GET /articles/:id` - Get article by ID
- `PUT /articles/:id` - Update article
- `DELETE /articles/:id` - Delete article
- `POST /articles/:id/like` - Like/unlike article
- `POST /articles/:id/bookmark` - Bookmark/unbookmark article

#### Concerts
- `GET /concerts` - Get concerts list
- `POST /concerts` - Create new concert (admin only)
- `GET /concerts/:id` - Get concert by ID
- `PUT /concerts/:id` - Update concert (admin only)
- `DELETE /concerts/:id` - Delete concert (admin only)
- `GET /concerts/search` - Search concerts
- `POST /concerts/:id/like` - Like/unlike concert

### Response Format

All API responses follow this standard format:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

Tests are organized by feature:

git add .
# 에러 로깅 시스템 구축 완료!
## 새로운 로깅 기능:
- Winston 기반 구조화된 로깅
- Correlation ID 추적
- 중앙화된 에러 처리
- 성능 모니터링
- 로깅 시스템 헬스체크 (/health/logs)

## 설치 필요 의존성:
npm install winston winston-daily-rotate-file uuid @types/uuid
