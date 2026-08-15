import { createTestDb } from "../test/testDb.js";
import { EmailTemplateRepository } from "./EmailTemplateRepository.js";

describe("EmailTemplateRepository", () => {
  it("maps a found row into an EmailTemplate", async () => {
    const { db, query } = createTestDb();
    query.mockResolvedValue({
      command: "SELECT",
      rowCount: 1,
      rows: [
        {
          id: "1",
          code: "account.activation.requested",
          locale: "en",
          description: null,
          subject_template: "Welcome",
          html_body_template: "<p>Hi</p>",
          text_body_template: "Hi",
          required_variables: ["fullName", "token"],
          version: 2,
        },
      ],
    });
    const repository = new EmailTemplateRepository(db);

    await expect(
      repository.findActiveEmailTemplate("account.activation.requested", "en"),
    ).resolves.toEqual({
      id: "1",
      code: "account.activation.requested",
      locale: "en",
      description: null,
      subjectTemplate: "Welcome",
      htmlBodyTemplate: "<p>Hi</p>",
      textBodyTemplate: "Hi",
      requiredVariables: ["fullName", "token"],
      version: 2,
    });
  });

  it("returns null when no active template matches", async () => {
    const { db, query } = createTestDb();
    query.mockResolvedValue({ command: "SELECT", rowCount: 0, rows: [] });
    const repository = new EmailTemplateRepository(db);

    await expect(repository.findActiveEmailTemplate("missing.code", "en")).resolves.toBeNull();
  });

  it("throws if required_variables isn't a string array", async () => {
    const { db, query } = createTestDb();
    query.mockResolvedValue({
      command: "SELECT",
      rowCount: 1,
      rows: [
        {
          id: "1",
          code: "x",
          locale: "en",
          description: null,
          subject_template: "Hi",
          html_body_template: null,
          text_body_template: "Hi",
          required_variables: { not: "an array" },
          version: 1,
        },
      ],
    });
    const repository = new EmailTemplateRepository(db);

    await expect(repository.findActiveEmailTemplate("x", "en")).rejects.toThrow(
      "Email template required_variables must be a string array.",
    );
  });
});
