// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";
import { parseRetentionRunRequest } from "@/actions/room-retention/request.js";
import { getLogger } from "@/logger/logger.js";
import { getJobHandler } from "@/workloads/workloads.js";
import { JOB_HANDLERS } from "@/workloads/constants.js";
import type {
  RoomRetentionJob,
  StartRunResult,
} from "@/workloads/jobs/room-retention/job.js";

export type RetentionRunStarter = {
  startRun: RoomRetentionJob["startRun"];
};

const defaultGetJob = (): RetentionRunStarter =>
  getJobHandler<RoomRetentionJob>(JOB_HANDLERS.ROOM_RETENTION);

export type RetentionLogger = {
  info: (message: string) => void;
  error: (data: object, message: string) => void;
};

const defaultGetLogger = (): RetentionLogger =>
  getLogger().child({ module: "retention-runs" }) as unknown as RetentionLogger;

// Starts a room retention run with the configuration in the body. A request
// without `dryRun: false` is a dry run.
export const postRetentionRunController = ({
  getJob = defaultGetJob,
  getLog = defaultGetLogger,
}: {
  getJob?: () => RetentionRunStarter;
  getLog?: () => RetentionLogger;
} = {}) => {
  return async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRetentionRunRequest(req.body);

    if (!parsed.success) {
      res.status(400).json({
        status: "KO",
        message: "Invalid retention configuration",
        errors: parsed.issues,
      });
      return;
    }

    let result: StartRunResult;
    try {
      result = await getJob().startRun(parsed.data);
    } catch (error) {
      getLog().error({ error }, "Error starting a room retention run");
      res
        .status(500)
        .json({ status: "KO", message: "Error starting the retention run" });
      return;
    }

    if ("busy" in result) {
      res.status(409).json({
        status: "KO",
        message: "A retention run is already in progress",
      });
      return;
    }

    getLog().info(
      `Room retention run <${result.runId}> started, dry-run=${parsed.data.dryRun}`,
    );
    res.status(202).json({ status: "OK", runId: result.runId });
  };
};
