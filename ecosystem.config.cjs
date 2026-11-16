/* PM2: keeps Elevare running, restarts it on a crash and after a server reboot (`pm2 startup` once).
   npm run pm2:start · pm2 logs elevare · npm run pm2:reload after a new build */
module.exports = {
  apps: [
    {
      name: 'elevare',
      cwd: './backend',
      script: 'dist/server.js',
      node_args: '--env-file-if-exists=.env',
      instances: 1 /* rate limits are kept in memory, so one process */,
      autorestart: true,
      max_memory_restart: '512M',
      kill_timeout: 12000 /* the server finishes open requests on SIGINT (10 s) */,
      time: true
    }
  ]
};
