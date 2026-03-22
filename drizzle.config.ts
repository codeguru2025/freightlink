import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || "";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: { rejectUnauthorized: false },
  },
  verbose: true,
  strict: true,
});
