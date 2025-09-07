// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";

export type ConnectionStatus = "connect" | "connected";

export type ConnectionAttributes = {
  connectionId: string;
  roomId: string | null;
  status: ConnectionStatus;
};

export type ConnectionIdentifier = Pick<ConnectionAttributes, "connectionId">;

export type ConnectionCreationAttributes = Omit<
  ConnectionAttributes,
  "connectionId"
>;

export class ConnectionModel
  extends Model<ConnectionAttributes, ConnectionCreationAttributes>
  implements ConnectionAttributes
{
  declare roomId: string | null;
  declare connectionId: string;
  declare status: ConnectionStatus;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineConnectionModel = async (sequelize: Sequelize) => {
  ConnectionModel.init(
    {
      connectionId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "weavejs_connection",
      timestamps: true,
      sequelize,
    }
  );
};
