// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";
import { TaskModel } from "./task.js";

export type ImageStatus = "pending" | "working" | "completed" | "failed";
export type ImageOperation =
  | "uploaded"
  | "background-removal"
  | "image-generation"
  | "image-edition";

export type ImageAttributes = {
  roomId: string;
  imageId: string;
  status: ImageStatus;
  operation: ImageOperation;
  mimeType: string | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  jobId: string | null;
  removalJobId: string | null;
  removalStatus: ImageStatus | null;
};

export type ImageIdentifier = Pick<ImageAttributes, "roomId" | "imageId">;

export type ImageCreationAttributes = Omit<
  ImageAttributes,
  "roomId" | "imageId"
>;

export class ImageModel
  extends Model<ImageAttributes, ImageCreationAttributes>
  implements ImageAttributes
{
  declare roomId: string;
  declare imageId: string;
  declare operation: ImageOperation;
  declare status: ImageStatus;
  declare mimeType: string;
  declare fileName: string;
  declare width: number;
  declare height: number;
  declare aspectRatio: number;
  declare jobId: string;
  declare removalJobId: string | null;
  declare removalStatus: ImageStatus | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineImageModel = async (sequelize: Sequelize) => {
  ImageModel.init(
    {
      roomId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      imageId: {
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
      tableName: "weavejs_image",
      timestamps: true,
      sequelize,
    }
  );

  ImageModel.hasOne(TaskModel);
};
