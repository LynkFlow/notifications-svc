import AppError from "./AppError.js";

export class EmailTemplateNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "EMAIL_TEMPLATE_NOT_FOUND";

  constructor() {
    super("The requested email template was not found.");
  }
}

/**
 * A rendered template failed a structural check (leftover placeholder
 * syntax, an invalid subject line, ...). Takes the specific reason as a
 * message, since the two current call sites fail for genuinely different
 * reasons under the same code/status -- see templateRenderer.ts.
 */
export class TemplateRenderFailedError extends AppError {
  readonly statusCode = 422;
  readonly code = "TEMPLATE_RENDER_FAILED";
}

export class TemplateVariableMissingError extends AppError {
  readonly statusCode = 422;
  readonly code = "TEMPLATE_VARIABLE_MISSING";

  constructor(variableName: string) {
    super(`Required template variable is missing: ${variableName}.`);
  }
}
