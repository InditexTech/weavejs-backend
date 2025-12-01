// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  ChatAttributes,
  ChatIdentifier,
  ChatModel,
  ChatStatus,
} from "../models/chat.js";

export const getRoomResourceChats = async (
  {
    roomId,
    resourceId,
    status = "active",
  }: {
    roomId: string;
    resourceId: string;
    status: ChatStatus;
  },
  {
    limit = 50,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }
): Promise<ChatModel[]> => {
  return ChatModel.findAll({
    where: {
      roomId,
      resourceId,
      status,
    },
    order: [["updatedAt", "DESC"]],
    attributes: [
      "roomId",
      "chatId",
      "resourceId",
      "status",
      "title",
      "createdAt",
      "updatedAt",
    ],
    limit,
    offset,
  });
};

export const getRoomResourcesTotalChats = async ({
  roomId,
  resourceId,
  status = "active",
}: {
  roomId: string;
  resourceId: string;
  status: ChatStatus;
}): Promise<number> => {
  return ChatModel.count({
    where: {
      roomId,
      resourceId,
      status,
    },
  });
};

export const getChat = async ({
  roomId,
  chatId,
  resourceId,
}: ChatIdentifier): Promise<ChatModel | null> => {
  const chat = await ChatModel.findOne({
    where: {
      roomId,
      chatId,
      resourceId,
    },
    attributes: [
      "roomId",
      "chatId",
      "resourceId",
      "status",
      "title",
      "createdAt",
      "updatedAt",
    ],
  });
  return chat;
};

export const createChat = async (
  chatData: ChatAttributes
): Promise<ChatModel> => {
  const newChat = await ChatModel.create(chatData);

  return newChat;
};

export const updateChat = async (
  { chatId, roomId, resourceId }: ChatIdentifier,
  chatData: Partial<ChatAttributes>,
  silent: boolean = false
): Promise<number> => {
  const affected = await ChatModel.update(chatData, {
    where: {
      chatId,
      roomId,
      resourceId,
    },
    silent,
  });

  return affected[0];
};

export const deleteChat = async ({
  chatId,
  roomId,
  resourceId,
}: ChatIdentifier): Promise<number> => {
  const actualChat = await getChat({ chatId, roomId, resourceId });

  if (!actualChat) {
    return 0;
  }

  const affected = await ChatModel.update(
    {
      status: "deleted",
    },
    {
      where: {
        chatId,
        roomId,
        resourceId,
      },
    }
  );

  return affected[0];
};
