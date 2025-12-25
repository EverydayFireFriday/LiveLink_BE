module.exports = {
  apps: [
    {
      name: 'livelink-backend',
      script: 'dist/app.js',
      instances: 'max', // CPU 코어 수만큼 프로세스 생성
      exec_mode: 'cluster', // 클러스터 모드로 멀티코어 활용
      autorestart: true,
      watch: false,
      max_memory_restart: '2G', // 메모리 2GB 도달 시 자동 재시작

      // 무중단 배포 설정
      wait_ready: true, // 앱이 준비 신호를 보낼 때까지 대기
      listen_timeout: 10000, // 앱이 준비되기까지 대기 시간 (10초)
      kill_timeout: 10000, // graceful shutdown 대기 시간 (10초)
      max_restarts: 10, // 최대 재시작 횟수
      min_uptime: 10000, // 정상 실행으로 간주하는 최소 실행 시간 (10초)

      // 로그 설정 (개발 환경: 일반 텍스트, 프로덕션: JSON)
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true, // 모든 인스턴스의 로그를 하나로 병합

      // 환경 변수
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        PM2_LOG_TYPE: 'raw', // 개발 환경: 일반 텍스트
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        PM2_LOG_TYPE: 'json', // 프로덕션: JSON (로그 수집 시스템용)
      },
      env_develop: {
        NODE_ENV: 'development',
        PORT: 3000,
        PM2_LOG_TYPE: 'raw',
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        PM2_LOG_TYPE: 'raw',
      },

      // 크론 재시작 (매일 새벽 4시에 재시작 - 선택사항)
      // cron_restart: '0 4 * * *',

      // 모니터링
      instance_var: 'INSTANCE_ID', // 인스턴스 ID 환경변수

      // 소스맵 지원
      source_map_support: true,

      // 시그널 처리
      shutdown_with_message: true,
    },
  ],

  // PM2 배포 설정 (선택사항)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/LiveLink_BE.git',
      path: '/var/www/livelink-backend',
      'post-deploy':
        'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'git config core.fileMode false',
    },
    staging: {
      user: 'deploy',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-repo/LiveLink_BE.git',
      path: '/var/www/livelink-backend-staging',
      'post-deploy':
        'npm ci && npm run build && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
