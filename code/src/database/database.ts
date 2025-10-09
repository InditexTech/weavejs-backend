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

let logger = null as unknown as ReturnType<typeof getLogger>;
let activeSequelize: Sequelize | null = null;
let standbySequelize: Sequelize | null = null;

const RENEW_TOKEN_CHECK_INTERVAL = 60 * 1000; // 1 minute
const RENEW_TOKEN_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const CLOSE_STANDBY_SEQUELIZE_DELAY = 5 * 60 * 1000; // 5 minutes

export const setupDatabase = async () => {
  logger = getLogger().child({ module: "database" });

  logger.info("Setting up");

  const config = getServiceConfig();

  let currentAccessToken: AccessToken | undefined = undefined;

  async function initSequelize(
    initialize: boolean = true
  ): Promise<Sequelize | null> {
    if (config.database.kind === "connection_string") {
      const {
        database: {
          connection: { connectionString },
        },
      } = config;

      const sequelize = new Sequelize(connectionString, {
        dialect: "postgres",
        logging: false,
        // logging: (msg: string) => logger.debug(msg),
      });

      try {
        await sequelize.authenticate();
      } catch (error) {
        throw new Error(
          `Unable to connect to the database: ${(error as Error).message}`
        );
      }

      if (initialize) {
        // Define models
        await defineTaskModel(sequelize);
        await defineImageModel(sequelize);
        await defineVideoModel(sequelize);
        await defineThreadModel(sequelize);
        await defineThreadAnswerModel(sequelize);

        logger.info(`Forcing sync: ${config.database.forceSync === true}`);

        await sequelize.sync({ force: config.database.forceSync });

        logger.info("Module ready");
      } else {
        logger.info("Module re-initialized");
      }

      return sequelize;
    }

    if (config.database.kind === "properties") {
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

      try {
        await sequelize.authenticate();
      } catch (error) {
        throw new Error(
          `Unable to connect to the database: ${(error as Error).message}`
        );
      }

      if (initialize) {
        // Define models
        await defineConnectionModel(sequelize);
        await defineTaskModel(sequelize);
        await defineImageModel(sequelize);
        await defineVideoModel(sequelize);
        await defineThreadModel(sequelize);
        await defineThreadAnswerModel(sequelize);

        logger.info(`Forcing sync: ${config.database.forceSync === true}`);

        await sequelize.sync({ force: config.database.forceSync });

        logger.info("Module ready");
      } else {
        logger.info("Module re-initialized");
      }

      return sequelize;
    }

    return null;
  }

  function tokenRenewalInterval() {
    setInterval(async () => {
      if (!activeSequelize) {
        logger.info("Not active...");
        return;
      }

      if (
        currentAccessToken?.expiresOnTimestamp &&
        Date.now() >
          currentAccessToken.expiresOnTimestamp - RENEW_TOKEN_THRESHOLD
      ) {
        logger.info("Renewing access token");

        standbySequelize = await initSequelize(false);

        if (!standbySequelize) {
          throw new Error("Database settings not defined on database module");
        }

        const old = activeSequelize;
        activeSequelize = standbySequelize;
        standbySequelize = null;

        setTimeout(() => {
          old.close().catch(console.error);
        }, CLOSE_STANDBY_SEQUELIZE_DELAY);
      }
    }, RENEW_TOKEN_CHECK_INTERVAL);

    logger.info("Token renewal interval started");
  }

  activeSequelize = await initSequelize();

  if (!activeSequelize) {
    throw new Error("Database settings not defined on database module");
  }

  tokenRenewalInterval();

  return activeSequelize;
};

export const getDatabaseInstance = () => {
  if (!activeSequelize && !standbySequelize) {
    throw new Error("Database module not initialized");
  }

  return standbySequelize ?? activeSequelize;
};
