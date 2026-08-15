import { createHash } from "node:crypto";
import config from "../config/env.js";
import { EmailTemplateNotFoundError } from "../errors/EmailTemplateErrors.js";
import {
  EmailProviderRejectedError,
  EmailProviderUnavailableError,
  EmailSendInProgressError,
  IdempotencyKeyReusedError,
} from "../errors/EmailSendErrors.js";
import type { EmailAddress, SendEmailInput } from "../models/email.js";
import type {
  EmailSendAttemptRepository,
} from "../repositories/EmailSendAttemptRepository.js";
import type { EmailTemplateRepository } from "../repositories/EmailTemplateRepository.js";
import type { MailTransport } from "./smtpTransport.js";
import { renderEmailTemplate } from "./templateRenderer.js";

export interface SendEmailResult {
  attemptId: string;
  status: "sent";
  providerMessageId: string;
  idempotentReplay: boolean;
}

// nodemailer's own `Mail.Address` type only exists at the deep import
// "nodemailer/lib/mailer", which nodemailer's package.json exposes with no
// "exports" map. Node's real ESM resolver (which `moduleResolution:
// nodenext` faithfully emulates once this package is ESM, `"type":
// "module"`) has no implicit directory-index fallback for a bare subpath
// import into a package with no exports map -- unlike the CJS resolution
// this repo used before the ESM migration, which does. Rather than reaching
// into that unresolvable subpath, this local shape is structurally
// identical to `Mail.Address` (`{ name: string; address: string }`) and
// satisfies `SendMailOptions.to`/`cc`/`bcc`/`replyTo` the same way, since
// TypeScript's object types are structural, not by name.
interface MailAddress {
  address: string;
  name: string;
}

function formatAddress(address: EmailAddress): MailAddress {
  return address.name
    ? { address: address.email, name: address.name }
    : { address: address.email, name: "" };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }

  return value;
}

function requestHash(input: SendEmailInput): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(input)))
    .digest("hex");
}

function providerErrorCode(error: unknown): string {
  const smtpError = error as { code?: unknown; responseCode?: unknown };
  if (typeof smtpError.responseCode === "number") {
    return `SMTP_${smtpError.responseCode}`;
  }
  if (typeof smtpError.code === "string") {
    return smtpError.code.slice(0, 64).toUpperCase();
  }
  return "SMTP_SEND_FAILED";
}

export class EmailService {
  constructor(
    private readonly emailSendAttemptRepository: EmailSendAttemptRepository,
    private readonly emailTemplateRepository: EmailTemplateRepository,
    private readonly mailTransport: MailTransport,
  ) {}

  async sendTemplatedEmail(
    input: SendEmailInput,
    idempotencyKey?: string,
  ): Promise<SendEmailResult> {
    const template = await this.emailTemplateRepository.findActiveEmailTemplate(
      input.templateCode,
      input.locale,
    );
    if (!template) {
      throw new EmailTemplateNotFoundError();
    }

    const rendered = renderEmailTemplate(template, input.variables);
    const hash = requestHash(input);
    const recipientCount =
      input.to.length + (input.cc?.length ?? 0) + (input.bcc?.length ?? 0);
    const reservation = await this.emailSendAttemptRepository.reserveSendAttempt({
      templateId: template.id,
      templateVersion: template.version,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      requestHash: hash,
      recipientCount,
    });

    if (!reservation.created) {
      if (reservation.attempt.requestHash !== hash) {
        throw new IdempotencyKeyReusedError();
      }
      if (
        reservation.attempt.status === "SENT" &&
        reservation.attempt.providerMessageId
      ) {
        return {
          attemptId: reservation.attempt.id,
          status: "sent",
          providerMessageId: reservation.attempt.providerMessageId,
          idempotentReplay: true,
        };
      }

      throw new EmailSendInProgressError();
    }

    try {
      const mailOptions = {
        from: {
          address: config.smtp.fromEmail,
          name: config.smtp.fromName,
        },
        to: input.to.map(formatAddress),
        subject: rendered.subject,
        ...(input.cc ? { cc: input.cc.map(formatAddress) } : {}),
        ...(input.bcc ? { bcc: input.bcc.map(formatAddress) } : {}),
        ...(input.replyTo
          ? { replyTo: formatAddress(input.replyTo) }
          : config.smtp.replyTo
            ? { replyTo: config.smtp.replyTo }
            : {}),
        ...(rendered.html !== undefined ? { html: rendered.html } : {}),
        ...(rendered.text !== undefined ? { text: rendered.text } : {}),
      };
      const result = await this.mailTransport.sendMail(mailOptions);
      const messageId =
        typeof result.messageId === "string" ? result.messageId.trim() : "";
      if (!messageId) {
        throw new Error("The SMTP provider did not return a message ID.");
      }

      await this.emailSendAttemptRepository.markSendAttemptSent(
        reservation.attempt.id,
        messageId,
      );
      return {
        attemptId: reservation.attempt.id,
        status: "sent",
        providerMessageId: messageId,
        idempotentReplay: false,
      };
    } catch (error) {
      const errorCode = providerErrorCode(error);
      await this.emailSendAttemptRepository
        .markSendAttemptFailed(reservation.attempt.id, errorCode)
        .catch(() => undefined);

      const responseCode = (error as { responseCode?: unknown }).responseCode;
      const temporaryFailure =
        typeof responseCode !== "number" || (responseCode >= 400 && responseCode < 500);
      throw temporaryFailure
        ? new EmailProviderUnavailableError()
        : new EmailProviderRejectedError();
    }
  }
}
