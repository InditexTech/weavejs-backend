// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { ImagesPersistenceHandler } from "@/images/persistence.js";
import { getServiceConfig } from "@/config/config.js";
import { getImageMetadata } from "@/mcp/tools/get-image-metadata.js";
import { imageReferenceSchema } from "../schemas.js";
import { CallTool, Task } from "@/mastra/types.js";
import { ANALYSIS_MODEL } from "@/mastra/index.js";

export const createReferencesExtractionStep = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roomEditorPlannerAgent: any,
) => {
  return createStep({
    id: "room-edition-references-extraction",
    inputSchema: z.object({
      message: z.string(),
      referenceNodes: z.array(
        z.object({
          nodeId: z.string(),
          nodeType: z.string(),
        }),
      ),
    }),
    outputSchema: z.object({
      message: z.string(),
      result: z.string(),
    }),
    stateSchema: z.object({
      roomId: z.string(),
      pageId: z.string(),
      referenceImages: z.array(imageReferenceSchema),
      referenceNodesInformation: z.array(z.any()),
      imagesInformation: z.array(z.any()),
    }),
    execute: async ({ inputData, mastra, writer, state, setState }) => {
      const { message, referenceNodes } = inputData;
      const { roomId, pageId } = state;
      const { referenceImages } = state;

      const logger = mastra?.getLogger();

      logger?.info(
        `[workflow][room-edition-workflow.metadata-extraction] called`,
        {
          message,
          referenceNodes,
        },
      );

      const referenceNodesInformation: {
        nodeId: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node: any;
      }[] = [];
      const imagesInformation: {
        width: number;
        height: number;
        url: string;
        mimeType?: string;
        name: string;
      }[] = [];

      if (referenceNodes.length > 0) {
        logger?.info(
          `[workflow][room-edition-workflow.metadata-extraction] referenced nodes`,
          {
            referenceNodes,
          },
        );
      }

      if (referenceImages.length > 0) {
        logger?.info(
          `[workflow][room-edition-workflow.metadata-extraction] referenced images`,
          {
            referenceImages,
          },
        );
      }

      const config = getServiceConfig();
      const persistenceHandler = new ImagesPersistenceHandler(config);

      const tasks: Task[] = [
        {
          id: "extract_node_references",
          name: "Extract the node information of the referenced nodes",
          status: "running",
          tools: [],
        },
        {
          id: "extract_image_metadata",
          name: "Extract the metadata of the referenced images",
          status: "idle",
          tools: [],
        },
      ];

      const tasksMessageId = uuidv4();
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-references-extraction",
          title: "Extraction tasks",
          tasks,
          transient: true,
        },
      });

      if (referenceNodes.length > 0) {
        const nodeInformationAgent = await roomEditorPlannerAgent.stream(
          [
            {
              role: "system",
              content: `Obtain the node details of the reference nodes, including its type and properties.
                
              Use tools to find the accurate information if needed, but NEVER infer any information that
              is not provided in the user prompt or on the tools.`,
            },
            {
              role: "user",
              content: `The reference nodes are: ${JSON.stringify(referenceNodes, null, 2)}`,
            },
            {
              role: "user",
              content: `The room to edit is: ${pageId}`,
            },
          ],
          {
            structuredOutput: {
              schema: z.array(
                z
                  .object({
                    roomId: z
                      .string()
                      .describe("The room id where the node is located"),
                    containerId: z
                      .string()
                      .nullable()
                      .describe(
                        "The container id where the node is located, if any",
                      ),
                    nodeId: z.string().describe("The node id"),
                    type: z.string().describe("The node type"),
                    properties: z.any().describe("The node properties"),
                  })
                  .describe(
                    "The full node information obtained for the referenced node",
                  ),
              ),
              model: ANALYSIS_MODEL,
              useAgent: true,
            },
          },
        );

        for await (const chunk of nodeInformationAgent!.fullStream) {
          if (chunk.type === "tool-call") {
            tasks[0].tools.push({
              toolCallId: chunk.payload.toolCallId,
              toolName: chunk.payload.toolName,
              type: chunk.type,
              args: chunk.payload.args,
              status: "input-available",
            });

            await writer?.custom({
              id: tasksMessageId,
              type: "data-workflow-step-event",
              data: {
                workflowId: "room-edition-workflow",
                stepId: "room-edition-references-extraction",
                title: "Extraction tasks",
                tasks,
                transient: true,
              },
            });
          }
          if (chunk.type === "tool-result") {
            const toolCallIndex: number = tasks[0].tools.findIndex(
              (call: CallTool) => call.toolCallId === chunk.payload.toolCallId,
            );

            if (toolCallIndex !== -1) {
              tasks[0].tools[toolCallIndex] = {
                ...tasks[0].tools[toolCallIndex],
                type: chunk.type,
                result: chunk.payload.result,
                status: "output-available",
              };

              await writer?.custom({
                id: tasksMessageId,
                type: "data-workflow-step-event",
                data: {
                  workflowId: "room-edition-workflow",
                  stepId: "room-edition-references-extraction",
                  title: "Extraction tasks",
                  tasks,
                  transient: true,
                },
              });
            }
          }
          writer?.write(chunk);
        }

        const structuredOutput = await nodeInformationAgent!.object;

        logger?.info(
          `[workflow][room-edition-workflow.metadata-extraction] nodes extracted information`,
          {
            referencedNodesInformation: structuredOutput,
          },
        );

        referenceNodesInformation.push(...structuredOutput);
      }

      tasks[0].status = "completed";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-references-extraction",
          title: "Extraction tasks",
          tasks,
          transient: true,
        },
      });

      tasks[1].status = "running";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-references-extraction",
          title: "Extraction tasks",
          tasks: tasks,
          transient: true,
        },
      });

      if (referenceImages.length > 0) {
        for (const image of referenceImages) {
          const imageId = uuidv4();
          const fileName = `${roomId}/${imageId}`;

          logger?.info(
            `[workflow][room-edition-workflow.metadata-extraction] get referenced image metadata`,
            {
              image: {
                index: image.index,
                name: image.name,
                mimeType: image.mimeType,
              },
            },
          );

          tasks[1].tools.push({
            toolCallId: imageId,
            toolName: "get-image-metadata",
            type: "tool-call",
            args: {
              index: image.index,
              name: image.name,
              mimeType: image.mimeType,
            },
            status: "input-available",
          });

          await writer?.custom({
            id: tasksMessageId,
            type: "data-workflow-step-event",
            data: {
              workflowId: "room-edition-workflow",
              stepId: "room-edition-plan",
              title: "Planning tasks",
              tasks,
              transient: true,
            },
          });

          if (!image.url.startsWith("data:")) {
            throw new Error(
              `Expected a data URL for reference image "${image.name}"`,
            );
          }

          const imageInformation = await getImageMetadata(image.url);

          const imageBuffer = dataUrlToUint8Array(image.url);

          await persistenceHandler.persist(
            fileName,
            { size: imageBuffer.length, mimeType: imageInformation.mimeType },
            imageBuffer,
          );

          const persistedImageURL = `${process.env.APP_HOST}/weavebff/api/v1/weavejs/rooms/${roomId}/images/${imageId}`;

          const toolCallIndex: number = tasks[1].tools.findIndex(
            (call: CallTool) => call.toolCallId === imageId,
          );

          if (toolCallIndex !== -1) {
            tasks[0].tools[toolCallIndex] = {
              ...tasks[0].tools[toolCallIndex],
              type: "tool-result",
              result: {
                url: persistedImageURL,
                imageInformation,
              },
              status: "output-available",
            };

            await writer?.custom({
              id: tasksMessageId,
              type: "data-workflow-step-event",
              data: {
                workflowId: "room-edition-workflow",
                stepId: "room-edition-plan",
                title: "Planning tasks",
                tasks,
                transient: true,
              },
            });
          }

          logger?.info(
            `[workflow][room-edition-workflow.metadata-extraction] image metadata extracted`,
            {
              url: persistedImageURL,
              imageInformation,
            },
          );

          imagesInformation.push({
            ...imageInformation,
            url: persistedImageURL,
            name: image.name,
          });
        }
      }

      tasks[1].status = "completed";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-references-extraction",
          title: "Extraction tasks",
          tasks: tasks,
          transient: true,
        },
      });

      setState({
        ...state,
        referenceNodesInformation,
        imagesInformation,
      });

      return {
        message,
        result: `Metadata extraction completed successfully.\n\n- Nodes metadata extracted: **${referenceNodesInformation.length}**\n- Images metadata extracted: **${imagesInformation.length}**`,
      };
    },
  });
};

function dataUrlToUint8Array(dataUrl: string) {
  const base64 = dataUrl.split(",")[1];
  const uint8Array = Uint8Array.from(Buffer.from(base64, "base64"));
  return uint8Array;
}
