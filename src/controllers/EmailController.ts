import type { Request, Response } from "express";
import AppError from "../errors/AppError.js";
import { sendTemplatedEmail } from "../services/emailService.js";
import type { ValidatedSendEmailBody } from "../validators/sendEmailValidator.js";

const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export async function sendEmail(req: Request, res: Response): Promise<Response> {
  const idempotencyHeader = req.header("Idempotency-Key");
  if (
    idempotencyHeader !== undefined &&
    !idempotencyKeyPattern.test(idempotencyHeader)
  ) {
    throw new AppError(
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency-Key must contain 1 to 128 URL-safe characters.",
    );
  }

  const input = req.validatedBody as ValidatedSendEmailBody;
  const result = await sendTemplatedEmail(input, idempotencyHeader ?? undefined);

  return res.status(result.idempotentReplay ? 200 : 202).json({
    success: true,
    data: result,
  });
}
