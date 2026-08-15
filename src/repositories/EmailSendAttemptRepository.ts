import type { Kysely } from "kysely";
import type { Database } from "../db/schema.js";
import type { SendAttempt } from "../models/email.js";

export interface ReserveSendAttemptInput {
  templateId: string;
  templateVersion: number;
  idempotencyKey?: string;
  requestHash: string;
  recipientCount: number;
}

export interface ReservedSendAttempt {
  attempt: SendAttempt;
  created: boolean;
}

export class EmailSendAttemptRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async reserveSendAttempt(input: ReserveSendAttemptInput): Promise<ReservedSendAttempt> {
    // The idempotency-key uniqueness constraint is a partial index
    // (`WHERE idempotency_key IS NOT NULL`, migrations/001), so the
    // ON CONFLICT arbiter needs the same predicate to match it --
    // .where() before .doNothing() compiles to that arbiter predicate,
    // not a row-level filter. See backend-conventions.md's Kysely section.
    const inserted = await this.db
      .insertInto("emailSendAttempts")
      .values({
        templateId: input.templateId,
        templateVersion: input.templateVersion,
        idempotencyKey: input.idempotencyKey ?? null,
        requestHash: input.requestHash,
        recipientCount: input.recipientCount,
      })
      .onConflict((oc) =>
        oc.column("idempotencyKey").where("idempotencyKey", "is not", null).doNothing(),
      )
      .returning(["id", "requestHash", "status", "providerMessageId"])
      .executeTakeFirst();

    if (inserted) {
      return { attempt: inserted, created: true };
    }

    if (!input.idempotencyKey) {
      throw new Error("Failed to reserve an email send attempt.");
    }

    const existing = await this.db
      .selectFrom("emailSendAttempts")
      .select(["id", "requestHash", "status", "providerMessageId"])
      .where("idempotencyKey", "=", input.idempotencyKey)
      .executeTakeFirst();

    if (!existing) {
      throw new Error("Idempotent email send attempt could not be loaded.");
    }

    return { attempt: existing, created: false };
  }

  async markSendAttemptSent(id: string, providerMessageId: string): Promise<void> {
    // email_send_attempts has no updated_at trigger (unlike email_templates,
    // migrations/001) -- updatedAt must be set explicitly here, same as the
    // raw-SQL version this replaced.
    await this.db
      .updateTable("emailSendAttempts")
      .set({
        status: "SENT",
        providerMessageId,
        errorCode: null,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("status", "=", "PENDING")
      .execute();
  }

  async markSendAttemptFailed(id: string, errorCode: string): Promise<void> {
    await this.db
      .updateTable("emailSendAttempts")
      .set({ status: "FAILED", errorCode, updatedAt: new Date() })
      .where("id", "=", id)
      .where("status", "=", "PENDING")
      .execute();
  }
}
