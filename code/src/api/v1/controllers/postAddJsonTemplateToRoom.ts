// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { addJsonTemplateToRoomV1 } from "@/templates/templates.alt.js";
import { TemplateExecutionNodes } from "@/templates/types.js";

const imageNodeSchema = z.object({
  nodeId: z.string(),
  kind: z.literal("image"),
  properties: z.object({
    image: z.object({
      source: z.string(),
      width: z.number(),
      height: z.number(),
    }),
    fit: z.enum(["cover", "contain"]),
  }),
});

const textNodeSchema = z.object({
  nodeId: z.string(),
  kind: z.literal("text"),
  properties: z.object({
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    fill: z.string().optional(),
    text: z.string(),
  }),
});

const nodeSchema: z.ZodType<TemplateExecutionNodes> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    textNodeSchema,
    imageNodeSchema,
    z.object({
      nodeId: z.string(),
      kind: z.literal("frame"),
      children: z.array(nodeSchema),
      properties: z.object({
        name: z.string(),
        width: z.number(),
        height: z.number(),
      }),
    }),
  ]),
);

const payloadSchema = z.object({
  roomId: z.string(),
  pageId: z.string(),
  debug: z.boolean().optional().default(false),
  template: z.object({
    id: z.string(),
    target: z.object({
      id: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
    }),
    nodes: z.record(z.string(), nodeSchema),
  }),
});

export const postAddJsonTemplateToRoomController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }

    try {
      const { success, skipped, failure } = await addJsonTemplateToRoomV1({
        roomId: parsedBody.data.roomId,
        pageId: parsedBody.data.pageId,
        template: parsedBody.data.template,
        debug: parsedBody.data.debug,
      });

      res.status(200).json({
        message: "Template processed",
        success,
        skipped,
        failure,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        [
          "RoomNotFound",
          "RoomPageNotFound",
          "PageDocumentNotFound",
          "TemplateNotFound",
        ].includes(error.cause as string)
      ) {
        res.status(404).json({
          cause:
            error instanceof Error && error.cause
              ? (error.cause as string)
              : "Unknown",
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        cause:
          error instanceof Error && error.cause
            ? (error.cause as string)
            : "Unknown",
        error: (error as Error).message,
      });
    }
  };
};
