// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

type FaultLogger = {
  error: (obj: Record<string, unknown>, msg: string) => void;
};

type ProcessHandlersOptions = {
  proc?: Pick<NodeJS.Process, "on">;
  exit?: (code: number) => void;
  exitDelayMs?: number;
};

// A stray rejected promise is isolated to one operation, so the process keeps
// serving. After an uncaught exception process state is unreliable: log, give
// the logger time to flush, then exit so a supervisor can restart the service.
export function registerProcessFaultHandlers(
  logger: FaultLogger,
  {
    proc = process,
    exit = (code) => process.exit(code),
    exitDelayMs = 200,
  }: ProcessHandlersOptions = {},
) {
  proc.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "unhandledRejection");
  });

  proc.on("uncaughtException", (err) => {
    logger.error({ err }, "uncaughtException");
    setTimeout(() => exit(1), exitDelayMs);
  });
}
