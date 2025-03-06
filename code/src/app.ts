import express, { type Express } from "express";
import { setupLoggerMiddleware } from "./middlewares/logger.js";
import { setupCorsMiddleware } from "./middlewares/cors.js";
import { setupHttpResponseHeadersMiddleware } from "./middlewares/http-response-headers.js";
import { setupBodyParserMiddleware } from "./middlewares/body-parser.js";
import { setupApiV1Router } from "./api/v1/router.js";

let app: Express | null = null;

export function getApp() {
  if (!app) {
    throw new Error("App not initialized");
  }

  return app;
}

export function setupApp() {
  // Setup the service
  app = express();

  // Setup Middlewares
  setupLoggerMiddleware(app);
  setupCorsMiddleware(app);
  setupHttpResponseHeadersMiddleware(app);
  setupBodyParserMiddleware(app);

  // Setup Routers
  setupApiV1Router(app);

  return app;
}
