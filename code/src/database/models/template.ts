// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";
import { TaskModel } from "./task.js";

export type TemplateStatus = "pending" | "working" | "completed" | "failed";

export type TemplateAttributes = {
  roomId: string;
  templateId: string;
  status: TemplateStatus;
  name: string;
  linkedNodeType: string | null;
  templateImage: string;
  templateData: string;
  jobId: string | null;
  removalJobId: string | null;
  removalStatus: TemplateStatus | null;
};

export type TemplateIdentifier = Pick<
  TemplateAttributes,
  "roomId" | "templateId"
>;

export type TemplateCreationAttributes = Omit<
  TemplateAttributes,
  "roomId" | "templateId"
>;

export class TemplateModel
  extends Model<TemplateAttributes, TemplateCreationAttributes>
  implements TemplateAttributes
{
  declare roomId: string;
  declare templateId: string;
  declare status: TemplateStatus;
  declare name: string;
  declare linkedNodeType: string;
  declare templateImage: string;
  declare templateData: string;
  declare jobId: string;
  declare removalJobId: string | null;
  declare removalStatus: TemplateStatus | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineTemplateModel = async (sequelize: Sequelize) => {
  TemplateModel.init(
    {
      roomId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      templateId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      linkedNodeType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      templateImage: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      templateData: {
        type: DataTypes.JSON,
        allowNull: false,
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
      tableName: "weavejs_template",
      timestamps: true,
      sequelize,
    }
  );

  TemplateModel.hasOne(TaskModel);
};
