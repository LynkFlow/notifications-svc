import nodemailer from "nodemailer";
import type { SendMailOptions, Transporter } from "nodemailer";
import config from "../config/env.js";

// nodemailer types `sendMail`'s resolved value as `SentMessageInfo = any`
// (see @types/nodemailer's index.d.ts) -- deliberately narrowed here to the
// one field this service actually reads, so a caller destructuring
// `messageId` gets a real, checked type instead of `any` silently
// propagating into our own code (caught by type-aware ESLint's
// no-unsafe-assignment/no-unsafe-member-access rules).
export interface SendMailResult {
  messageId?: unknown;
}

export interface MailTransport {
  sendMail(options: SendMailOptions): Promise<SendMailResult>;
}

const smtpTransport: Transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  requireTLS: config.smtp.requireTls,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.password,
  },
  connectionTimeout: config.smtp.connectionTimeoutMs,
  greetingTimeout: config.smtp.connectionTimeoutMs,
  socketTimeout: config.smtp.sendTimeoutMs,
  disableFileAccess: true,
  disableUrlAccess: true,
});

export default smtpTransport;
