// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";

export type ChatStatus = "active" | "deleted";

export type ChatAttributes = {
  roomId: string;
  chatId: string;
  resourceId: string;
  status: ChatStatus;
  title: string;
};

export type ChatIdentifier = Pick<
  ChatAttributes,
  "roomId" | "chatId" | "resourceId"
>;

export type ChatCreationAttributes = Omit<
  ChatAttributes,
  "roomId" | "chatId" | "resourceId"
>;

export class ChatModel
  extends Model<ChatAttributes, ChatCreationAttributes>
  implements ChatAttributes
{
  declare chatId: string;
  declare roomId: string;
  declare resourceId: string;
  declare status: ChatStatus;
  declare title: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineChatModel = async (sequelize: Sequelize) => {
  ChatModel.init(
    {
      chatId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      resourceId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "weavejs_ai_chat",
      timestamps: true,
      sequelize,
    }
  );
};
