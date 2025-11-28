module.exports = {
  apps: [{
    name: 'InboxAI',
    script: 'dist/server/index.js',
    cwd: '/var/www/InboxAI',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
