// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize } from "sequelize";
import { getLogger } from "../logger/logger.js";
import { defineTaskModel } from "./models/task.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
let sequelize: Sequelize | null = null;

export const setupDatabase = async () => {
  logger = getLogger().child({ module: "database" });

  logger.info("Setting up database module");

  sequelize = new Sequelize(process.env.DATABASE_URL as string, {
    dialect: "postgres",
    logging: (msg) => logger.debug(msg),
  });

  try {
    await sequelize.authenticate();
  } catch (error) {
    throw new Error(
      `Unable to connect to the database: ${(error as Error).message}`
    );
  }

  // Define models
  await defineTaskModel(sequelize);

  logger.info("Database module ready");

  return sequelize;
};

export const getDatabaseInstance = () => {
  if (!sequelize) {
    throw new Error("Database module not initialized");
  }

  return sequelize;
};
