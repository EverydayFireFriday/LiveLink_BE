module.exports = {
  apps: [
    {
      name: 'livelink-backend',
      script: 'dist/app.js',
      instances: 'max', // CPU 코어 수만큼 프로세스 생성
      exec_mode: 'cluster', // 클러스터 모드로 멀티코어 활용
      autorestart: true,
      watch: false,
      max_memory_restart: '2G', // 메모리 제한 증가

      // 무중단 배포 설정
      wait_ready: true, // 앱이 준비 신호를 보낼 때까지 대기
      listen_timeout: 10000, // 앱이 준비되기까지 대기 시간 (10초)
      kill_timeout: 5000, // graceful shutdown 대기 시간 (5초)
      max_restarts: 10, // 최대 재시작 횟수
      min_uptime: 10000, // 정상 실행으로 간주하는 최소 실행 시간 (10초)

      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
