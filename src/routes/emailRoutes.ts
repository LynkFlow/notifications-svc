import express from "express";
import { sendEmail } from "../controllers/emailController.js";
import validate from "../middleware/validate.js";
import { sendEmailSchema } from "../validators/sendEmailValidator.js";

const router = express.Router();

router.post("/send", validate(sendEmailSchema), sendEmail);

export default router;
