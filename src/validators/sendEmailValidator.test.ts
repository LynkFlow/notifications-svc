import { sendEmailSchema } from "./sendEmailValidator.js";

describe("sendEmailSchema", () => {
  it("preserves a dotted lowercase outbox event type as the template code", () => {
    const result = sendEmailSchema.parse({
      templateCode: "account.activation.requested",
      to: [{ email: "recipient@example.com" }],
      variables: {},
    });

    expect(result.templateCode).toBe("account.activation.requested");
  });
});
