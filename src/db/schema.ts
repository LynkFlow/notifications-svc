import type { Generated, Kysely, Transaction } from "kysely";
import type { SendAttemptStatus } from "../models/email.js";

// Camel-cased on purpose, even though the real Postgres columns are
// snake_case -- paired with CamelCasePlugin in container.ts, see
// backend-conventions.md's "SQL query layer: Kysely" section. Kept in sync
// by hand with migrations/*.sql.
export interface EmailTemplatesTable {
  id: Generated<string>;
  code: string;
  locale: Generated<string>;
  description: string | null;
  subjectTemplate: string;
  htmlBodyTemplate: string | null;
  textBodyTemplate: string | null;
  requiredVariables: Generated<unknown>;
  isActive: Generated<boolean>;
  version: Generated<number>;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface EmailSendAttemptsTable {
  id: Generated<string>;
  templateId: string;
  templateVersion: number;
  idempotencyKey: string | null;
  requestHash: string;
  recipientCount: number;
  status: Generated<SendAttemptStatus>;
  providerMessageId: string | null;
  errorCode: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  sentAt: Date | null;
}

export interface Database {
  emailTemplates: EmailTemplatesTable;
  emailSendAttempts: EmailSendAttemptsTable;
}

/** A repository method that may run inside an existing transaction accepts this instead of a bare `Kysely<Database>`. */
export type Db = Kysely<Database> | Transaction<Database>;
