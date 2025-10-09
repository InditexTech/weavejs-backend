// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";
import { TaskModel } from "./task.js";

export type VideoStatus = "pending" | "working" | "completed" | "failed";
export type VideoOperation = "uploaded";

export type VideoAttributes = {
  roomId: string;
  videoId: string;
  status: VideoStatus;
  operation: VideoOperation;
  mimeType: string | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  jobId: string | null;
  removalJobId: string | null;
  removalStatus: VideoStatus | null;
};

export type VideoIdentifier = Pick<VideoAttributes, "roomId" | "videoId">;

export type VideoCreationAttributes = Omit<
  VideoAttributes,
  "roomId" | "videoId"
>;

export class VideoModel
  extends Model<VideoAttributes, VideoCreationAttributes>
  implements VideoAttributes
{
  declare roomId: string;
  declare videoId: string;
  declare operation: VideoOperation;
  declare status: VideoStatus;
  declare mimeType: string;
  declare fileName: string;
  declare width: number;
  declare height: number;
  declare aspectRatio: number;
  declare jobId: string;
  declare removalJobId: string | null;
  declare removalStatus: VideoStatus | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineVideoModel = async (sequelize: Sequelize) => {
  VideoModel.init(
    {
      roomId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      videoId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      operation: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      aspectRatio: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      jobId: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: TaskModel,
          key: "jobId",
        },
      },
      removalJobId: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: TaskModel,
          key: "jobId",
        },
      },
      removalStatus: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "weavejs_video",
      timestamps: true,
      sequelize,
    }
  );

  VideoModel.hasOne(TaskModel);
};
