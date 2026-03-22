import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const hasSslRequire = dbUrl.includes("sslmode=require");
console.log(`[DB] Environment: ${process.env.NODE_ENV}, hasSslRequire: ${hasSslRequire}`);

const ssl = (isProduction || hasSslRequire) ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({ 
  connectionString: dbUrl,
  ssl: ssl,
  max: 20, // Max connections for the pooler
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
export const db = drizzle(pool, { schema });
