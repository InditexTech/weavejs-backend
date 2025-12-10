// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PostgresStore } from "@mastra/pg";

console.log("Initializing Mastra database...");
console.log("Using AZURE_DATABASE_HOST:", process.env.AZURE_DATABASE_HOST);

const storage = new PostgresStore({
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
