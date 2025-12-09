import { PostgresStore } from "@mastra/pg";

console.log("Initializing Mastra database...");
console.log("Using DATABASE_URL:", process.env.DATABASE_URL);

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL,
});

await storage.init();
