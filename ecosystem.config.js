module.exports = {
  apps: [
    {
      name: 'busgo-api',
      script: 'app/server.js',
      cwd: '/var/www/api-busgo',

      exec_mode: 'cluster',
      instances: 1,

      autorestart: true,
      watch: ['app', 'config'],

      ignore_watch: [
        'node_modules',
        'logs',
        'public',
        'uploads',
        '.git',
        '*.log'
      ],

      watch_options: {
        followSymlinks: false
      },

      max_memory_restart: '300M',

      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        TZ: 'America/Santiago'
      }
    }
  ]
};