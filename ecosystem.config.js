module.exports = {
  apps: [
    {
      name: "private-chat-app",
      script: "./dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
