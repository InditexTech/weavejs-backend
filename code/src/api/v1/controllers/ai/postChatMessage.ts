// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0
import { Request, Response } from "express";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { ImageGeneratorRuntimeContext } from "@/mastra/agents/image-generator-editor-agent.js";
import { getMastra } from "@/mastra/index.js";
import { toAISdkFormat } from "@mastra/ai-sdk";
import {
  createUIMessageStream,
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
} from "ai";
import { saveChatMessages } from "@/mastra/manager/chat.js";

export const postAiChatMessageController = () => {
  return async (req: Request, res: Response) => {
    const roomId = req.params.roomId as string;
    const chatId = req.params.chatId as string;

    const resourceId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (!resourceId || resourceId === "") {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const { messages, imageOption } = req.body;

    const referenceImages = [];
    const latestMessage = messages[messages.length - 1];
    let index = 1;
    for (const part of latestMessage.parts) {
      if (part.type === "file") {
        referenceImages.push({
          index: index,
          name: `image ${index}`,
          dataBase64: part.url.replace(/^data:image\/\w+;base64,/, ""),
          mimeType: part.mediaType,
        });
        index++;
      }
    }

    const runtimeContext = new RuntimeContext<ImageGeneratorRuntimeContext>();
    runtimeContext.set("roomId", roomId);
    runtimeContext.set("threadId", chatId);
    runtimeContext.set("resourceId", resourceId);
    runtimeContext.delete("referenceImages");
    runtimeContext.set("referenceImages", referenceImages);
    runtimeContext.set("imageOption", imageOption);

    const mastra = await getMastra();

    const imageGenerationEditorAgent = mastra.getAgent(
      "imageGeneratorEditorAgent"
    );
    const stream = await imageGenerationEditorAgent.stream(
      convertToModelMessages(messages),
      {
        context: [
          {
            role: "system",
            content: `
            You're using the model ${imageOption.model}, and the generation parameters to use are:
            
            - Size: ${imageOption.size}
            - Samples: ${imageOption.samples}
            - Aspect Ratio: ${imageOption.aspectRatio}
          `,
          },
        ],
        runtimeContext,
        memory: {
          thread: `${roomId}-${chatId}`,
          resource: resourceId,
        },
        maxSteps: 5,
      }
    );

    const userMessage = messages[messages.length - 1];
    const removedImagesParts = [
      {
        ...userMessage,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parts: userMessage.parts.filter((part: any) => part.type !== "file"),
      },
    ];

    // Transform stream into AI SDK format and create UI messages stream
    const uiMessageStream = createUIMessageStream({
      originalMessages: removedImagesParts,
      execute: async ({ writer }) => {
        for await (const part of toAISdkFormat(stream, {
          from: "agent",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any) {
          writer.write(part);
        }
      },
      onFinish: ({ messages }) => {
        saveChatMessages(roomId, chatId, resourceId, messages);
      },
    });

    // Create a Response that streams the UI message stream to the client
    pipeUIMessageStreamToResponse({
      response: res,
      stream: uiMessageStream,
    });
  };
};
