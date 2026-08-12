import assert from "node:assert/strict";
import { test } from "node:test";
import AppError from "../src/errors/AppError";
import type { EmailTemplate } from "../src/models/email";
import { renderEmailTemplate } from "../src/services/templateRenderer";

const template: EmailTemplate = {
    id: "1",
    code: "PASSWORD_RESET",
    locale: "en",
    description: null,
    subjectTemplate: "Reset your password, {{ firstName }}",
    htmlBodyTemplate: "<p>Hello {{firstName}}</p><a href=\"{{resetUrl}}\">Reset</a>",
    textBodyTemplate: "Hello {{firstName}}\n{{resetUrl}}",
    requiredVariables: ["firstName", "resetUrl"],
    version: 1,
};

test("renders subject, HTML, and text while escaping HTML values", () => {
    const result = renderEmailTemplate(template, {
        firstName: "A&B <Admin>",
        resetUrl: "https://example.com/reset?a=1&b=2",
    });

    assert.equal(result.subject, "Reset your password, A&B <Admin>");
    assert.equal(
        result.html,
        '<p>Hello A&amp;B &lt;Admin&gt;</p><a href="https://example.com/reset?a=1&amp;b=2">Reset</a>',
    );
    assert.equal(
        result.text,
        "Hello A&B <Admin>\nhttps://example.com/reset?a=1&b=2",
    );
});

test("rejects a missing required variable", () => {
    assert.throws(
        () => renderEmailTemplate(template, { firstName: "Ahmed" }),
        (error: unknown) =>
            error instanceof AppError &&
            error.code === "TEMPLATE_VARIABLE_MISSING",
    );
});

test("rejects newline injection in a rendered subject", () => {
    assert.throws(
        () =>
            renderEmailTemplate(template, {
                firstName: "Ahmed\r\nBcc: attacker@example.com",
                resetUrl: "https://example.com/reset",
            }),
        (error: unknown) =>
            error instanceof AppError && error.code === "TEMPLATE_RENDER_FAILED",
    );
});

test("rejects malformed placeholders", () => {
    assert.throws(
        () =>
            renderEmailTemplate(
                { ...template, subjectTemplate: "Hello {{first-name}}" },
                { firstName: "Ahmed", resetUrl: "https://example.com/reset" },
            ),
        (error: unknown) =>
            error instanceof AppError && error.code === "TEMPLATE_RENDER_FAILED",
    );
});
