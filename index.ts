import app from "./app.js";
import config from "./src/config/env.js";
import pool from "./src/db/pool.js";
import logger from "./src/logging/logger.js";
import smtpTransport from "./src/services/smtpTransport.js";

async function start(): Promise<void> {
  // Fail fast on startup if the database is unreachable, rather than
  // accepting traffic and only discovering it on the first request.
  await pool.query("SELECT 1");

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, `${config.serviceName} running`);
  });

  let isShuttingDown = false;

  function shutdown(signal: string): void {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info({ signal }, "shutting down gracefully");

    server.close((error?: Error) => {
      // server.close()'s callback must stay synchronous (Node expects
      // a void return here) -- the actual async cleanup runs in this
      // voided IIFE instead of making the callback itself async.
      void (async () => {
        smtpTransport.close();
        await pool.end();

        if (error) {
          logger.error({ err: error }, "HTTP server shutdown failed");
          process.exitCode = 1;
        }
      })();
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch(async (error: unknown) => {
  logger.error({ err: error }, "application startup failed");
  smtpTransport.close();
  await pool.end();
  process.exitCode = 1;
});
