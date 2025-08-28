// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import pgBoss from "pg-boss";
import { getLogger } from "../logger/logger.js";
import { JobHandler } from "./types.js";
import PgBoss from "pg-boss";
import { getServiceConfig } from "../config/config.js";
import { getDatabaseCloudCredentialsToken } from "../utils.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
let boss: pgBoss | null = null;

const jobs: Partial<Record<JobHandler, unknown>> = {};

export const setupWorkloads = async () => {
  logger = getLogger().child({ module: "workloads" });

  logger.info("Setting up workloads module");

  const config = getServiceConfig();

  if (config.database.kind === "connection_string") {
    const {
      database: {
        connection: { connectionString },
      },
    } = config;

    boss = new pgBoss({
      connectionString,
      migrate: true,
      monitorStateIntervalSeconds: 3,
    });
  }

  if (config.database.kind === "properties") {
    const {
      database: {
        connection: { host, port, db, username, password, ssl },
      },
    } = config;

    let finalPassword = password;

    if (config.database.connection.cloudCredentials) {
      finalPassword = await getDatabaseCloudCredentialsToken();
    }

    boss = new pgBoss({
      host,
      port,
      database: db,
      user: username,
      password: finalPassword,
      ...(ssl && {
        ssl: {
          rejectUnauthorized: true,
        },
      }),
      migrate: true,
      monitorStateIntervalSeconds: 3,
    });
  }

  if (!boss) {
    throw new Error("Database settings not defined on workloads module");
  }

  await boss.start();
  await boss.clearStorage();

  await initRemoveImageBackgroundQueue(boss);
  await initGenerateImagesQueue(boss);
  await initEditImageQueue(boss);
  await initDeleteImageQueue(boss);

  logger.info("Workloads module ready");

  return boss;
};

const initRemoveImageBackgroundQueue = async (boss: PgBoss) => {
  const { RemoveImageBackgroundJob } = await import(
    "./jobs/remove-image-background/job.js"
  );

  const removeBackgroundJob = await RemoveImageBackgroundJob.create(boss);
  await removeBackgroundJob.start();

  jobs["removeImageBackground"] = removeBackgroundJob;
};

const initGenerateImagesQueue = async (boss: PgBoss) => {
  const { GenerateImagesJob } = await import("./jobs/generate-images/job.js");

  const generateImagesJob = await GenerateImagesJob.create(boss);
  await generateImagesJob.start();

  jobs["generateImages"] = generateImagesJob;
};

const initEditImageQueue = async (boss: PgBoss) => {
  const { EditImageJob } = await import("./jobs/edit-image/job.js");

  const editImageJob = await EditImageJob.create(boss);
  await editImageJob.start();

  jobs["editImage"] = editImageJob;
};

const initDeleteImageQueue = async (boss: PgBoss) => {
  const { DeleteImageJob } = await import("./jobs/delete-image/job.js");

  const deleteImageJob = await DeleteImageJob.create(boss);
  await deleteImageJob.start();

  jobs["deleteImage"] = deleteImageJob;
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
