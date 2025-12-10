// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { createChatMessage } from "@/database/controllers/chat-message.js";
import {
  getRoomResourceChats,
  getRoomResourcesTotalChats,
  createChat as createChatDb,
  getChat,
  deleteChat as deleteChatDb,
  updateChat,
} from "@/database/controllers/chat.js";

export type ChatStatus = "active" | "deleted";

export type Chat = {
  roomId: string;
  chatId: string;
  resourceId: string;
  status: ChatStatus;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  chatId: string;
  messageId: string;
  role: ChatRole;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  part: any;
};

type ChatData = {
  metadata: Chat;
  messages: ChatMessage[];
};

export async function getChats(
  roomId: string,
  resourceId: string,
  limit = 50,
  offset = 0
): Promise<{ chats: Chat[]; total: number }> {
  try {
    const chats = await getRoomResourceChats(
      { roomId, resourceId, status: "active" },
      { limit, offset }
    );
    const totalChats = await getRoomResourcesTotalChats({
      roomId,
      resourceId,
      status: "active",
    });
    return { chats: chats as unknown as Chat[], total: totalChats };
  } catch (ex) {
    console.error("Error fetching chats.", ex);
    return { chats: [], total: 0 };
  }
}

export async function createChat(
  roomId: string,
  chatId: string,
  resourceId: string,
  data: Partial<Chat>
) {
  try {
    return await createChatDb({
      roomId,
      chatId,
      resourceId,
      status: "active",
      title: data.title ?? "Untitled chat",
    });
  } catch (ex) {
    console.error("Error creating chat.", ex);
    return null;
  }
}

export async function loadChat(
  roomId: string,
  chatId: string,
  resourceId: string
): Promise<ChatData> {
  let chat = null;

  try {
    chat = await getChat({ roomId, chatId, resourceId });

    if (!chat) {
      const newChat = await createChatDb({
        roomId,
        chatId,
        resourceId,
        title: "Untitled chat",
        status: "active",
      });
      chat = newChat;
    }
  } catch (ex) {
    console.error("Error fetching chat / creating new.", ex);
  }

  if (!chat) {
    throw new Error(`Chat with id ${chatId} not found.`);
  }

  return chat as unknown as ChatData;
}

export async function deleteChat(
  roomId: string,
  chatId: string,
  resourceId: string
): Promise<boolean> {
  try {
    await deleteChatDb({ roomId, chatId, resourceId });
    return true;
  } catch (ex) {
    console.error("Error deleting chat.", ex);
    return false;
  }
}

export async function saveChatMessages(
  roomId: string,
  chatId: string,
  resourceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[]
) {
  try {
    const createdMessages = [];
    for (const msg of messages) {
      if (!msg.id || !msg.role || !msg.parts) {
        console.error("Invalid message format", JSON.stringify(msg, null, 2));
        continue;
      }

      const message = await createChatMessage({
        id: uuidv4(),
        chatId,
        messageId: msg.id,
        role: msg.role,
        parts: msg.parts,
      });

      createdMessages.push(message);
    }

    await updateChat({ roomId, chatId, resourceId }, {}, false);
  } catch (ex) {
    console.error("Error saving chat messages.", ex);
    throw ex;
  }
}
