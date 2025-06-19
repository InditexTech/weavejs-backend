// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";

export const postValidateAIPassword = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const password = req.query.password;

    if (password === config.ai.password) {
      res.status(200).json({ status: "OK" });
    } else {
      res.status(401).json({ status: "KO", message: "Not valid" });
    }
  };
};
