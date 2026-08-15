import type { Logger } from "pino";

declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown;
      /** Set by requestContext -- a pino child logger scoped to this request's ID. */
      log: Logger;
    }
  }
}

export {};
