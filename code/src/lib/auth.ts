// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getServiceConfig } from "@/config/config.js";
import { getLogger } from "@/logger/logger.js";
import { getDatabaseCloudCredentialsToken } from "@/utils.js";
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { getPiiCrypto, isPiiEncryptionEnabled } from "@/lib/pii/index.js";
import {
  AUTH_PII_FIELDS,
  createPiiAdapterWrapper,
} from "@/lib/pii/auth-adapter.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let auth: any = null;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Awaited<ReturnType<typeof auth.api.getSession>>;
    }
  }
}

const createAuthDatabase = (pool: Pool) => {
  const adapterFactory = kyselyAdapter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new Kysely<any>({ dialect: new PostgresDialect({ pool }) }),
    { type: "postgres" },
  );
  const wrap = createPiiAdapterWrapper({
    pii: getPiiCrypto(),
    fields: AUTH_PII_FIELDS,
    encryptWrites: isPiiEncryptionEnabled(),
  });

  return (options: Parameters<typeof adapterFactory>[0]) =>
    wrap(adapterFactory(options));
};

export const setupAuth = async () => {
  logger = getLogger().child({ module: "auth" });

  logger.info("Setting up");

  const config = getServiceConfig();

  const authConfig = {
    appName: "Weave.js Backend",
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [process.env.BETTER_AUTH_URL ?? ""],
    cookies: {
      sessionToken: {
        attributes: {
          sameSite: "lax",
          secure: true,
        },
      },
    },
    advanced: {
      cookiePrefix: process.env.DEPLOY_ENVIRONMENT,
      crossSubDomainCookies: {
        enabled: true,
      },
      ipAddress: {
        disableIpTracking: true,
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: (session: Record<string, unknown>) =>
            Promise.resolve({
              data: { ...session, ipAddress: null, userAgent: null },
            }),
        },
      },
    },
    emailAndPassword: {
      enabled: false,
    },
    onAPIError: {
      errorURL: `${process.env.BETTER_AUTH_URL}/error`,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        redirectURI: `${process.env.BETTER_AUTH_URL}/weavebff/api/auth/callback/github`,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirectURI: `${process.env.BETTER_AUTH_URL}/weavebff/api/auth/callback/google`,
      },
    },
  };

  if (config.database.kind === "connection_string") {
    logger.info("Initializing auth database connection (connection string)");

    const {
      database: {
        connection: { connectionString },
      },
    } = config;

    auth = betterAuth({
      ...authConfig,
      database: createAuthDatabase(
        new Pool({
          connectionString,
          max: 3,
          min: 0,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 30000,
          options: "-c search_path=auth",
          ssl: {
            rejectUnauthorized: true,
          },
        }),
      ),
    });
  }

  if (config.database.kind === "properties") {
    logger.info("Initializing auth database connection (properties)");

    const {
      database: {
        connection: { host, port, db, username, password, ssl },
      },
    } = config;

    auth = betterAuth({
      ...authConfig,
      database: createAuthDatabase(
        new Pool({
          host,
          port,
          user: username,
          password: config.database.connection.cloudCredentials
            ? async () => {
                const accessToken = await getDatabaseCloudCredentialsToken();
                return accessToken.token;
              }
            : password,
          database: db,
          ...(ssl && {
            ssl: {
              rejectUnauthorized: true,
            },
          }),
          max: 3,
          min: 0,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 30000,
          options: "-c search_path=auth",
        }),
      ),
    });
  }

  logger.info("Module ready");
};

export const getAuth = (): Awaited<ReturnType<typeof auth.api.getSession>> =>
  auth;
