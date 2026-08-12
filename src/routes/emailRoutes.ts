import express from "express";
import { sendEmail } from "../controllers/emailController";
import validate from "../middleware/validate";
import { sendEmailSchema } from "../validators/sendEmailValidator";

const router = express.Router();

router.post("/send", validate(sendEmailSchema), sendEmail);

export default router;
