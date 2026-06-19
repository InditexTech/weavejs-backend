// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { TemplateExecutionNodes } from "@/templates/types.js";
import { getRoom } from "@/database/controllers/room.js";
import { getPage } from "@/database/controllers/page.js";
import { getTemplate } from "@/database/controllers/template.js";
import { getRoomUser } from "@/database/controllers/room-user.js";
import { addImageTemplateToRoom } from "@/templates/templates.images.js";

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
  templateId: z.string(),
  target: z.object({
    id: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
  }),
  parameters: z.record(z.string(), nodeSchema),
  debug: z.boolean().optional().default(false),
});

export const postAddImageTemplateToRoomController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }

    const params = parsedBody.data;

    const room = await getRoom({ roomId: params.roomId });

    if (!room) {
      res.status(404).json({ status: "KO", message: "Room doesn't exists" });
      return;
    }

    const member = await getRoomUser({
      roomId: params.roomId,
      userId: req.session!.user.id,
    });

    if (!member) {
      res.status(403).json({ status: "KO", message: "You don't have access to this room" });
      return;
    }

    const page = await getPage({
      roomId: params.roomId,
      pageId: params.pageId,
    });

    if (!page) {
      res.status(404).json({ status: "KO", message: "Page doesn't exists" });
      return;
    }

    const template = await getTemplate({
      roomId: params.roomId,
      templateId: params.templateId,
    });

    if (!template) {
      res
        .status(404)
        .json({ status: "KO", message: "Template doesn't exists" });
      return;
    }

    if (template.kind !== "imageTemplate") {
      res.status(400).json({
        status: "KO",
        message: "The provided template kind is not 'imageTemplate'",
      });
      return;
    }

    try {
      await addImageTemplateToRoom({
        page,
        template,
        target: params.target,
        parameters: params.parameters,
        debug: parsedBody.data.debug,
      });

      res.status(200).json({
        message: "Template processed and added to room",
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error processing template:", error.message, error.stack);
      }
      res.status(500).json({
        error: (error as Error).message,
      });
    }
  };
};
