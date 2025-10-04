module.exports = {
  apps: [
    {
      name: 'livelink-backend',
      script: 'dist/app.js',
      instances: 1, // 'max' -> 1로 변경
      exec_mode: 'fork', // 'cluster' -> 'fork'로 변경
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
