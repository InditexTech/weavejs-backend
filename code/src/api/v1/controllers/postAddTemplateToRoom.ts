// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { getRoom } from "@/database/controllers/room.js";
import { getPage } from "@/database/controllers/page.js";
import { getTemplate } from "@/database/controllers/template.js";
import { getRoomUser } from "@/database/controllers/room-user.js";
import { addTemplateToRoom } from "@/templates/templates.js";

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
});

export const postAddTemplateToRoomController = () => {
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

    if (template.kind !== "template") {
      res.status(400).json({
        status: "KO",
        message: "The provided template kind is not 'template'",
      });
      return;
    }

    try {
      await addTemplateToRoom({
        page,
        template,
        target: params.target,
      });

      res.status(200).json({
        message: "Template added to the room",
      });
    } catch (error) {
      res.status(500).json({
        error: (error as Error).message,
      });
    }
  };
};
