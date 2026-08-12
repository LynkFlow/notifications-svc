import assert from "node:assert/strict";
import { after, test } from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.SERVICE_NAME = "lf-test-service";
process.env.DATABASE_URL = "postgresql://localhost:5432/unused_test_database";
process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "test-user";
process.env.SMTP_PASSWORD = "test-password";
process.env.SMTP_FROM_EMAIL = "sender@example.com";

const { default: app } = require("../app") as typeof import("../app");
const { default: pool } = require("../src/db/pool") as typeof import("../src/db/pool");

after(async () => {
    await pool.end();
});

test("reports the service identity", async () => {
    const response = await request(app).get("/");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
        success: true,
        message: "lf-test-service is running",
    });
    assert.equal(response.headers["x-powered-by"], undefined);
});

test("exposes a database-independent liveness check", async () => {
    const response = await request(app).get("/health/live");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, "ok");
    assert.equal(typeof response.body.data.timestamp, "string");
});

test("returns the standard not-found response", async () => {
    const response = await request(app).get("/api/v1/missing");

    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, "ROUTE_NOT_FOUND");
});

test("rejects malformed JSON without leaking implementation details", async () => {
    const response = await request(app)
        .post("/api/v1/missing")
        .set("Content-Type", "application/json")
        .send('{"value":');

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "INVALID_JSON");
});

test("validates the send-email request before accessing dependencies", async () => {
    const response = await request(app).post("/api/v1/emails/send").send({
        templateCode: "PASSWORD_RESET",
        to: [],
        unexpected: true,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
