import nodemailer from "nodemailer";
import type { SendMailOptions, SentMessageInfo, Transporter } from "nodemailer";
import config from "../config/env";

export interface MailTransport {
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
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
