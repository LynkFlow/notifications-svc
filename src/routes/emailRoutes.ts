import express, { type Router } from "express";
import type { EmailController } from "../controllers/EmailController.js";
import validate from "../middleware/validate.js";
import { sendEmailSchema } from "../validators/sendEmailValidator.js";

export function createEmailRoutes(emailController: EmailController): Router {
  const router = express.Router();
  router.post("/send", validate(sendEmailSchema), emailController.sendEmail);
  return router;
}
