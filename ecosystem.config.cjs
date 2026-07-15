module.exports = {
  apps: [
    {
      name: 'gr8booksneo-backend-shared-dev',
      cwd: 'I:\\Gr8BooksNeo\\apps\\backend-shared-dev',
      script: 'dist\\src\\main.js',
      interpreter: 'node',

      env: {
        NODE_ENV: 'production',
        APP_ENV: 'staging',
        PORT: '3002',
      },

      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
