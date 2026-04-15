module.exports = {
  apps: [
    {
      name: 'csp-lan',
      script: 'start-dev.cjs',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 1500,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
