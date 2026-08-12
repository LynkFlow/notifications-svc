import { createHash } from "node:crypto";
import type { Address } from "nodemailer/lib/mailer";
import config from "../config/env";
import AppError from "../errors/AppError";
import type { EmailAddress, SendEmailInput } from "../models/email";
import {
    markSendAttemptFailed,
    markSendAttemptSent,
    reserveSendAttempt,
} from "../repositories/emailSendAttemptRepository";
import { findActiveEmailTemplate } from "../repositories/emailTemplateRepository";
import smtpTransport, { type MailTransport } from "./smtpTransport";
import { renderEmailTemplate } from "./templateRenderer";

export interface SendEmailResult {
    attemptId: string;
    status: "sent";
    providerMessageId: string;
    idempotentReplay: boolean;
}

function formatAddress(address: EmailAddress): Address {
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

export async function sendTemplatedEmail(
    input: SendEmailInput,
    idempotencyKey?: string,
    transport: MailTransport = smtpTransport,
): Promise<SendEmailResult> {
    const template = await findActiveEmailTemplate(
        input.templateCode,
        input.locale,
    );
    if (!template) {
        throw new AppError(
            404,
            "EMAIL_TEMPLATE_NOT_FOUND",
            "The requested email template was not found.",
        );
    }

    const rendered = renderEmailTemplate(template, input.variables);
    const hash = requestHash(input);
    const recipientCount =
        input.to.length + (input.cc?.length ?? 0) + (input.bcc?.length ?? 0);
    const reservation = await reserveSendAttempt({
        templateId: template.id,
        templateVersion: template.version,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        requestHash: hash,
        recipientCount,
    });

    if (!reservation.created) {
        if (reservation.attempt.requestHash !== hash) {
            throw new AppError(
                409,
                "IDEMPOTENCY_KEY_REUSED",
                "The idempotency key was already used for a different request.",
            );
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

        throw new AppError(
            409,
            "EMAIL_SEND_ALREADY_IN_PROGRESS",
            "An email send with this idempotency key is already being processed or previously failed.",
        );
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
        const result = await transport.sendMail(mailOptions);
        const messageId = String(result.messageId || "").trim();
        if (!messageId) {
            throw new Error("The SMTP provider did not return a message ID.");
        }

        await markSendAttemptSent(reservation.attempt.id, messageId);
        return {
            attemptId: reservation.attempt.id,
            status: "sent",
            providerMessageId: messageId,
            idempotentReplay: false,
        };
    } catch (error) {
        const errorCode = providerErrorCode(error);
        await markSendAttemptFailed(reservation.attempt.id, errorCode).catch(
            () => undefined,
        );

        const responseCode = (error as { responseCode?: unknown }).responseCode;
        const temporaryFailure =
            typeof responseCode !== "number" ||
            (responseCode >= 400 && responseCode < 500);
        throw new AppError(
            temporaryFailure ? 503 : 502,
            temporaryFailure
                ? "EMAIL_PROVIDER_UNAVAILABLE"
                : "EMAIL_PROVIDER_ERROR",
            "The email provider did not accept the message.",
        );
    }
}
