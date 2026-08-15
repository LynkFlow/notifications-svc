import request from "supertest";
import type { Express } from "express";

process.env.NODE_ENV = "test";
process.env.SERVICE_NAME = "lf-test-service";
process.env.DATABASE_URL = "postgresql://localhost:5432/unused_test_database";
process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "test-user";
process.env.SMTP_PASSWORD = "test-password";
process.env.SMTP_FROM_EMAIL = "sender@example.com";

// env.ts reads process.env at module-load time, so app.ts (which imports it)
// must not load until the env vars above are set. A static top-level import
// would be hoisted before these assignments run. Jest transforms this file
// through Babel to CommonJS, so a plain require() (unlike a Babel-transformed
// dynamic import(), which double-wraps an already-__esModule-interop'd
// default export here) defers evaluation correctly and returns the real
// export without an extra wrapping layer.
/* eslint-disable @typescript-eslint/no-require-imports */
const { default: app } = require("../app.js") as typeof import("../app.js");
const { default: pool } =
  require("../src/db/pool.js") as typeof import("../src/db/pool.js");
const { default: smtpTransport } =
  require("../src/services/smtpTransport.js") as typeof import("../src/services/smtpTransport.js");
/* eslint-enable @typescript-eslint/no-require-imports */

afterAll(async () => {
  smtpTransport.close();
  await pool.end();
});

describe("app", () => {
  it("reports the service identity", async () => {
    const response = await request(app as Express).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "lf-test-service is running",
    });
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("exposes a database-independent liveness check", async () => {
    const response = await request(app as Express).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(typeof response.body.data.timestamp).toBe("string");
  });

  it("reports 503 when the database is unreachable", async () => {
    const response = await request(app as Express).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SERVICE_NOT_READY");
  });

  it("returns the standard not-found response", async () => {
    const response = await request(app as Express).get("/api/v1/missing");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(response.body.error.status).toBe(404);
  });

  it("rejects malformed JSON without leaking implementation details", async () => {
    const response = await request(app as Express)
      .post("/api/v1/missing")
      .set("Content-Type", "application/json")
      .send('{"value":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });

  it("validates the send-email request before accessing dependencies", async () => {
    const response = await request(app as Express)
      .post("/api/v1/emails/send")
      .send({
        templateCode: "PASSWORD_RESET",
        to: [],
        unexpected: true,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(typeof response.body.error.fieldErrors).toBe("object");
  });
});
