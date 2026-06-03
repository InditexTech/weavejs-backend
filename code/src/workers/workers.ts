// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getLogger } from "@/logger/logger.js";
import { Worker } from "node:worker_threads";

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
    let worker: Worker | null = new Worker(
      new URL(workerPath, import.meta.url),
    );

    const result = await new Promise<T>((resolve, reject) => {
      if (worker) {
        worker.on("message", (message) => {
          console.log("on worker message", message);
          resolve(message);
          if (worker) {
            worker.terminate();
            worker.removeAllListeners();
            worker = null;
          }
        });
        worker.on("error", (error) => {
          console.log("on worker error", error);
          reject(error);
          if (worker) {
            worker.terminate();
            worker.removeAllListeners();
            worker = null;
          }
        });
        worker.on("exit", (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
        worker.postMessage(workerData);
      }
    });

    return result;
  });
}
