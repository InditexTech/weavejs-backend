// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Room retention: hard-deletes rooms older than 7 days (unless protected) and
// the blobs that no longer belong to any room.
//
//   npm run retention:run            (dry run unless RETENTION_DRY_RUN=false)
//
// See README.md in this folder for the configuration.

import { createBlobStore } from "./blobStore.js";
import { parseRetentionConfig } from "./config.js";
import { createPool } from "./database.js";
import { AbortRun } from "./errors.js";
import { createLogger } from "./logger.js";
import { runRetention } from "./run.js";

const logger = createLogger();

// Azure SDK errors carry a code and an HTTP status that tell a missing role
// apart from a storage firewall, so they are worth logging.
const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const { code, statusCode } = error as {
    code?: unknown;
    statusCode?: unknown;
  };
  const details = [
    code !== undefined ? `code=${String(code)}` : "",
    statusCode !== undefined ? `status=${String(statusCode)}` : "",
  ].filter(Boolean);
  return details.length > 0
    ? `${error.message.split("\n")[0]} (${details.join(", ")})`
    : error.message;
};

const main = async (): Promise<number> => {
  const config = parseRetentionConfig(process.env);
  const pool = createPool(process.env);

  try {
    const summary = await runRetention({
      config,
      pool,
      store: createBlobStore(config.storage),
      now: new Date(),
      log: logger.info,
    });
    return summary.failed ? 1 : 0;
  } finally {
    await pool.end();
  }
};

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    const message = describeError(error);
    logger.error(
      error instanceof AbortRun ? `aborted: ${message}` : `failed: ${message}`,
    );
    process.exit(1);
  });
