import assert from "node:assert/strict";
import { test } from "node:test";
import { sendEmailSchema } from "../src/validators/sendEmailValidator";

test("preserves a dotted lowercase outbox event type as the template code", () => {
    const result = sendEmailSchema.parse({
        templateCode: "account.activation.requested",
        to: [{ email: "recipient@example.com" }],
        variables: {},
    });

    assert.equal(result.templateCode, "account.activation.requested");
});
