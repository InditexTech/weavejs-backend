// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0
import { Request, Response } from "express";
import { RequestContext } from "@mastra/core/request-context";
import { getMastra } from "@/mastra/index.js";
import { toAISdkStream } from "@mastra/ai-sdk";
import {
  createUIMessageStream,
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
} from "ai";
import { WeaveRuntimeContext } from "@/mastra/types.js";
import { saveChatMessages } from "@/mastra/manager/chat.js";

export const postAiChatMessageController = () => {
  return async (req: Request, res: Response) => {
    const roomId = req.params.roomId as string;
    const chatId = req.params.chatId as string;

    const resourceId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (process.env.AI_SERVICES !== "true") {
      res.status(503).json({
        status: "KO",
        message: "AI services are disabled",
      });
      return;
    }

    try {
      if (!resourceId || resourceId === "") {
        res.status(400).json({
          status: "KO",
          message: "Missing required fields",
        });
        return;
      }

      const { messages, pageId, imageOption, referenceNodes } = req.body;

      const referenceImages = [];
      const latestMessage = messages[messages.length - 1];
      let index = 1;
      for (const part of latestMessage.parts) {
        if (part.type === "file") {
          referenceImages.push({
            index: index,
            name: `image ${index}`,
            url: part.url,
            dataBase64: part.url.replace(/^data:image\/\w+;base64,/, ""),
            mimeType: part.mediaType,
          });
          index++;
        }
      }

      const requestContext = new RequestContext<WeaveRuntimeContext>();
      requestContext.set("roomId", roomId);
      requestContext.set("pageId", pageId);
      requestContext.set("threadId", chatId);
      requestContext.set("resourceId", resourceId);
      requestContext.delete("referenceImages");
      requestContext.set("referenceNodes", referenceNodes);
      requestContext.set("referenceImages", referenceImages);
      requestContext.set("imageOption", imageOption);

      const finalMessages = [...messages];

      let isApproval = false;
      let workflowRunId = undefined;
      let workflowName = undefined;
      if (latestMessage?.metadata?.kind === "workflow-step-approval") {
        isApproval = true;
        workflowRunId = latestMessage.metadata.id;
        workflowName = latestMessage.metadata.name;
      }

      const mastra = await getMastra();

      const context = [];

      if (!isApproval) {
        context.push({
          role: "system",
          content: `
              Never ask the user for a Room Id, use the following Room Id: ${pageId}.

              ----

              For image generation or edition, the parameters to use are:

              - Model: ${imageOption.model}
              - Image size: ${imageOption.size}
              - Image samples amount: ${imageOption.samples}
              - Image aspect ratio: ${imageOption.aspectRatio}
            `,
        });
      }

      if (isApproval) {
        context.push({
          role: "system",
          content: `
            The workflow context to resume is:

            - The workflow run id is: ${workflowRunId}.
            - The workflow name is: ${workflowName}
          `,
        });
      }

      const orchestratorAgent = mastra.getAgent("orchestratorAgent");
      const stream = await orchestratorAgent.stream(
        await convertToModelMessages(finalMessages),
        {
          context,
          requestContext,
          memory: {
            thread: `${roomId}-${chatId}`,
            resource: resourceId,
          },
          maxSteps: 1,
        },
      );

      // Transform stream into AI SDK format and create UI messages stream
      const uiMessageStream = createUIMessageStream({
        originalMessages: finalMessages,
        execute: async ({ writer }) => {
          for await (const part of toAISdkStream(stream, {
            from: "agent",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any) {
            writer.write(part);
          }
        },
        onFinish: async ({ messages }) => {
          const usage = await stream.usage?.catch(() => undefined);
          console.log("usage", usage);
          await saveChatMessages(roomId, chatId, resourceId, messages);
        },
      });

      // Create a Response that streams the UI message stream to the client
      pipeUIMessageStreamToResponse({
        response: res,
        stream: uiMessageStream,
      });
    } catch (error) {
      console.error("Error in postAiChatMessageController:", error);
      res.status(500).json({
        status: "KO",
        message: "Internal server error",
      });
    }
  };
};
