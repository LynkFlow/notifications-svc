import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

function parseTrustProxy(value: string | undefined): boolean | number | string {
  if (value === undefined || value === "false") {
    return false;
  }

  if (value === "true") {
    return 1;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0 ? numericValue : value;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVICE_NAME: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .default("lf-service"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        const url = new URL(value);
        return ["postgres:", "postgresql:"].includes(url.protocol);
      } catch {
        return false;
      }
    }, "DATABASE_URL must be a valid PostgreSQL URL"),
  CORS_ORIGINS: z.string().min(1).default("http://localhost:3001"),
  TRUST_PROXY: z.string().optional(),
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_REQUIRE_TLS: z.enum(["true", "false"]).default("true"),
  SMTP_USER: z.string().trim().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM_EMAIL: z.string().trim().email(),
  SMTP_FROM_NAME: z.string().trim().min(1).max(128).default("LynkFlow"),
  SMTP_REPLY_TO: z.union([z.string().trim().email(), z.literal("")]).optional(),
  SMTP_CONNECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(5_000),
  SMTP_SEND_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(10_000),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment configuration: ${names}`);
}

const config = Object.freeze({
  nodeEnv: parsed.data.NODE_ENV,
  serviceName: parsed.data.SERVICE_NAME,
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  trustProxy: parseTrustProxy(parsed.data.TRUST_PROXY),
  smtp: Object.freeze({
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    secure: parsed.data.SMTP_SECURE === "true",
    requireTls: parsed.data.SMTP_REQUIRE_TLS === "true",
    user: parsed.data.SMTP_USER,
    password: parsed.data.SMTP_PASSWORD,
    fromEmail: parsed.data.SMTP_FROM_EMAIL,
    fromName: parsed.data.SMTP_FROM_NAME,
    replyTo: parsed.data.SMTP_REPLY_TO || undefined,
    connectionTimeoutMs: parsed.data.SMTP_CONNECTION_TIMEOUT_MS,
    sendTimeoutMs: parsed.data.SMTP_SEND_TIMEOUT_MS,
  }),
});

export default config;
