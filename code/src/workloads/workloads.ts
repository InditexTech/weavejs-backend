// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import pgBoss from "pg-boss";
import { getLogger } from "../logger/logger.js";
import { JobHandler } from "./types.js";
import { getServiceConfig } from "../config/config.js";
import { getDatabaseCloudCredentialsToken } from "../utils.js";
import { AccessToken } from "@azure/identity";
import PgBoss from "pg-boss";

let logger = null as unknown as ReturnType<typeof getLogger>;
let activeBoss: pgBoss | null = null;
let standbyBoss: pgBoss | null = null;

const RENEW_TOKEN_CHECK_INTERVAL = 60 * 1000; // 1 minute
const RENEW_TOKEN_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const CLOSE_STANDBY_BOSS_DELAY = 5 * 60 * 1000; // 5 minutes

const jobs: Partial<Record<JobHandler, unknown>> = {};

export const setupWorkloads = async () => {
  logger = getLogger().child({ module: "workloads" });

  logger.info("Setting up");

  const config = getServiceConfig();

  let currentAccessToken: AccessToken | undefined = undefined;

  async function initPgBoss(
    initialize: boolean = true,
  ): Promise<pgBoss | null> {
    if (config.database.kind === "connection_string") {
      const {
        database: {
          connection: { connectionString },
        },
      } = config;

      const boss = new pgBoss({
        connectionString,
        migrate: true,
        monitorStateIntervalSeconds: 3,
      });

      await boss.start();

      if (initialize) {
        await boss.clearStorage();

        await initRemoveImageBackgroundQueue(boss);
        await initNegateImageQueue(boss);
        await initFlipImageQueue(boss);
        await initGrayscaleImageQueue(boss);
        await initGenerateImagesQueue(boss);
        await initEditImageQueue(boss);
        await initDeleteImageQueue(boss);
        await initDeleteVideoQueue(boss);
        await initDeleteTemplateQueue(boss);
        await initExportImageQueue(boss);
        await initExportPdfQueue(boss);

        logger.info("Module ready");
      } else {
        logger.info("Module re-initialized");
      }

      return boss;
    }

    if (config.database.kind === "properties") {
      const {
        database: {
          connection: { host, port, db, username, password, ssl },
        },
      } = config;

      let finalPassword = password;

      if (config.database.connection.cloudCredentials) {
        currentAccessToken = await getDatabaseCloudCredentialsToken();
        finalPassword = currentAccessToken.token;
      }

      const boss = new pgBoss({
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

      if (initialize) {
        await boss.start();
        await boss.clearStorage();

        await initRemoveImageBackgroundQueue(boss);
        await initNegateImageQueue(boss);
        await initFlipImageQueue(boss);
        await initGrayscaleImageQueue(boss);
        await initGenerateImagesQueue(boss);
        await initEditImageQueue(boss);
        await initDeleteImageQueue(boss);
        await initDeleteVideoQueue(boss);
        await initDeleteTemplateQueue(boss);
        await initExportImageQueue(boss);
        await initExportPdfQueue(boss);

        logger.info("Module ready");
      } else {
        logger.info("Module re-initialized");
      }

      return boss;
    }

    return null;
  }

  function tokenRenewalInterval() {
    setInterval(async () => {
      if (!activeBoss) {
        logger.info("Not active...");
        return;
      }

      if (
        currentAccessToken?.expiresOnTimestamp &&
        Date.now() >
          currentAccessToken?.expiresOnTimestamp - RENEW_TOKEN_THRESHOLD
      ) {
        logger.info("Renewing access token");

        standbyBoss = await initPgBoss(false);

        if (!standbyBoss) {
          throw new Error("Database settings not defined on workloads module");
        }

        const old = activeBoss;
        activeBoss = standbyBoss;
        standbyBoss = null;

        setTimeout(() => {
          old.stop().catch(console.error);
        }, CLOSE_STANDBY_BOSS_DELAY);
      }
    }, RENEW_TOKEN_CHECK_INTERVAL);

    logger.info("Token renewal interval started");
  }

  activeBoss = await initPgBoss();

  if (!activeBoss) {
    throw new Error("Database settings not defined on workloads module");
  }

  tokenRenewalInterval();

  return activeBoss;
};

const initRemoveImageBackgroundQueue = async (boss: PgBoss) => {
  const { RemoveImageBackgroundJob } =
    await import("./jobs/remove-image-background/job.js");

  const removeBackgroundJob = await RemoveImageBackgroundJob.create(boss);
  await removeBackgroundJob.start();

  jobs["removeImageBackground"] = removeBackgroundJob;
};

const initNegateImageQueue = async (boss: PgBoss) => {
  const { NegateImageJob } = await import("./jobs/negate-image/job.js");

  const negateImageJob = await NegateImageJob.create(boss);
  await negateImageJob.start();

  jobs["negateImage"] = negateImageJob;
};

const initFlipImageQueue = async (boss: PgBoss) => {
  const { FlipImageJob } = await import("./jobs/flip-image/job.js");

  const flipImageJob = await FlipImageJob.create(boss);
  await flipImageJob.start();

  jobs["flipImage"] = flipImageJob;
};

const initGrayscaleImageQueue = async (boss: PgBoss) => {
  const { GrayscaleImageJob } = await import("./jobs/grayscale-image/job.js");

  const grayscaleImageJob = await GrayscaleImageJob.create(boss);
  await grayscaleImageJob.start();

  jobs["grayscaleImage"] = grayscaleImageJob;
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

const initDeleteVideoQueue = async (boss: PgBoss) => {
  const { DeleteVideoJob } = await import("./jobs/delete-video/job.js");

  const deleteVideoJob = await DeleteVideoJob.create(boss);
  await deleteVideoJob.start();

  jobs["deleteVideo"] = deleteVideoJob;
};

const initDeleteTemplateQueue = async (boss: PgBoss) => {
  const { DeleteTemplateJob } = await import("./jobs/delete-template/job.js");

  const deleteTemplateJob = await DeleteTemplateJob.create(boss);
  await deleteTemplateJob.start();
  jobs["deleteTemplate"] = deleteTemplateJob;
};

const initExportImageQueue = async (boss: PgBoss) => {
  const { ExportImageJob } = await import("./jobs/export-image/job.js");

  const exportTemplateJob = await ExportImageJob.create(boss);
  await exportTemplateJob.start();
  jobs["exportImage"] = exportTemplateJob;
};

const initExportPdfQueue = async (boss: PgBoss) => {
  const { ExportPdfJob } = await import("./jobs/export-pdf/job.js");

  const exportPdfJob = await ExportPdfJob.create(boss);
  await exportPdfJob.start();
  jobs["exportPdf"] = exportPdfJob;
};

export const getWorkloadsInstance = () => {
  if (!activeBoss && !standbyBoss) {
    throw new Error("Workloads module not initialized");
  }

  return standbyBoss ?? activeBoss;
};

export function getJobHandler<P>(jobName: JobHandler): P {
  if (!jobs[jobName]) {
    throw new Error(`Job not found: ${jobName}`);
  }

  return jobs[jobName] as P;
}
