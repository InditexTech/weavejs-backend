// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { addTemplateToRoom } from "@/templates/templates.js";

const payloadSchema = z.object({
  roomId: z.string().optional(),
  roomName: z.string().optional(),
  frameName: z.string(),
  templateInstanceId: z.string(), // to identify the instance where to add the template
  templateId: z.string(),
  imagesIds: z.array(z.string()).min(1),
});

export const postAddTemplateToRoomController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.errors });
      return;
    }

    try {
      await addTemplateToRoom(parsedBody.data);

      res.status(200).json({
        message: "Template added to room successfully",
        data: parsedBody.data,
      });
    } catch (error) {
      res.status(500).json({
        error: (error as Error).message,
      });
    }
  };
};
