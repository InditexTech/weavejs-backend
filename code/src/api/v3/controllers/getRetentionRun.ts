// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";
import { getLogger } from "@/logger/logger.js";
import { getJobHandler } from "@/workloads/workloads.js";
import { JOB_HANDLERS } from "@/workloads/constants.js";
import type { RoomRetentionJob } from "@/workloads/jobs/room-retention/job.js";

export type RetentionRunReader = {
  getRun: RoomRetentionJob["getRun"];
};

const defaultGetJob = (): RetentionRunReader =>
  getJobHandler<RoomRetentionJob>(JOB_HANDLERS.ROOM_RETENTION);

// Run identifiers are pg-boss job ids, which are UUIDs.
const RUN_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RetentionLogger = {
  error: (data: object, message: string) => void;
};

const defaultGetLogger = (): RetentionLogger =>
  getLogger().child({ module: "retention-runs" }) as unknown as RetentionLogger;

export const getRetentionRunController = ({
  getJob = defaultGetJob,
  getLog = defaultGetLogger,
}: {
  getJob?: () => RetentionRunReader;
  getLog?: () => RetentionLogger;
} = {}) => {
  return async (req: Request, res: Response): Promise<void> => {
    const runId = req.params.runId as string;

    if (!RUN_ID.test(runId)) {
      res.status(404).json({ status: "KO", message: "Run not found" });
      return;
    }

    try {
      const run = await getJob().getRun(runId);

      if (!run) {
        res.status(404).json({ status: "KO", message: "Run not found" });
        return;
      }

      res.status(200).json({ status: "OK", run });
    } catch (error) {
      getLog().error({ error }, "Error reading a room retention run");
      res
        .status(500)
        .json({ status: "KO", message: "Error reading the retention run" });
    }
  };
};
