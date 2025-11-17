// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import pgBoss from "pg-boss";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  DeleteTemplateJobComplete,
  DeleteTemplateJobData,
  DeleteTemplateJobFailed,
  DeleteTemplateJobNew,
  DeleteTemplateJobWorkData,
} from "./types.js";
import { JOB_DELETE_TEMPLATE_QUEUE_NAME } from "./constants.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import {
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from "../../../database/controllers/template.js";

export class DeleteTemplateJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;

  static async create(
    tasksManagerInstance: pgBoss
  ): Promise<DeleteTemplateJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_DELETE_TEMPLATE_QUEUE_NAME);

    return new DeleteTemplateJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_DELETE_TEMPLATE_QUEUE_NAME, {
      name: JOB_DELETE_TEMPLATE_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "delete-template-job" });

    this.boss = tasksManagerInstance;

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<DeleteTemplateJobWorkData>(
      JOB_DELETE_TEMPLATE_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const {
          clientId,
          roomId,
          userId,
          payload: { templateId },
        } = data;

        await this.DeleteTemplateJob({
          jobId: id,
          clientId,
          userId,
          roomId,
          payload: {
            templateId,
          },
        });
      }
    );
  }

  private async DeleteTemplateJob({
    jobId,
    userId,
    clientId,
    roomId,
    payload: { templateId },
  }: DeleteTemplateJobWorkData) {
    this.logger.info(`Received delete template job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      userId,
      roomId,
      payload: {
        templateId,
      },
    });

    this.logger.info(`Delete template: ${templateId}, of room: ${roomId}`);
    const templateObj = await getTemplate({
      roomId,
      templateId,
    });

    if (!templateObj) {
      await this.boss.fail(JOB_DELETE_TEMPLATE_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Template not found",
      });

      await this.onFailed({
        jobId,
        userId,
        clientId,
        roomId,
        payload: {
          templateId,
        },
        error: "Template not found",
      });

      return;
    }

    await deleteTemplate({
      roomId,
      templateId,
    });

    await this.boss.complete(JOB_DELETE_TEMPLATE_QUEUE_NAME, jobId, {
      status: "OK",
      clientId,
    });

    await this.onComplete({
      jobId,
      clientId,
      userId,
      roomId,
      payload: {
        templateId,
      },
    });
  }

  async startDeleteTemplateJob(
    clientId: string,
    roomId: string,
    userId: string,
    templateId: string
  ): Promise<string> {
    const jobData: DeleteTemplateJobData = {
      clientId,
      userId,
      roomId,
      payload: {
        templateId,
      },
    };

    const jobId = await this.boss.sendAfter(
      JOB_DELETE_TEMPLATE_QUEUE_NAME,
      jobData,
      {},
      1
    );

    if (!jobId) {
      throw new Error("Error creating delete template job");
    }

    await this.onNew({
      jobId,
      userId,
      clientId,
      roomId,
      payload: {
        templateId,
      },
    });

    return jobId;
  }

  private async onNew(data: DeleteTemplateJobNew) {
    const {
      jobId,
      clientId,
      userId,
      roomId,
      payload: { templateId },
    } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "deleteTemplate",
      status: "created",
      opened: false,
      metadata: {
        templateId,
      },
    });

    await updateTemplate(
      {
        roomId,
        templateId,
      },
      {
        removalJobId: jobId,
        removalStatus: "pending",
      }
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "deleteTemplate",
      status: "created",
    });

    this.logger.info(
      `Delete template / created new job / ${jobId} / ${clientId}`
    );
  }

  private async onProcessing(data: DeleteTemplateJobWorkData) {
    const {
      jobId,
      roomId,
      userId,
      clientId,
      payload: { templateId },
    } = data;

    await updateTemplate(
      {
        roomId,
        templateId,
      },
      {
        removalStatus: "working",
      }
    );

    await updateTask(
      {
        jobId,
      },
      {
        roomId,
        userId,
        status: "active",
      }
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "deleteTemplate",
      status: "active",
    });

    this.logger.info(
      `Delete template / job stated active / ${jobId} / ${clientId}`
    );
  }

  private async onComplete(data: DeleteTemplateJobComplete) {
    const {
      jobId,
      roomId,
      clientId,
      payload: { templateId },
    } = data;

    await updateTask(
      {
        jobId,
      },
      {
        status: "completed",
      }
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "deleteTemplate",
      status: "completed",
    });

    this.logger.info(
      `Delete template / job completed / ${jobId} / ${clientId} / ${templateId})`
    );
  }

  private async onFailed(data: DeleteTemplateJobFailed) {
    const {
      jobId,
      clientId,
      roomId,
      error,
      payload: { templateId },
    } = data;

    await updateTemplate(
      {
        roomId,
        templateId,
      },
      {
        removalStatus: "failed",
      }
    );

    await updateTask(
      {
        jobId,
      },
      {
        status: "failed",
      }
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "deleteTemplate",
      status: "failed",
    });

    this.logger.error(
      `Delete template / job failed: / ${jobId} / ${clientId} / ${error}`
    );
  }
}
