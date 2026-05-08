const { createApp } = require('./app');

const requestedPort = Number(process.env.PORT || 3000);
const portWasExplicit = Boolean(process.env.PORT);
const maxPortAttempts = Number(process.env.PORT_SCAN_ATTEMPTS || 10);
const app = createApp();

function listen(port, attemptsLeft) {
  const server = app.listen(port, () => {
    console.log(`Template engine listening on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code !== 'EADDRINUSE') {
      throw error;
    }

    if (portWasExplicit || attemptsLeft <= 1) {
      console.error(`Port ${port} is already in use.`);
      console.error(`Stop the existing server or run with another port, for example: PORT=${port + 1} npm start`);
      process.exit(1);
    }

    const nextPort = port + 1;
    console.warn(`Port ${port} is already in use, trying ${nextPort}...`);
    listen(nextPort, attemptsLeft - 1);
  });
}

listen(requestedPort, maxPortAttempts);


