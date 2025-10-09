// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import pgBoss from "pg-boss";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  deleteVideo,
  getVideo,
  updateVideo,
} from "../../../database/controllers/video.js";
import {
  DeleteVideoJobComplete,
  DeleteVideoJobData,
  DeleteVideoJobFailed,
  DeleteVideoJobNew,
  DeleteVideoJobWorkData,
} from "./types.js";
import { JOB_DELETE_VIDEO_QUEUE_NAME } from "./constants.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { VideosPersistenceHandler } from "../../../videos/persistence.js";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

export class DeleteVideoJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
  private persistenceHandler: VideosPersistenceHandler;
  private imagesPersistenceHandler: ImagesPersistenceHandler;

  static async create(tasksManagerInstance: pgBoss): Promise<DeleteVideoJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_DELETE_VIDEO_QUEUE_NAME);

    return new DeleteVideoJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_DELETE_VIDEO_QUEUE_NAME, {
      name: JOB_DELETE_VIDEO_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "delete-video-job" });

    this.boss = tasksManagerInstance;

    this.persistenceHandler = new VideosPersistenceHandler();

    this.imagesPersistenceHandler = new ImagesPersistenceHandler();

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<DeleteVideoJobWorkData>(
      JOB_DELETE_VIDEO_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const {
          clientId,
          roomId,
          userId,
          payload: { videoId },
        } = data;

        await this.DeleteVideoJob({
          jobId: id,
          clientId,
          userId,
          roomId,
          payload: {
            videoId,
          },
        });
      }
    );
  }

  private async DeleteVideoJob({
    jobId,
    userId,
    clientId,
    roomId,
    payload: { videoId },
  }: DeleteVideoJobWorkData) {
    this.logger.info(`Received delete video job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      userId,
      roomId,
      payload: {
        videoId,
      },
    });

    this.logger.info(`Delete video: ${videoId}, of room: ${roomId}`);

    const videoObj = await getVideo({
      roomId,
      videoId,
    });

    if (!videoObj) {
      await this.boss.fail(JOB_DELETE_VIDEO_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Video not found",
      });

      await this.onFailed({
        jobId,
        userId,
        clientId,
        roomId,
        payload: {
          videoId,
        },
        error: "Video not found",
      });

      return;
    }

    await deleteVideo({
      roomId,
      videoId,
    });

    try {
      const fileName = `${roomId}/${videoId}`;
      await this.persistenceHandler.delete(fileName);
    } catch (ex) {
      this.logger.error((ex as Error).message);
    }

    try {
      const fileName = `${roomId}/${videoId}-placeholder`;
      await this.imagesPersistenceHandler.delete(fileName);
    } catch (ex) {
      this.logger.error((ex as Error).message);
    }

    await this.boss.complete(JOB_DELETE_VIDEO_QUEUE_NAME, jobId, {
      status: "OK",
      clientId,
    });

    await this.onComplete({
      jobId,
      clientId,
      userId,
      roomId,
      payload: {
        videoId,
      },
    });
  }

  async startDeleteVideoJob(
    clientId: string,
    roomId: string,
    userId: string,
    videoId: string
  ): Promise<string> {
    const jobData: DeleteVideoJobData = {
      clientId,
      userId,
      roomId,
      payload: {
        videoId,
      },
    };

    const jobId = await this.boss.sendAfter(
      JOB_DELETE_VIDEO_QUEUE_NAME,
      jobData,
      {},
      1
    );

    if (!jobId) {
      throw new Error("Error creating delete image job");
    }

    await this.onNew({
      jobId,
      userId,
      clientId,
      roomId,
      payload: {
        videoId,
      },
    });

    return jobId;
  }

  private async onNew(data: DeleteVideoJobNew) {
    const {
      jobId,
      clientId,
      userId,
      roomId,
      payload: { videoId },
    } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "deleteVideo",
      status: "created",
      opened: false,
      metadata: {
        videoId,
      },
    });

    await updateVideo(
      {
        roomId,
        videoId,
      },
      {
        removalJobId: jobId,
        removalStatus: "pending",
      }
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "deleteVideo",
      status: "created",
    });

    this.logger.info(`Delete video / created new job / ${jobId} / ${clientId}`);
  }

  private async onProcessing(data: DeleteVideoJobWorkData) {
    const {
      jobId,
      roomId,
      userId,
      clientId,
      payload: { videoId },
    } = data;

    await updateVideo(
      {
        roomId,
        videoId,
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
      type: "deleteVideo",
      status: "active",
    });

    this.logger.info(
      `Delete video / job stated active / ${jobId} / ${clientId}`
    );
  }

  private async onComplete(data: DeleteVideoJobComplete) {
    const {
      jobId,
      roomId,
      clientId,
      payload: { videoId },
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
      type: "deleteVideo",
      status: "completed",
    });

    this.logger.info(
      `Delete video / job completed / ${jobId} / ${clientId} / ${videoId})`
    );
  }

  private async onFailed(data: DeleteVideoJobFailed) {
    const {
      jobId,
      clientId,
      roomId,
      error,
      payload: { videoId },
    } = data;

    await updateVideo(
      {
        roomId,
        videoId,
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
      type: "deleteVideo",
      status: "failed",
    });

    this.logger.error(
      `Delete video / job failed: / ${jobId} / ${clientId} / ${error}`
    );
  }
}
