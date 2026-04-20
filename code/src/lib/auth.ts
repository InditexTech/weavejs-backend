// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getServiceConfig } from "@/config/config.js";
import { getLogger } from "@/logger/logger.js";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

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

export const setupAuth = () => {
  logger = getLogger().child({ module: "auth" });

  logger.info("Setting up");

  const config = getServiceConfig();

  if (config.database.kind === "connection_string") {
    const {
      database: {
        connection: { connectionString },
      },
    } = config;

    auth = betterAuth({
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
      database: new Pool({
        connectionString,
        options: "-c search_path=auth",
      }),
    });
  }

  if (config.database.kind === "properties") {
    const {
      database: {
        connection: { host, port, db, username, password },
      },
    } = config;

    auth = betterAuth({
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
      database: new Pool({
        // connectionString: "postgres://user:password@localhost:5432/database",
        host,
        port,
        user: username,
        password,
        database: db,
        options: "-c search_path=auth",
      }),
    });
  }

  logger.info("Module ready");
};

export const getAuth = (): Awaited<ReturnType<typeof auth.api.getSession>> =>
  auth;
