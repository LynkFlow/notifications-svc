import app from "./app.js";
import config from "./src/config/env.js";
import pool from "./src/db/pool.js";
import smtpTransport from "./src/services/smtpTransport.js";

async function start(): Promise<void> {
  // Fail fast on startup if the database is unreachable, rather than
  // accepting traffic and only discovering it on the first request.
  await pool.query("SELECT 1");

  const server = app.listen(config.port, () => {
    console.log(`${config.serviceName} running on port ${config.port}`);
  });

  let isShuttingDown = false;

  function shutdown(signal: string): void {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`${signal} received. Shutting down gracefully.`);

    server.close((error?: Error) => {
      // server.close()'s callback must stay synchronous (Node expects
      // a void return here) -- the actual async cleanup runs in this
      // voided IIFE instead of making the callback itself async.
      void (async () => {
        smtpTransport.close();
        await pool.end();

        if (error) {
          console.error("HTTP server shutdown failed.", error);
          process.exitCode = 1;
        }
      })();
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch(async (error: unknown) => {
  console.error("Application startup failed.", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  smtpTransport.close();
  await pool.end();
  process.exitCode = 1;
});
