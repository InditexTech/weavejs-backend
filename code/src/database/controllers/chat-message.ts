// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  ChatMessageAttributes,
  ChatMessageModel,
} from "../models/chat-message.js";

export const getChatMessages = async (
  {
    chatId,
  }: {
    chatId: string;
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }
): Promise<ChatMessageModel[]> => {
  return ChatMessageModel.findAll({
    where: {
      chatId,
    },
    order: [["updatedAt", "ASC"]],
    attributes: [
      "chatId",
      "messageId",
      "role",
      "parts",
      "createdAt",
      "updatedAt",
    ],
    limit,
    offset,
  });
};

export const getChatMessagesTotal = async ({
  chatId,
}: {
  chatId: string;
}): Promise<number> => {
  return ChatMessageModel.count({
    where: {
      chatId,
    },
  });
};

export const createChatMessage = async (
  chatMessageData: ChatMessageAttributes
): Promise<ChatMessageModel> => {
  const newChatMessage = await ChatMessageModel.create(chatMessageData);
  return newChatMessage;
};
