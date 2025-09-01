// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";
import { WeaveUser } from "@inditextech/weave-types";
import { ThreadModel } from "./thread.js";

export type CommentStatus = "pending" | "resolved";

export type ThreadAnswerAttributes = {
  answerId: string;
  threadId: string;
  userId: string;
  userMetadata: WeaveUser;
  content: string;
};

export type ThreadAnswerIdentifier = Pick<ThreadAnswerAttributes, "answerId">;

export type ThreadAnswerCreationAttributes = Omit<
  ThreadAnswerAttributes,
  "answerId"
>;

export class ThreadAnswerModel
  extends Model<ThreadAnswerAttributes, ThreadAnswerCreationAttributes>
  implements ThreadAnswerAttributes
{
  declare answerId: string;
  declare threadId: string;
  declare userId: string;
  declare userMetadata: WeaveUser;
  declare content: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineThreadAnswerModel = async (sequelize: Sequelize) => {
  ThreadAnswerModel.init(
    {
      answerId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      threadId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: ThreadModel,
          key: "threadId",
        },
        onDelete: "CASCADE",
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userMetadata: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "weavejs_thread_answer",
      timestamps: true,
      sequelize,
    }
  );

  ThreadAnswerModel.belongsTo(ThreadModel, {
    foreignKey: "threadId",
    as: "thread",
  });
};
