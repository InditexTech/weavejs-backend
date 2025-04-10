// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";

export const getHealthController = () => (req: Request, res: Response): void => {
  res.status(200).json({ status: "OK" });
};
