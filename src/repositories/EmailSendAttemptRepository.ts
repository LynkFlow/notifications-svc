import type { QueryResultRow } from "pg";
import pool from "../db/pool.js";
import type { SendAttempt } from "../models/email.js";

interface SendAttemptRow extends QueryResultRow {
  id: string;
  request_hash: string;
  status: "PENDING" | "SENT" | "FAILED";
  provider_message_id: string | null;
}

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

function mapAttempt(row: SendAttemptRow): SendAttempt {
  return {
    id: row.id,
    requestHash: row.request_hash,
    status: row.status,
    providerMessageId: row.provider_message_id,
  };
}

export async function reserveSendAttempt(
  input: ReserveSendAttemptInput,
): Promise<ReservedSendAttempt> {
  const result = await pool.query<SendAttemptRow>(
    `INSERT INTO email_send_attempts (
            template_id,
            template_version,
            idempotency_key,
            request_hash,
            recipient_count
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (idempotency_key)
             WHERE idempotency_key IS NOT NULL
         DO NOTHING
         RETURNING id, request_hash, status, provider_message_id`,
    [
      input.templateId,
      input.templateVersion,
      input.idempotencyKey ?? null,
      input.requestHash,
      input.recipientCount,
    ],
  );

  const inserted = result.rows[0];
  if (inserted) {
    return { attempt: mapAttempt(inserted), created: true };
  }

  if (!input.idempotencyKey) {
    throw new Error("Failed to reserve an email send attempt.");
  }

  const existing = await pool.query<SendAttemptRow>(
    `SELECT id, request_hash, status, provider_message_id
         FROM email_send_attempts
         WHERE idempotency_key = $1`,
    [input.idempotencyKey],
  );
  const row = existing.rows[0];
  if (!row) {
    throw new Error("Idempotent email send attempt could not be loaded.");
  }

  return { attempt: mapAttempt(row), created: false };
}

export async function markSendAttemptSent(
  id: string,
  providerMessageId: string,
): Promise<void> {
  await pool.query(
    `UPDATE email_send_attempts
         SET status = 'SENT',
             provider_message_id = $2,
             error_code = NULL,
             sent_at = NOW(),
             updated_at = NOW()
         WHERE id = $1 AND status = 'PENDING'`,
    [id, providerMessageId],
  );
}

export async function markSendAttemptFailed(
  id: string,
  errorCode: string,
): Promise<void> {
  await pool.query(
    `UPDATE email_send_attempts
         SET status = 'FAILED', error_code = $2, updated_at = NOW()
         WHERE id = $1 AND status = 'PENDING'`,
    [id, errorCode],
  );
}
