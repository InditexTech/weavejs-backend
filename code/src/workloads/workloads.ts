// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import pgBoss from "pg-boss";
import { Sequelize } from "sequelize";
import { getLogger } from "../logger/logger.js";
import { JobHandler } from "./types.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
let boss: pgBoss | null = null;

const jobs: Partial<Record<JobHandler, unknown>> = {};

export const setupWorkloads = async (sequelize: Sequelize) => {
  logger = getLogger().child({ module: "workloads" });

  logger.info("Setting up workloads module");

  boss = new pgBoss({
    connectionString: process.env.DATABASE_URL,
  });

  await boss.start();

  const { RemoveImageBackgroundJob } = await import(
    "./jobs/remove-image-background/job.js"
  );

  const removeBackgroundJob = await RemoveImageBackgroundJob.create(
    sequelize,
    boss
  );
  await removeBackgroundJob.start();

  jobs["removeImageBackground"] = removeBackgroundJob;

  logger.info("Workloads module ready");

  return boss;
};

export const getWorkloadsInstance = () => {
  if (!boss) {
    throw new Error("Workloads module not initialized");
  }

  return boss;
};

export function getJobHandler<P>(jobName: JobHandler): P {
  if (!jobs[jobName]) {
    throw new Error(`Job not found: ${jobName}`);
  }

  return jobs[jobName] as P;
}
