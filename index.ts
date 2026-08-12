import app from "./app";
import config from "./src/config/env";
import pool from "./src/db/pool";
import smtpTransport from "./src/services/smtpTransport";

async function start(): Promise<void> {
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

        server.close(async (error?: Error) => {
            smtpTransport.close();
            await pool.end();

            if (error) {
                console.error("HTTP server shutdown failed.", error);
                process.exitCode = 1;
            }
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
