import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import logger from "../logging/logger.js";

/**
 * Mounted first, before every other middleware -- everything downstream
 * (including errorHandler) relies on req.log already existing. Doubles as
 * the access log via the res "finish" listener.
 */
export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = req.get("x-request-id") ?? randomUUID();
  req.log = logger.child({ requestId });
  res.set("x-request-id", requestId);

  const startedAt = Date.now();
  res.on("finish", () => {
    req.log.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      "request completed",
    );
  });

  next();
}
