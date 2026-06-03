// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PostgresStore } from "@mastra/pg";

const storage = new PostgresStore({
  id: "main-postgres-store",
  host: process.env.AZURE_DATABASE_HOST ?? "",
  port: process.env.AZURE_DATABASE_PORT
    ? Number.parseInt(process.env.AZURE_DATABASE_PORT, 10)
    : 5432,
  database: process.env.AZURE_DATABASE_NAME ?? "",
  user: process.env.AZURE_DATABASE_USERNAME ?? "",
  password: process.env.AZURE_DATABASE_PASSWORD ?? "",
  ssl: process.env.AZURE_DATABASE_SSL === "true",
});

await storage.init();
