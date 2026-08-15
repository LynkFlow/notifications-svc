import type { Request, Response } from "express";
import { InvalidIdempotencyKeyError } from "../errors/ValidationErrors.js";
import type { EmailService } from "../services/EmailService.js";
import type { ValidatedSendEmailBody } from "../validators/sendEmailValidator.js";

const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // Arrow-function class field, not a prototype method -- Express calls
  // this as a bare reference (e.g. `router.post("/send",
  // emailController.sendEmail)`), which loses `this` unless the method is
  // already bound. See backend-conventions.md.
  sendEmail = async (req: Request, res: Response): Promise<Response> => {
    const idempotencyHeader = req.header("Idempotency-Key");
    if (
      idempotencyHeader !== undefined &&
      !idempotencyKeyPattern.test(idempotencyHeader)
    ) {
      throw new InvalidIdempotencyKeyError();
    }

    const input = req.validatedBody as ValidatedSendEmailBody;
    const result = await this.emailService.sendTemplatedEmail(
      input,
      idempotencyHeader ?? undefined,
    );

    return res.status(result.idempotentReplay ? 200 : 202).json({
      success: true,
      data: result,
    });
  };
}
