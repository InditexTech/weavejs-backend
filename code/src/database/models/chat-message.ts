// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize, Model, DataTypes } from "sequelize";
import { ChatModel } from "./chat.js";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageAttributes = {
  id: string;
  chatId: string;
  messageId: string;
  role: ChatRole;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any;
};

export type ChatMessageIdentifier = Pick<ChatMessageAttributes, "id">;

export type ChatMessageCreationAttributes = Omit<ChatMessageAttributes, "id">;

export class ChatMessageModel
  extends Model<ChatMessageAttributes, ChatMessageCreationAttributes>
  implements ChatMessageAttributes
{
  declare id: string;
  declare chatId: string;
  declare messageId: string;
  declare role: ChatRole;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare parts: any;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineChatMessageModel = async (sequelize: Sequelize) => {
  ChatMessageModel.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      chatId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      messageId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      parts: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: "weavejs_ai_chat_message",
      timestamps: true,
      sequelize,
    }
  );

  ChatMessageModel.belongsTo(ChatModel, {
    foreignKey: "chatId",
    as: "ai_chat",
  });
};
