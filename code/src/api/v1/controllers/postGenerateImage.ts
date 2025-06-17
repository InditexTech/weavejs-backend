// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import axios from "axios";
import { getServiceConfig } from "../../../config/config.js";

export const postGenerateImageController = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const { model, prompt } = req.body;

    try {
      req.setTimeout(config.llmService.timeoutSecs * 1000);
      const response = await axios.post(
        `${config.llmService.endpoint}/v1/images/generations`,
        {
          model,
          prompt,
        },
        {
          timeout: config.llmService.timeoutSecs * 1000,
          headers: {
            Authorization: `Bearer ${config.llmService.apiKey}`,
          },
        }
      );
      res.status(response.status).json(response.data);
    } catch (ex) {
      res.status(500).json({ error: ex, message: "Error generating image" });
    }
  };
};
