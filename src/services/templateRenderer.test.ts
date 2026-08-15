import AppError from "../errors/AppError.js";
import type { EmailTemplate } from "../models/email.js";
import { renderEmailTemplate } from "./templateRenderer.js";

const template: EmailTemplate = {
  id: "1",
  code: "PASSWORD_RESET",
  locale: "en",
  description: null,
  subjectTemplate: "Reset your password, {{ firstName }}",
  htmlBodyTemplate: '<p>Hello {{firstName}}</p><a href="{{resetUrl}}">Reset</a>',
  textBodyTemplate: "Hello {{firstName}}\n{{resetUrl}}",
  requiredVariables: ["firstName", "resetUrl"],
  version: 1,
};

function captureAppError(fn: () => unknown): AppError {
  try {
    fn();
  } catch (error) {
    if (error instanceof AppError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected renderEmailTemplate to throw.");
}

describe("renderEmailTemplate", () => {
  it("renders subject, HTML, and text while escaping HTML values", () => {
    const result = renderEmailTemplate(template, {
      firstName: "A&B <Admin>",
      resetUrl: "https://example.com/reset?a=1&b=2",
    });

    expect(result.subject).toBe("Reset your password, A&B <Admin>");
    expect(result.html).toBe(
      '<p>Hello A&amp;B &lt;Admin&gt;</p><a href="https://example.com/reset?a=1&amp;b=2">Reset</a>',
    );
    expect(result.text).toBe("Hello A&B <Admin>\nhttps://example.com/reset?a=1&b=2");
  });

  it("rejects a missing required variable", () => {
    const error = captureAppError(() =>
      renderEmailTemplate(template, { firstName: "Ahmed" }),
    );

    expect(error.code).toBe("TEMPLATE_VARIABLE_MISSING");
  });

  it("rejects newline injection in a rendered subject", () => {
    const error = captureAppError(() =>
      renderEmailTemplate(template, {
        firstName: "Ahmed\r\nBcc: attacker@example.com",
        resetUrl: "https://example.com/reset",
      }),
    );

    expect(error.code).toBe("TEMPLATE_RENDER_FAILED");
  });

  it("rejects malformed placeholders", () => {
    const error = captureAppError(() =>
      renderEmailTemplate(
        { ...template, subjectTemplate: "Hello {{first-name}}" },
        { firstName: "Ahmed", resetUrl: "https://example.com/reset" },
      ),
    );

    expect(error.code).toBe("TEMPLATE_RENDER_FAILED");
  });

  it("throws AppError instances specifically, not just error-shaped objects", () => {
    expect(() => renderEmailTemplate(template, {})).toThrow(AppError);
  });
});
