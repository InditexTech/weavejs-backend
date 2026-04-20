// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";
import { RoomModel } from "./room.js";

export type RoomUserRole = "owner" | "user";

export type RoomUserAttributes = {
  roomId: string;
  userId: string;
  role: RoomUserRole;
};

export type RoomUserIdentifier = Pick<RoomUserAttributes, "roomId" | "userId">;

export type RoomUserCreationAttributes = Omit<
  RoomUserAttributes,
  "roomId" | "userId"
>;

export class RoomUserModel
  extends Model<RoomUserAttributes, RoomUserCreationAttributes>
  implements RoomUserAttributes
{
  declare roomId: string;
  declare userId: string;
  declare role: RoomUserRole;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineRoomUserModel = async (sequelize: Sequelize) => {
  RoomUserModel.init(
    {
      roomId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "weavejs_room_user",
      timestamps: true,
      sequelize,
    },
  );

  RoomModel.hasMany(RoomUserModel, { foreignKey: "roomId" });
  RoomUserModel.belongsTo(RoomModel, { foreignKey: "roomId" });
};
