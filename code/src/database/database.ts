// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize } from "sequelize";
import { getLogger } from "../logger/logger.js";
import { defineTaskModel } from "./models/task.js";
import { defineImageModel } from "./models/image.js";
import { getServiceConfig } from "../config/config.js";
import { defineThreadModel } from "./models/thread.js";
import { defineThreadAnswerModel } from "./models/thread-answer.js";
import { getDatabaseCloudCredentialsToken } from "../utils.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
let sequelize: Sequelize | null = null;

export const setupDatabase = async () => {
  logger = getLogger().child({ module: "database" });

  logger.info("Setting up database module");

  const config = getServiceConfig();

  if (config.database.kind === "connection_string") {
    const {
      database: {
        connection: { connectionString },
      },
    } = config;

    sequelize = new Sequelize(connectionString, {
      dialect: "postgres",
      logging: false,
      // logging: (msg: string) => logger.debug(msg),
    });
  }

  if (config.database.kind === "properties") {
    const {
      database: {
        connection: { host, port, db, username, password, ssl },
      },
    } = config;

    let finalPassword = password;

    if (config.database.connection.cloudCredentials) {
      finalPassword = await getDatabaseCloudCredentialsToken();
    }

    sequelize = new Sequelize(db, username, finalPassword, {
      host,
      port,
      dialect: "postgres",
      ...(ssl && {
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: true,
          },
        },
      }),
      logging: false,
      // logging: (msg: string) => logger.debug(msg),
    });
  }

  if (!sequelize) {
    throw new Error("Database settings not defined on database module");
  }

  try {
    await sequelize.authenticate();
  } catch (error) {
    throw new Error(
      `Unable to connect to the database: ${(error as Error).message}`
    );
  }

  // Define models
  await defineTaskModel(sequelize);
  await defineImageModel(sequelize);
  await defineThreadModel(sequelize);
  await defineThreadAnswerModel(sequelize);

  logger.info(`Database forcing sync: ${config.database.forceSync === true}`);

  await sequelize.sync({ force: config.database.forceSync });

  logger.info("Database module ready");

  return sequelize;
};

export const getDatabaseInstance = () => {
  if (!sequelize) {
    throw new Error("Database module not initialized");
  }

  return sequelize;
};
