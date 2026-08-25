// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";

// Liveness answers a single question: "is this process alive and able to
// respond?" It must never depend on third-party services (Azure Web PubSub,
// Blob Storage, etc.) — if an external dependency is temporarily unreachable,
// killing and restarting an otherwise-healthy process doesn't help, and can
// even create a startup deadlock (a fresh replica can't become ready without
// external connectivity, external connectivity can require a ready replica).
// External dependency health belongs in readiness/startup at most, and even
// there it should reflect "did setup run", not "is the third party reachable
// right now".
export const getLivenessHealthCheckController =
  () =>
  (req: Request, res: Response): void => {
    res.status(200).json({ status: "OK" });
  };
