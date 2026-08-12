export interface EmailAddress {
    email: string;
    name?: string | undefined;
}

export type TemplateVariables = Record<string, string | number | boolean>;

export interface EmailTemplate {
    id: string;
    code: string;
    locale: string;
    description: string | null;
    subjectTemplate: string;
    htmlBodyTemplate: string | null;
    textBodyTemplate: string | null;
    requiredVariables: string[];
    version: number;
}

export interface SendEmailInput {
    templateCode: string;
    locale: string;
    to: EmailAddress[];
    cc?: EmailAddress[] | undefined;
    bcc?: EmailAddress[] | undefined;
    replyTo?: EmailAddress | undefined;
    variables: TemplateVariables;
}

export interface RenderedEmail {
    subject: string;
    html?: string;
    text?: string;
}

export type SendAttemptStatus = "PENDING" | "SENT" | "FAILED";

export interface SendAttempt {
    id: string;
    requestHash: string;
    status: SendAttemptStatus;
    providerMessageId: string | null;
}
