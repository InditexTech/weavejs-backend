// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";

export type RoomStatus = "active" | "archived";

export type RoomKind = "showcase" | "standalone" | "templates";

export type RoomAttributes = {
  roomId: string;
  name: string;
  kind: RoomKind;
  status: RoomStatus;
};

export type RoomIdentifier = Pick<RoomAttributes, "roomId">;

export type RoomCreationAttributes = Omit<RoomAttributes, "roomId">;

export class RoomModel
  extends Model<RoomAttributes, RoomCreationAttributes>
  implements RoomAttributes
{
  declare roomId: string;
  declare name: string;
  declare kind: RoomKind;
  declare status: RoomStatus;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineRoomModel = async (sequelize: Sequelize) => {
  RoomModel.init(
    {
      roomId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kind: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "weavejs_room",
      timestamps: true,
      sequelize,
    },
  );
};
