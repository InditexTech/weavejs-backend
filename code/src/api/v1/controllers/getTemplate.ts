// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getTemplate } from "../../../database/controllers/template.js";

export const getTemplateController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const templateId = req.params.templateId as string;

    const template = await getTemplate({
      roomId,
      templateId,
    });

    if (!template) {
      res.status(404).json({ message: `Template ${templateId} not found` });
      return;
    }

    res.status(200).json({ template });
  };
};
