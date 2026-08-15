import cors from "cors";
import express from "express";
import helmet from "helmet";
import config from "./src/config/env.js";
import healthRoutes from "./src/routes/healthRoutes.js";
import emailRoutes from "./src/routes/emailRoutes.js";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";

const app = express();

if (config.trustProxy !== false) {
  app.set("trust proxy", config.trustProxy);
}

app.disable("x-powered-by");
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: `${config.serviceName} is running`,
  });
});

app.use("/health", healthRoutes);
app.use("/api/v1/emails", emailRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
