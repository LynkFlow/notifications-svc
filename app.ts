import cors from "cors";
import express from "express";
import helmet from "helmet";
import config from "./src/config/env.js";
import { API_VERSION } from "./src/config/apiVersion.js";
import { requestContext } from "./src/middleware/requestContext.js";
import { createHealthRoutes } from "./src/routes/healthRoutes.js";
import { createEmailRoutes } from "./src/routes/emailRoutes.js";
import { buildContainer } from "./src/container.js";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";

const app = express();
const container = buildContainer();

if (config.trustProxy !== false) {
  app.set("trust proxy", config.trustProxy);
}

app.disable("x-powered-by");
// Mounted first -- every other middleware/handler relies on req.log
// already existing (backend-conventions.md's "Logging: pino").
app.use(requestContext);
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

app.use("/health", createHealthRoutes(container.healthController));
app.use(`/api/${API_VERSION}/emails`, createEmailRoutes(container.emailController));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
