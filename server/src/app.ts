import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import path from "path";
import fs from "fs";

import { env } from "./config/env";
import apiRoutes from "./routes";
import { errorHandler } from "./middlewares/error.middleware";

export const createApp = (): Application => {
  const app: Application = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow Swagger UI inline scripts & styles
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
    })
  );

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      credentials: true
    })
  );

  // HTTP Request Logging
  if (env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // Body Parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Swagger Documentation endpoint
  let swaggerDocumentPath = path.resolve(__dirname, "./docs/swagger.json");
  if (!fs.existsSync(swaggerDocumentPath)) {
    swaggerDocumentPath = path.resolve(__dirname, "../src/docs/swagger.json");
  }
  if (fs.existsSync(swaggerDocumentPath)) {
    const swaggerDoc = JSON.parse(fs.readFileSync(swaggerDocumentPath, "utf-8"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  }

  // Health Check
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      service: "Skybox Drive API",
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Routes
  app.use("/api", apiRoutes);

  // Serve Frontend client build in production if available
  let clientDistPath = path.resolve(__dirname, "../../client/dist");
  if (!fs.existsSync(clientDistPath)) {
    clientDistPath = path.resolve(process.cwd(), "client/dist");
  }
  if (!fs.existsSync(clientDistPath)) {
    clientDistPath = path.resolve(process.cwd(), "../client/dist");
  }
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get("*", (req: Request, res: Response, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/health") || req.path.startsWith("/api-docs")) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
