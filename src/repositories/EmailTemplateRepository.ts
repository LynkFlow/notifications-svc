import type { Kysely } from "kysely";
import type { Database } from "../db/schema.js";
import type { EmailTemplate } from "../models/email.js";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("Email template required_variables must be a string array.");
  }

  return value;
}

export class EmailTemplateRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async findActiveEmailTemplate(code: string, locale: string): Promise<EmailTemplate | null> {
    const row = await this.db
      .selectFrom("emailTemplates")
      .select([
        "id",
        "code",
        "locale",
        "description",
        "subjectTemplate",
        "htmlBodyTemplate",
        "textBodyTemplate",
        "requiredVariables",
        "version",
      ])
      .where("code", "=", code)
      .where("locale", "=", locale)
      .where("isActive", "=", true)
      .executeTakeFirst();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      code: row.code,
      locale: row.locale,
      description: row.description,
      subjectTemplate: row.subjectTemplate,
      htmlBodyTemplate: row.htmlBodyTemplate,
      textBodyTemplate: row.textBodyTemplate,
      requiredVariables: toStringArray(row.requiredVariables),
      version: row.version,
    };
  }
}
