import { pino, Logger } from "pino";

let logger: Logger | null = null;

export function getLogger() {
  if (!logger) {
    throw new Error("Logger not initialized");
  }

  return logger;
}

export function setupLogger() {
  logger = pino({
    level: "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: true,
      },
    },
  });
}
