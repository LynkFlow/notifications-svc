import AppError from "./AppError.js";

/** The provider rejected the send for a non-retryable reason. */
export class EmailProviderRejectedError extends AppError {
  readonly statusCode = 502;
  readonly code = "EMAIL_PROVIDER_ERROR";

  constructor() {
    super("The email provider did not accept the message.");
  }
}

/** The provider rejected the send for a retryable/transient reason. */
export class EmailProviderUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = "EMAIL_PROVIDER_UNAVAILABLE";

  constructor() {
    super("The email provider did not accept the message.");
  }
}

export class EmailSendInProgressError extends AppError {
  readonly statusCode = 409;
  readonly code = "EMAIL_SEND_ALREADY_IN_PROGRESS";

  constructor() {
    super(
      "An email send with this idempotency key is already being processed or previously failed.",
    );
  }
}

export class IdempotencyKeyReusedError extends AppError {
  readonly statusCode = 409;
  readonly code = "IDEMPOTENCY_KEY_REUSED";

  constructor() {
    super("The idempotency key was already used for a different request.");
  }
}
