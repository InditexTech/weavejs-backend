// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";
import { RoomModel } from "./room.js";

export type RoomAccessRole = "owner" | "user";

export type RoomAccessAttributes = {
  id: string;
  roomId: string;
  userId: string;
  code: string;
  validUntilUTC: Date;
};

export type RoomAccessIdentifier = Pick<RoomAccessAttributes, "id">;

export type RoomAccessCreationAttributes = Omit<RoomAccessAttributes, "id">;

export class RoomAccessModel
  extends Model<RoomAccessAttributes, RoomAccessCreationAttributes>
  implements RoomAccessAttributes
{
  declare id: string;
  declare roomId: string;
  declare userId: string;
  declare code: string;
  declare validUntilUTC: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineRoomAccessModel = async (sequelize: Sequelize) => {
  RoomAccessModel.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      validUntilUTC: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "weavejs_room_access",
      timestamps: true,
      sequelize,
    },
  );

  RoomModel.hasMany(RoomAccessModel, { foreignKey: "roomId" });
  RoomAccessModel.belongsTo(RoomModel, { foreignKey: "roomId" });
};
