import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import pool from "./db/pool.js";
import type { Database } from "./db/schema.js";
import { HealthRepository } from "./repositories/HealthRepository.js";
import { HealthService } from "./services/HealthService.js";
import { HealthController } from "./controllers/HealthController.js";
import { EmailSendAttemptRepository } from "./repositories/EmailSendAttemptRepository.js";
import { EmailTemplateRepository } from "./repositories/EmailTemplateRepository.js";
import smtpTransport from "./services/smtpTransport.js";
import { EmailService } from "./services/EmailService.js";
import { EmailController } from "./controllers/EmailController.js";

const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
  plugins: [new CamelCasePlugin()],
});

/**
 * The one place the real dependency graph gets wired with `new`. Every
 * class elsewhere receives its dependencies as constructor arguments and
 * never constructs its own collaborators -- see backend-conventions.md.
 * Tests never touch this file; they construct the one or two classes
 * under test directly with hand-written mocks/stubs instead.
 */
export interface Container {
  healthController: HealthController;
  emailController: EmailController;
}

export function buildContainer(): Container {
  const healthRepository = new HealthRepository(db);
  const healthService = new HealthService(healthRepository);
  const healthController = new HealthController(healthService);

  const emailSendAttemptRepository = new EmailSendAttemptRepository(db);
  const emailTemplateRepository = new EmailTemplateRepository(db);
  const emailService = new EmailService(
    emailSendAttemptRepository,
    emailTemplateRepository,
    smtpTransport,
  );
  const emailController = new EmailController(emailService);

  return { healthController, emailController };
}
