// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
// import { getWorkloadsInstance } from "../../../workloads/workloads.js";
import { getDatabaseInstance } from "../../../database/database.js";

export const getTasksController = () => {
  const sequelize = getDatabaseInstance();
  // const boss = getWorkloadsInstance();

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const userId = req.query.userId as string | undefined;

    if (!userId || userId === "") {
      res.status(400).json({
        status: "KO",
        message: "Missing required parameters",
      });
      return;
    }

    const userTasks = await sequelize.models.Task.findAll({
      where: {
        roomId,
        userId,
      },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "createdAt", "updatedAt", "jobId"],
    });

    res.status(200).json(userTasks);
  };
};
