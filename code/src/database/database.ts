// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Sequelize } from "sequelize";
import { getLogger } from "../logger/logger.js";
import { defineTaskModel } from "./models/task.js";
import { defineImageModel } from "./models/image.js";
import { defineVideoModel } from "./models/video.js";
import { getServiceConfig } from "../config/config.js";
import { defineThreadModel } from "./models/thread.js";
import { defineThreadAnswerModel } from "./models/thread-answer.js";
import { getDatabaseCloudCredentialsToken } from "../utils.js";
import { AccessToken } from "@azure/identity";
import { defineConnectionModel } from "./models/connection.js";
import { defineTemplateModel } from "./models/template.js";
import { defineChatModel } from "./models/chat.js";
import { defineChatMessageModel } from "./models/chat-message.js";
import { definePageModel } from "./models/page.js";
import { defineRoomModel } from "./models/room.js";
import { defineRoomUserModel } from "./models/room-user.js";
import { defineRoomAccessModel } from "./models/room-access.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
let activeSequelize: Sequelize | null = null;

// const RENEW_TOKEN_CHECK_INTERVAL = 60 * 1000; // 1 minute
// const RENEW_TOKEN_THRESHOLD = 5 * 60 * 1000; // 5 minutes
// const CLOSE_STANDBY_SEQUELIZE_DELAY = 5 * 60 * 1000; // 5 minutes

export const setupDatabase = async () => {
  logger = getLogger().child({ module: "database" });

  logger.info("Setting up");

  const config = getServiceConfig();

  let currentAccessToken: AccessToken | undefined = undefined;

  async function initSequelize(
    initialize: boolean = true,
  ): Promise<Sequelize | null> {
    if (config.database.kind === "connection_string") {
      logger.info("Initializing database connection (connection string)");
      const {
        database: {
          connection: { connectionString },
        },
      } = config;

      const sequelize = new Sequelize(connectionString, {
        dialect: "postgres",
        pool: {
          max: 3,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        logging: false,
        // logging: console.log,
      });

      try {
        await sequelize.authenticate();
      } catch (error) {
        throw new Error(
          `Unable to connect to the database: ${(error as Error).message}`,
        );
      }

      if (initialize) {
        // Define models
        await defineTaskModel(sequelize);
        await defineImageModel(sequelize);
        await defineVideoModel(sequelize);
        await defineTemplateModel(sequelize);
        await defineThreadModel(sequelize);
        await defineThreadAnswerModel(sequelize);
        await defineChatModel(sequelize);
        await defineChatMessageModel(sequelize);
        await defineRoomModel(sequelize);
        await defineRoomUserModel(sequelize);
        await defineRoomAccessModel(sequelize);
        await definePageModel(sequelize);

        if (process.env.INITIALIZE_DB === "true") {
          sequelize.sync({ force: true });
        }

        logger.info("Module ready");
      } else {
        logger.info("Module re-initialized");
      }

      return sequelize;
    }

    if (config.database.kind === "properties") {
      logger.info("Initializing database connection (properties)");
      const {
        database: {
          connection: { host, port, db, username, password, ssl },
        },
      } = config;

      let finalPassword = password;

      if (config.database.connection.cloudCredentials) {
        currentAccessToken = await getDatabaseCloudCredentialsToken();
        finalPassword = currentAccessToken.token;
      }

      const sequelize = new Sequelize(db, username, finalPassword, {
        host,
        port,
        dialect: "postgres",
        pool: {
          max: 3,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        ...(ssl && {
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: true,
            },
          },
        }),
        logging: false,
        // logging: console.log,
      });

      if (config.database.connection.cloudCredentials) {
        sequelize.addHook("beforeConnect", async (config) => {
          const accessToken = await getDatabaseCloudCredentialsToken();
          config.password = accessToken.token;
        });
      }

      try {
        await sequelize.authenticate();
      } catch (error) {
        throw new Error(
          `Unable to connect to the database: ${(error as Error).message}`,
        );
      }

      if (initialize) {
        // Define models
        await defineConnectionModel(sequelize);
        await defineTaskModel(sequelize);
        await defineImageModel(sequelize);
        await defineVideoModel(sequelize);
        await defineTemplateModel(sequelize);
        await defineThreadModel(sequelize);
        await defineThreadAnswerModel(sequelize);
        await defineChatModel(sequelize);
        await defineChatMessageModel(sequelize);
        await defineRoomModel(sequelize);
        await defineRoomUserModel(sequelize);
        await defineRoomAccessModel(sequelize);
        await definePageModel(sequelize);

        if (process.env.INITIALIZE_DB === "true") {
          sequelize.sync({ force: true });
        }

        logger.info("Module ready");
      } else {
        logger.info("Module re-initialized");
      }

      return sequelize;
    }

    return null;
  }

  activeSequelize = await initSequelize();

  if (!activeSequelize) {
    throw new Error("Database settings not defined on database module");
  }

  return activeSequelize;
};

export const getDatabaseInstance = () => {
  if (!activeSequelize) {
    throw new Error("Database module not initialized");
  }

  return activeSequelize;
};
