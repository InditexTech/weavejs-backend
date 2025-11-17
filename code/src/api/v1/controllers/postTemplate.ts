// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createTemplate } from "../../../database/controllers/template.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";

const payloadSchema = z.object({
  name: z.string().min(1).max(100),
  linkedNodeType: z.enum(["none", "frame"]).optional().default("none"),
  templateImage: z.string().min(1),
  templateData: z.string().min(1),
});

export const postTemplateController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.errors });
      return;
    }

    const template = await createTemplate({
      roomId,
      templateId: uuidv4(),
      status: "completed",
      name: parsedBody.data.name,
      linkedNodeType: parsedBody.data.linkedNodeType,
      templateImage: parsedBody.data.templateImage,
      templateData: parsedBody.data.templateData,
      jobId: null,
      removalJobId: null,
      removalStatus: null,
    });

    console.log("Template", template);

    broadcastToRoom(roomId, {
      jobId: null,
      type: "saveTemplate",
      status: "completed",
    });

    res.status(200).json({ template });
  };
};
