// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";
import { RoomModel } from "./room.js";

export type PageStatus = "active" | "archived";

export type PageAttributes = {
  roomId: string;
  pageId: string;
  name: string;
  status: PageStatus;
  position?: number;
};

export type PageIdentifier = Pick<PageAttributes, "roomId" | "pageId">;

export type PageCreationAttributes = Omit<PageIdentifier, "roomId" | "pageId">;

export class PageModel
  extends Model<PageAttributes, PageCreationAttributes>
  implements PageAttributes
{
  declare roomId: string;
  declare pageId: string;
  declare name: string;
  declare status: PageStatus;
  declare position?: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const definePageModel = async (sequelize: Sequelize) => {
  PageModel.init(
    {
      roomId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      pageId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      position: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
    },
    {
      tableName: "weavejs_page",
      timestamps: true,
      sequelize,
    },
  );

  RoomModel.hasMany(PageModel, { foreignKey: "roomId" });
  PageModel.belongsTo(RoomModel, { foreignKey: "roomId" });
};
