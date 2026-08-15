import type { QueryResultRow } from "pg";
import pool from "../db/pool.js";
import type { EmailTemplate } from "../models/email.js";

interface EmailTemplateRow extends QueryResultRow {
  id: string;
  code: string;
  locale: string;
  description: string | null;
  subject_template: string;
  html_body_template: string | null;
  text_body_template: string | null;
  required_variables: unknown;
  version: number;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("Email template required_variables must be a string array.");
  }

  return value;
}

function mapTemplate(row: EmailTemplateRow): EmailTemplate {
  return {
    id: row.id,
    code: row.code,
    locale: row.locale,
    description: row.description,
    subjectTemplate: row.subject_template,
    htmlBodyTemplate: row.html_body_template,
    textBodyTemplate: row.text_body_template,
    requiredVariables: toStringArray(row.required_variables),
    version: row.version,
  };
}

export async function findActiveEmailTemplate(
  code: string,
  locale: string,
): Promise<EmailTemplate | null> {
  const result = await pool.query<EmailTemplateRow>(
    `SELECT
            id,
            code,
            locale,
            description,
            subject_template,
            html_body_template,
            text_body_template,
            required_variables,
            version
         FROM email_templates
         WHERE code = $1 AND locale = $2 AND is_active = TRUE`,
    [code, locale],
  );

  const row = result.rows[0];
  return row ? mapTemplate(row) : null;
}
