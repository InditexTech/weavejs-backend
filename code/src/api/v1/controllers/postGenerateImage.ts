// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import axios from "axios";

export const postGenerateImageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const { model, prompt } = req.body;

    const server =
      "https://iop-litellm-moyaint.apps.devtoolspro2.devtools.paas.azcl.inditex.com";
    const apiKey = "sk-vbFYGSNYMhFHBxH-DBAyvQ";
    const timeoutSecs = 60;

    try {
      req.setTimeout(timeoutSecs * 1000);
      const response = await axios.post(
        `${server}/v1/images/generations`,
        {
          model,
          prompt,
        },
        {
          timeout: timeoutSecs * 1000,
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      res.status(response.status).json(response.data);
    } catch (ex) {
      res.status(500).json({ error: ex, message: "Error generating image" });
    }
  };
};
