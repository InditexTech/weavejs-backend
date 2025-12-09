// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PostgresStore } from "@mastra/pg";

console.log("Initializing Mastra database...");
console.log("Using DATABASE_URL:", process.env.DATABASE_URL);

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true",
});

await storage.init();
