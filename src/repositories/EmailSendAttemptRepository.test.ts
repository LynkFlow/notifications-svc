import { createTestDb } from "../test/testDb.js";
import { EmailSendAttemptRepository } from "./EmailSendAttemptRepository.js";

describe("EmailSendAttemptRepository", () => {
  describe("reserveSendAttempt", () => {
    it("returns the newly-inserted row when there's no conflict", async () => {
      const { db, query } = createTestDb();
      query.mockResolvedValue({
        command: "INSERT",
        rowCount: 1,
        rows: [{ id: "1", request_hash: "hash", status: "PENDING", provider_message_id: null }],
      });
      const repository = new EmailSendAttemptRepository(db);

      await expect(
        repository.reserveSendAttempt({
          templateId: "10",
          templateVersion: 1,
          idempotencyKey: "key-1",
          requestHash: "hash",
          recipientCount: 2,
        }),
      ).resolves.toEqual({
        attempt: { id: "1", requestHash: "hash", status: "PENDING", providerMessageId: null },
        created: true,
      });
    });

    it("falls back to the existing row on an idempotency-key conflict", async () => {
      const { db, query } = createTestDb();
      query
        .mockResolvedValueOnce({ command: "INSERT", rowCount: 0, rows: [] })
        .mockResolvedValueOnce({
          command: "SELECT",
          rowCount: 1,
          rows: [{ id: "2", request_hash: "hash", status: "SENT", provider_message_id: "msg-1" }],
        });
      const repository = new EmailSendAttemptRepository(db);

      await expect(
        repository.reserveSendAttempt({
          templateId: "10",
          templateVersion: 1,
          idempotencyKey: "key-1",
          requestHash: "hash",
          recipientCount: 2,
        }),
      ).resolves.toEqual({
        attempt: { id: "2", requestHash: "hash", status: "SENT", providerMessageId: "msg-1" },
        created: false,
      });
    });

    it("throws if no idempotency key was given and the insert still didn't return a row", async () => {
      const { db, query } = createTestDb();
      query.mockResolvedValue({ command: "INSERT", rowCount: 0, rows: [] });
      const repository = new EmailSendAttemptRepository(db);

      await expect(
        repository.reserveSendAttempt({
          templateId: "10",
          templateVersion: 1,
          requestHash: "hash",
          recipientCount: 2,
        }),
      ).rejects.toThrow("Failed to reserve an email send attempt.");
    });

    it("throws if the conflicting row can't be loaded back", async () => {
      const { db, query } = createTestDb();
      query
        .mockResolvedValueOnce({ command: "INSERT", rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ command: "SELECT", rowCount: 0, rows: [] });
      const repository = new EmailSendAttemptRepository(db);

      await expect(
        repository.reserveSendAttempt({
          templateId: "10",
          templateVersion: 1,
          idempotencyKey: "key-1",
          requestHash: "hash",
          recipientCount: 2,
        }),
      ).rejects.toThrow("Idempotent email send attempt could not be loaded.");
    });
  });

  describe("markSendAttemptSent / markSendAttemptFailed", () => {
    it("issues an update for markSendAttemptSent", async () => {
      const { db, query } = createTestDb();
      query.mockResolvedValue({ command: "UPDATE", rowCount: 1, rows: [] });
      const repository = new EmailSendAttemptRepository(db);

      await repository.markSendAttemptSent("1", "msg-1");

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, parameters] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('update "email_send_attempts"');
      expect(parameters).toEqual(expect.arrayContaining(["SENT", "msg-1", "1", "PENDING"]));
    });

    it("issues an update for markSendAttemptFailed", async () => {
      const { db, query } = createTestDb();
      query.mockResolvedValue({ command: "UPDATE", rowCount: 1, rows: [] });
      const repository = new EmailSendAttemptRepository(db);

      await repository.markSendAttemptFailed("1", "SMTP_ERROR");

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, parameters] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('update "email_send_attempts"');
      expect(parameters).toEqual(expect.arrayContaining(["FAILED", "SMTP_ERROR", "1", "PENDING"]));
    });
  });
});
