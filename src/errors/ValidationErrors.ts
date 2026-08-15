import AppError from "./AppError.js";

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";

  constructor(fieldErrors: Record<string, string>) {
    super("The request is invalid.", undefined, fieldErrors);
  }
}

export class InvalidIdempotencyKeyError extends AppError {
  readonly statusCode = 400;
  readonly code = "INVALID_IDEMPOTENCY_KEY";

  constructor() {
    super("Idempotency-Key must contain 1 to 128 URL-safe characters.");
  }
}
