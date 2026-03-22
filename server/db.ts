import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const databaseUrl = process.env.POOL_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or POOL_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// In production (DigitalOcean), we often need to allow self-signed certificates for PG connection
// DigitalOcean DBs require SSL and often use self-signed certificates.
const isProduction = process.env.NODE_ENV === "production";
const hasSslRequire = databaseUrl?.includes("sslmode=require");
console.log(`[DB] Environment: ${process.env.NODE_ENV}, hasSslRequire: ${hasSslRequire}`);

const ssl = (isProduction || hasSslRequire) ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: ssl,
  max: 20, // Max connections for the pooler
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
export const db = drizzle(pool, { schema });
