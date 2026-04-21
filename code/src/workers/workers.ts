// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getLogger } from "@/logger/logger.js";
import { Worker } from "worker_threads";

let logger = null as unknown as ReturnType<typeof getLogger>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let queue: any = null;

export const setupWorkers = async () => {
  logger = getLogger().child({ module: "workers" });

  const PQueue = await import("p-queue");
  const workers = 4;

  logger.info(`Setting up max workers: ${workers}`);
  queue = new PQueue.default({ concurrency: workers });
};

export function runWorker<P, T>(workerPath: string, workerData: P): Promise<T> {
  if (!queue) {
    throw new Error("Workers not initialized. Call setupWorkers() first.");
  }

  return queue.add(async () => {
    const worker = new Worker(workerPath);

    const result = await new Promise<T>((resolve, reject) => {
      worker.on("message", (message) => {
        resolve(message);
      });
      worker.on("error", (error) => {
        reject(error);
      });
      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
      worker.postMessage(workerData);
    });

    return result;
  });
}
